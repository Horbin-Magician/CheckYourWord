import { ref } from 'vue'
import { estimateTokens } from '../utils/tokenEstimator'
import { buildHeadingHierarchy } from '../utils/htmlSplitter'

const DEFAULT_MAX_TOKENS = 6000

export function useChunker() {
  const chunks = ref([])
  const maxTokens = ref(DEFAULT_MAX_TOKENS)

  function createChunks(sections) {
    const result = []
    let buffer = []
    let bufferTokens = 0

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]

      if (section.estimatedTokens > maxTokens.value) {
        // 先刷出 buffer
        if (buffer.length > 0) {
          result.push(buildChunk(buffer, sections))
          buffer = []
          bufferTokens = 0
        }
        // 大章节按段落拆分
        const subChunks = splitLargeSection(section, sections, i)
        result.push(...subChunks)
      } else if (bufferTokens + section.estimatedTokens > maxTokens.value) {
        // buffer 满了，刷出
        result.push(buildChunk(buffer, sections))
        buffer = [{ ...section, sectionIndex: i }]
        bufferTokens = section.estimatedTokens
      } else {
        buffer.push({ ...section, sectionIndex: i })
        bufferTokens += section.estimatedTokens
      }
    }

    if (buffer.length > 0) {
      result.push(buildChunk(buffer, sections))
    }

    // 标记总数
    result.forEach((chunk, idx) => {
      chunk.index = idx
      chunk.totalChunks = result.length
    })

    chunks.value = result
    return result
  }

  function buildChunk(sectionBuffer, allSections) {
    const sections = sectionBuffer.map(s => ({
      headingText: s.headingText,
      textContent: s.textContent,
      headingHierarchy: s.headingText !== '(文档开头)'
        ? buildHeadingHierarchy(allSections, s.sectionIndex)
        : '文档开头',
    }))

    const textParts = sections.map(s => {
      const prefix = s.headingText !== '(文档开头)' ? `【${s.headingText}】\n` : ''
      return prefix + s.textContent
    })

    const headings = sections
      .filter(s => s.headingText !== '(文档开头)')
      .map(s => s.headingHierarchy)

    const chunkHeadingHierarchy = headings.join(' / ') || '文档开头'
    const primaryHeadingHierarchy = headings[headings.length - 1] || '文档开头'

    return {
      textContent: textParts.join('\n\n'),
      // 结果默认展示用单一标题，避免导出/展示出现多标题拼接
      headingHierarchy: primaryHeadingHierarchy,
      // 提供给提示词的整块上下文（保留所有小节）
      chunkHeadingHierarchy,
      estimatedTokens: sectionBuffer.reduce((sum, s) => sum + s.estimatedTokens, 0),
      sectionNames: sectionBuffer.map(s => s.headingText),
      sections,
    }
  }

  function splitLargeSection(section, allSections, sectionIndex) {
    const paragraphs = section.textContent.split(/\n+/).filter(p => p.trim())
    const subChunks = []
    let buffer = []
    let bufferTokens = 0
    const heading = buildHeadingHierarchy(allSections, sectionIndex)

    for (const para of paragraphs) {
      const paraTokens = estimateTokens(para)

      if (bufferTokens + paraTokens > maxTokens.value && buffer.length > 0) {
        const tc = buffer.join('\n')
        subChunks.push({
          textContent: `【${section.headingText}（续）】\n` + tc,
          headingHierarchy: heading,
          estimatedTokens: bufferTokens,
          sectionNames: [section.headingText],
          sections: [{ headingText: section.headingText, textContent: tc, headingHierarchy: heading }],
        })
        buffer = [para]
        bufferTokens = paraTokens
      } else {
        buffer.push(para)
        bufferTokens += paraTokens
      }
    }

    if (buffer.length > 0) {
      const tc = buffer.join('\n')
      subChunks.push({
        textContent: `【${section.headingText}】\n` + tc,
        headingHierarchy: heading,
        estimatedTokens: bufferTokens,
        sectionNames: [section.headingText],
        sections: [{ headingText: section.headingText, textContent: tc, headingHierarchy: heading }],
      })
    }

    return subChunks
  }

  return { chunks, maxTokens, createChunks }
}
