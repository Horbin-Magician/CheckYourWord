import { estimateTokens } from './tokenEstimator'

/**
 * 将 mammoth 生成的 HTML 按标题拆分为结构化章节
 */
export function splitHtmlBySections(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const container = doc.body.firstElementChild

  const sections = []
  let currentSection = null

  for (const node of container.childNodes) {
    const tagName = node.tagName?.toLowerCase() || ''
    const isHeading = /^h[1-6]$/.test(tagName)

    if (isHeading) {
      // 保存上一个 section
      if (currentSection) {
        finalizeSectionStats(currentSection)
        sections.push(currentSection)
      }
      currentSection = {
        headingLevel: parseInt(tagName[1]),
        headingText: node.textContent.trim(),
        htmlContent: '',
        textContent: '',
      }
    } else {
      if (!currentSection) {
        // 标题前的内容，创建一个虚拟 section
        currentSection = {
          headingLevel: 0,
          headingText: '(文档开头)',
          htmlContent: '',
          textContent: '',
        }
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        currentSection.htmlContent += node.outerHTML
        currentSection.textContent += node.textContent + '\n'
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        currentSection.htmlContent += node.textContent
        currentSection.textContent += node.textContent + '\n'
      }
    }
  }

  // 保存最后一个 section
  if (currentSection) {
    finalizeSectionStats(currentSection)
    sections.push(currentSection)
  }

  return sections
}

function finalizeSectionStats(section) {
  section.textContent = section.textContent.trim()
  section.estimatedTokens = estimateTokens(section.textContent)
  section.charCount = section.textContent.length
}

/**
 * 构建章节的标题层级路径
 * 例如: "第三章 研究方法 > 3.1 数据收集"
 */
export function buildHeadingHierarchy(sections, index) {
  const target = sections[index]
  const path = [target.headingText]
  let currentLevel = target.headingLevel

  if (currentLevel <= 0) {
    return target.headingText || '文档开头'
  }

  for (let i = index - 1; i >= 0; i--) {
    const level = sections[i].headingLevel
    if (level > 0 && level < currentLevel) {
      path.unshift(sections[i].headingText)
      currentLevel = level
      if (level === 1) break
    }
  }

  return path.join(' > ')
}
