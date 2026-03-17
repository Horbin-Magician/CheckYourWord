import { ref } from 'vue'
import { GoogleGenAI } from '@google/genai'
import { SYSTEM_INSTRUCTION, buildCheckPrompt, RESPONSE_SCHEMA } from '../utils/prompts'

const STORAGE_KEY = 'checkyourword_api_key'
const MODEL_STORAGE_KEY = 'checkyourword_model'
const BASE_URL_STORAGE_KEY = 'checkyourword_base_url'
const IGNORE_FORMULA_ISSUES_STORAGE_KEY = 'checkyourword_ignore_formula_issues'
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const MIN_REQUEST_INTERVAL = 6000 // 免费用户 10 RPM

export function useGemini() {
  const apiKey = ref(localStorage.getItem(STORAGE_KEY) || '')
  const model = ref(localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-2.5-flash')
  const baseUrl = ref(localStorage.getItem(BASE_URL_STORAGE_KEY) || DEFAULT_BASE_URL)
  const ignoreFormulaIssues = ref(localStorage.getItem(IGNORE_FORMULA_ISSUES_STORAGE_KEY) !== 'false')
  const isConnected = ref(false)
  const connectionError = ref(null)

  let ai = null
  let lastRequestTime = 0

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, apiKey.value)
    localStorage.setItem(MODEL_STORAGE_KEY, model.value)
    localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl.value)
    localStorage.setItem(IGNORE_FORMULA_ISSUES_STORAGE_KEY, String(ignoreFormulaIssues.value))
    ai = null // 重置 client
    isConnected.value = false
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

    // 限流等待
    const now = Date.now()
    const elapsed = now - lastRequestTime
    if (elapsed < MIN_REQUEST_INTERVAL) {
      await sleep(MIN_REQUEST_INTERVAL - elapsed)
    }

    const prompt = buildCheckPrompt(
      chunk.textContent,
      chunk.chunkHeadingHierarchy || chunk.headingHierarchy,
      chunk.index,
      chunk.totalChunks,
      { ignoreFormulaIssues: ignoreFormulaIssues.value }
    )

    lastRequestTime = Date.now()

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
  }

  return {
    apiKey,
    model,
    baseUrl,
    ignoreFormulaIssues,
    DEFAULT_BASE_URL,
    isConnected,
    connectionError,
    saveSettings,
    testConnection,
    checkChunk,
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
