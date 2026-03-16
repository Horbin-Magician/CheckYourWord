import { ref } from 'vue'
import mammoth from 'mammoth'
import { splitHtmlBySections } from '../utils/htmlSplitter'
import { cleanDocxForProofreading } from '../utils/docxCleaner'

export function useDocxParser() {
  const sections = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const fileName = ref('')
  const fileSize = ref(0)

  async function parseFile(file) {
    isLoading.value = true
    error.value = null
    sections.value = []
    fileName.value = file.name
    fileSize.value = file.size

    try {
      const arrayBuffer = await file.arrayBuffer()
      const cleanedArrayBuffer = await cleanDocxForProofreading(arrayBuffer)
      const result = await mammoth.convertToHtml({ arrayBuffer: cleanedArrayBuffer })

      if (result.messages.length > 0) {
        console.warn('Mammoth warnings:', result.messages)
      }

      sections.value = splitHtmlBySections(result.value)

      if (sections.value.length === 0) {
        error.value = '未能从文档中解析出有效内容，请确认文件不为空'
      }
    } catch (e) {
      error.value = `解析文档失败: ${e.message}`
    } finally {
      isLoading.value = false
    }
  }

  return { sections, isLoading, error, fileName, fileSize, parseFile }
}
