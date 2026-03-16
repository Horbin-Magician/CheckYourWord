/**
 * 估算文本的 token 数量
 * 中文文本：约每 1.5-2 个字符 1 个 token，取保守值 3.5
 * 英文文本：约每 4 个字符 1 个 token
 */

function isCJK(char) {
  const code = char.charCodeAt(0)
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK 统一汉字
    (code >= 0x3400 && code <= 0x4dbf) || // CJK 扩展 A
    (code >= 0xf900 && code <= 0xfaff)    // CJK 兼容汉字
  )
}

export function estimateTokens(text) {
  if (!text) return 0

  let cjkCount = 0
  let otherCount = 0

  for (const char of text) {
    if (isCJK(char)) {
      cjkCount++
    } else {
      otherCount++
    }
  }

  // CJK 约 1 token / 1.5 字符, 非CJK 约 1 token / 4 字符
  return Math.ceil(cjkCount / 1.5 + otherCount / 4)
}
