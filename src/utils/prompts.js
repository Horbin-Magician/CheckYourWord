export const SYSTEM_INSTRUCTION = `你是一位专业的学术论文审校编辑，专门负责检查中国高校的毕业论文和学位论文。你的专业领域包括：

1. 语法和语言错误（中文和英文）
2. 学术写作风格和语气
3. 逻辑连贯性和论证流畅度
4. 术语一致性
5. 段落结构和过渡
6. 冗余和啰嗦的表达
7. 标点符号使用

你必须只返回有效的 JSON 格式，匹配指定的 schema。不要在 JSON 结构之外包含任何文本。`

export function buildCheckPrompt(chunkText, headingHierarchy, chunkIndex, totalChunks) {
  return `请审校以下论文章节，找出所有需要修改的问题。

**章节位置**: ${headingHierarchy}
**分块**: 第 ${chunkIndex + 1} 块，共 ${totalChunks} 块

**重要说明**: 文本中以【】包裹的行（例如【第三章 研究方法】）是章节位置标记，仅用于标识上下文，不属于论文正文。请勿对这些标记行本身报告任何问题，也不要在 "original" 字段中包含这些标记文本。

---
${chunkText}
---

对于发现的每个问题，请提供：
1. "original" - 包含问题的原始文本（保持简短，只包含相关短语或句子）
2. "suggestion" - 你建议的替换文本
3. "reason" - 简要说明为什么需要修改
4. "severity" - 以下之一: "error"（必须修改）, "warning"（建议修改）, "info"（可选改进）
5. "category" - 以下之一: "grammar"（语法）, "style"（风格）, "logic"（逻辑）, "terminology"（术语）, "structure"（结构）, "formatting"（格式）

如果没有发现问题，返回空数组。`
}

export const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      original: { type: 'STRING' },
      suggestion: { type: 'STRING' },
      reason: { type: 'STRING' },
      severity: { type: 'STRING', enum: ['error', 'warning', 'info'] },
      category: { type: 'STRING', enum: ['grammar', 'style', 'logic', 'terminology', 'structure', 'formatting'] },
    },
    required: ['original', 'suggestion', 'reason', 'severity', 'category'],
  },
}
