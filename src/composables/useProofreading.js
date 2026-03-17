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

  async function startProofreading(chunks, checkChunkFn) {
    cancelled = false
    isProcessing.value = true
    results.value = []
    chunkStatuses.value = chunks.map(() => 'pending')
    currentChunkIndex.value = 0

    for (let i = 0; i < chunks.length; i++) {
      if (cancelled) break

      currentChunkIndex.value = i
      chunkStatuses.value[i] = 'processing'

      let retries = 0
      const maxRetries = 2

      while (retries <= maxRetries) {
        try {
          const issues = await checkChunkFn(chunks[i])
          // 给每条结果附加章节信息，尝试精确匹配到原文所在的小节
          const enriched = issues.map(issue => ({
            ...issue,
            sectionNames: chunks[i].sectionNames,
            headingHierarchy: resolveIssueHeading(chunks[i], issue),
            chunkIndex: i,
          }))
          results.value = [...results.value, ...enriched]
          chunkStatuses.value[i] = 'completed'
          break
        } catch (e) {
          retries++
          if (retries > maxRetries) {
            console.error(`Chunk ${i} failed after ${maxRetries} retries:`, e)
            chunkStatuses.value[i] = 'error'
          } else {
            // 指数退避
            await new Promise(r => setTimeout(r, 2000 * retries))
          }
        }
      }
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
