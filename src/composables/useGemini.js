import { ref } from 'vue'
import { GoogleGenAI } from '@google/genai'
import { SYSTEM_INSTRUCTION, buildCheckPrompt, RESPONSE_SCHEMA } from '../utils/prompts'

const STORAGE_KEY = 'checkyourword_api_key'
const MODEL_STORAGE_KEY = 'checkyourword_model'
const BASE_URL_STORAGE_KEY = 'checkyourword_base_url'
const CUSTOM_PROMPTS_STORAGE_KEY = 'checkyourword_custom_prompts'
const IGNORE_FORMULA_ISSUES_STORAGE_KEY = 'checkyourword_ignore_formula_issues'
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

const BUILTIN_FORMULA_PROMPT = {
  id: 'builtin-ignore-formula-issues',
  text: '请忽略所有与公式相关的问题，包括但不限于数学公式、LaTeX/MathType 表达、变量符号、上下标及其标点。不要为这些内容生成任何修改建议。',
  enabled: true,
  builtIn: true,
}

export function useGemini() {
  const apiKey = ref(localStorage.getItem(STORAGE_KEY) || '')
  const model = ref(localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-2.5-flash')
  const baseUrl = ref(localStorage.getItem(BASE_URL_STORAGE_KEY) || DEFAULT_BASE_URL)
  const customPrompts = ref(loadCustomPrompts())
  const isConnected = ref(false)
  const connectionError = ref(null)

  let ai = null
  let cooldownUntil = 0

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, apiKey.value)
    localStorage.setItem(MODEL_STORAGE_KEY, model.value)
    localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl.value)
    persistCustomPrompts()
    ai = null // 重置 client
    isConnected.value = false
  }

  function persistCustomPrompts() {
    localStorage.setItem(CUSTOM_PROMPTS_STORAGE_KEY, JSON.stringify(normalizeCustomPrompts(customPrompts.value)))
  }

  function getClient() {
    if (!ai && apiKey.value) {
      const opts = { apiKey: apiKey.value }
      const url = baseUrl.value.trim()
      if (url && url !== DEFAULT_BASE_URL) {
        opts.httpOptions = { baseUrl: url }
      }
      ai = new GoogleGenAI(opts)
    }
    return ai
  }

  async function testConnection() {
    connectionError.value = null
    isConnected.value = false

    try {
      const client = getClient()
      if (!client) {
        connectionError.value = '请先输入 API Key'
        return false
      }

      await client.models.generateContent({
        model: model.value,
        contents: '你好',
        config: { maxOutputTokens: 10 },
      })

      isConnected.value = true
      return true
    } catch (e) {
      connectionError.value = `连接失败: ${e.message}`
      ai = null
      return false
    }
  }

  async function checkChunk(chunk) {
    const client = getClient()
    if (!client) throw new Error('API 未配置')

    await waitForCooldown()

    const prompt = buildCheckPrompt(
      chunk.textContent,
      chunk.chunkHeadingHierarchy || chunk.headingHierarchy,
      chunk.index,
      chunk.totalChunks,
      {
        customPrompts: normalizeCustomPrompts(customPrompts.value)
          .filter(item => item.enabled)
          .map(item => item.text),
      }
    )

    try {
      const response = await client.models.generateContent({
        model: model.value,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      })

      const text = response.text
      const issues = JSON.parse(text)
      // 过滤掉 original 字段命中【标题标记】的误报
      return issues.filter(issue => !/^【[^】]*】(（续）)?\s*$/.test(issue.original?.trim()))
    } catch (e) {
      // 命中限流时设置全局冷却时间，交由上层重试策略继续处理
      const retryMs = resolveRetryDelayMs(e)
      if (retryMs > 0) {
        cooldownUntil = Math.max(cooldownUntil, Date.now() + retryMs)
      }
      throw e
    }
  }

  async function waitForCooldown() {
    while (cooldownUntil > Date.now()) {
      await sleep(Math.min(1200, cooldownUntil - Date.now()))
    }
  }

  function resolveRetryDelayMs(error) {
    const message = String(error?.message || error || '')
    const isRateLimit = /429|RESOURCE_EXHAUSTED|rate limit|quota/i.test(message)
    if (!isRateLimit) return 0

    const secondsMatch = message.match(/retry\s*after\s*(\d+)\s*s/i)
    if (secondsMatch) {
      return Math.max(1000, Number(secondsMatch[1]) * 1000)
    }

    return 8000
  }

  return {
    apiKey,
    model,
    baseUrl,
    customPrompts,
    DEFAULT_BASE_URL,
    isConnected,
    connectionError,
    saveSettings,
    persistCustomPrompts,
    testConnection,
    checkChunk,
  }
}

function loadCustomPrompts() {
  const saved = localStorage.getItem(CUSTOM_PROMPTS_STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return normalizeCustomPrompts(parsed)
    } catch {
      // ignore invalid storage and fallback to default values
    }
  }

  const legacyIgnoreFormula = localStorage.getItem(IGNORE_FORMULA_ISSUES_STORAGE_KEY) !== 'false'
  return normalizeCustomPrompts([
    {
      ...BUILTIN_FORMULA_PROMPT,
      enabled: legacyIgnoreFormula,
    },
  ])
}

function normalizeCustomPrompts(list) {
  const normalized = Array.isArray(list)
    ? list
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const text = typeof item.text === 'string' ? item.text.trim() : ''
          if (!text) return null
          const isBuiltIn = item.id === BUILTIN_FORMULA_PROMPT.id || item.builtIn === true
          return {
            id: typeof item.id === 'string' && item.id ? item.id : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            enabled: item.enabled !== false,
            builtIn: isBuiltIn,
          }
        })
        .filter(Boolean)
    : []

  const formulaPrompt = normalized.find(item => item.id === BUILTIN_FORMULA_PROMPT.id)
  if (!formulaPrompt) {
    normalized.unshift({ ...BUILTIN_FORMULA_PROMPT })
  }

  return normalized
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
