import { ref, computed } from 'vue'

function normalizeText(text) {
  return (text || '')
    .replace(/\s+/g, '')
    .replace(/["'`“”‘’]/g, '')
    .trim()
}

function resolveIssueHeading(chunk, issue) {
  if (!chunk.sections?.length) return chunk.headingHierarchy
  if (chunk.sections.length === 1) return chunk.sections[0].headingHierarchy
  if (!issue?.original) return chunk.headingHierarchy

  const original = issue.original.trim()
  const normalizedOriginal = normalizeText(original)

  // 先尝试原文精确包含
  let matched = chunk.sections.find(s => s.textContent.includes(original))
  if (matched) return matched.headingHierarchy

  // 再尝试归一化后的包含，容忍空白和引号差异
  matched = chunk.sections.find(s => normalizeText(s.textContent).includes(normalizedOriginal))
  if (matched) return matched.headingHierarchy

  return chunk.headingHierarchy
}

export function useProofreading() {
  const results = ref([])
  const chunkStatuses = ref([]) // 'pending' | 'processing' | 'completed' | 'error'
  const isProcessing = ref(false)
  const currentChunkIndex = ref(-1)
  let cancelled = false

  const progress = computed(() => {
    const total = chunkStatuses.value.length
    if (total === 0) return 0
    const completed = chunkStatuses.value.filter(s => s === 'completed' || s === 'error').length
    return Math.round((completed / total) * 100)
  })

  const completedCount = computed(() =>
    chunkStatuses.value.filter(s => s === 'completed').length
  )

  const errorCount = computed(() =>
    chunkStatuses.value.filter(s => s === 'error').length
  )

  const summary = computed(() => {
    const all = results.value
    return {
      total: all.length,
      errors: all.filter(r => r.severity === 'error').length,
      warnings: all.filter(r => r.severity === 'warning').length,
      infos: all.filter(r => r.severity === 'info').length,
    }
  })

  function syncCurrentChunkIndex() {
    currentChunkIndex.value = chunkStatuses.value.findIndex(s => s === 'processing')
  }

  async function processChunkWithRetry(chunk, chunkIndex, checkChunkFn, maxRetries) {
    let retries = 0

    while (retries <= maxRetries) {
      if (cancelled) throw new Error('cancelled')

      try {
        const issues = await checkChunkFn(chunk)
        const enriched = issues.map(issue => ({
          ...issue,
          sectionNames: chunk.sectionNames,
          headingHierarchy: resolveIssueHeading(chunk, issue),
          chunkIndex,
        }))
        return enriched
      } catch (e) {
        retries++
        if (retries > maxRetries) {
          throw e
        }

        // 限流或服务端错误时适当延长退避，降低并发冲突概率
        const errorText = String(e?.message || e || '')
        const isRateLimit = /429|RESOURCE_EXHAUSTED|rate limit|quota/i.test(errorText)
        const baseDelay = isRateLimit ? 3000 : 1200
        await new Promise(r => setTimeout(r, baseDelay * retries))
      }
    }

    return []
  }

  async function startProofreading(chunks, checkChunkFn, options = {}) {
    const concurrency = Math.max(1, Math.min(options.concurrency || 3, chunks.length || 1))
    const maxRetries = Number.isInteger(options.maxRetries) && options.maxRetries >= 0
      ? options.maxRetries
      : 2

    cancelled = false
    isProcessing.value = true
    results.value = []
    chunkStatuses.value = chunks.map(() => 'pending')
    currentChunkIndex.value = -1

    let nextChunkIndex = 0

    const worker = async () => {
      while (!cancelled) {
        const i = nextChunkIndex
        nextChunkIndex += 1

        if (i >= chunks.length) break

        chunkStatuses.value[i] = 'processing'
        syncCurrentChunkIndex()

        try {
          const enriched = await processChunkWithRetry(chunks[i], i, checkChunkFn, maxRetries)
          results.value = [...results.value, ...enriched]
          chunkStatuses.value[i] = 'completed'
        } catch (e) {
          if (!cancelled) {
            console.error(`Chunk ${i} failed after ${maxRetries} retries:`, e)
            chunkStatuses.value[i] = 'error'
          } else if (chunkStatuses.value[i] === 'processing') {
            chunkStatuses.value[i] = 'pending'
          }
        }

        syncCurrentChunkIndex()
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    if (cancelled) {
      chunkStatuses.value = chunkStatuses.value.map(status =>
        status === 'processing' ? 'pending' : status
      )
    }

    isProcessing.value = false
    currentChunkIndex.value = -1
  }

  function cancelProofreading() {
    cancelled = true
  }

  return {
    results,
    chunkStatuses,
    isProcessing,
    currentChunkIndex,
    progress,
    completedCount,
    errorCount,
    summary,
    startProofreading,
    cancelProofreading,
  }
}
