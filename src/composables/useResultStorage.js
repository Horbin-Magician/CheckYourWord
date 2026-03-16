import { ref } from 'vue'

const STORAGE_KEY = 'checkyourword_saved_results'

export function useResultStorage() {
  const savedList = ref([])

  function loadSavedList() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      savedList.value = raw ? JSON.parse(raw) : []
    } catch {
      savedList.value = []
    }
  }

  function saveResult({ fileName, results, summary }) {
    loadSavedList()
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fileName,
      savedAt: new Date().toISOString(),
      summary: { ...summary },
      results: results.map(r => ({ ...r })),
    }
    savedList.value.unshift(record)
    // 最多保留 20 条历史
    if (savedList.value.length > 20) {
      savedList.value = savedList.value.slice(0, 20)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedList.value))
    return record
  }

  function deleteRecord(id) {
    loadSavedList()
    savedList.value = savedList.value.filter(r => r.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedList.value))
  }

  function clearAll() {
    savedList.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  // 初始加载
  loadSavedList()

  return {
    savedList,
    saveResult,
    deleteRecord,
    clearAll,
    loadSavedList,
  }
}
