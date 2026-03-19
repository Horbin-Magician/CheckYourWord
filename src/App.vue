<template>
  <div class="app-container">
    <!-- 顶部导航 -->
    <header class="app-header">
      <h1 class="app-title">CheckYourWord</h1>
      <span class="app-subtitle">文档检查润色助手</span>
      <div class="header-actions">
        <el-tag v-if="gemini.isConnected.value" type="success" size="small">API 已连接</el-tag>
        <el-tag v-else type="info" size="small">未连接</el-tag>
        <el-button :icon="Clock" circle @click="showHistory = true" title="历史记录" />
        <el-button :icon="Setting" circle @click="showSettings = true" />
      </div>
    </header>

    <!-- 设置抽屉 -->
    <ApiKeySettings
      v-model:visible="showSettings"
      :gemini="gemini"
      :maxTokens="chunker.maxTokens.value"
      :ignoreFormulaIssues="gemini.ignoreFormulaIssues.value"
      @update:maxTokens="v => chunker.maxTokens.value = v"
      @update:ignoreFormulaIssues="v => gemini.ignoreFormulaIssues.value = v"
    />

    <!-- 历史记录抽屉 -->
    <HistoryDrawer
      v-model:visible="showHistory"
      :savedList="resultStorage.savedList.value"
      @load="handleLoadRecord"
      @delete="resultStorage.deleteRecord"
      @clearAll="resultStorage.clearAll"
    />

    <main class="app-main">
      <!-- 上传区域 -->
      <section v-if="!docParser.sections.value.length && !docParser.isLoading.value">
        <FileUploader @file-selected="handleFileSelected" ref="uploaderRef" />
      </section>

      <!-- 解析中 -->
      <div v-if="docParser.isLoading.value" class="loading-state">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p>正在解析文档...</p>
      </div>

      <!-- 解析错误 -->
      <el-alert
        v-if="docParser.error.value"
        :title="docParser.error.value"
        type="error"
        show-icon
        closable
        @close="resetAll"
        style="margin: 20px 0"
      />

      <!-- 文档预览 -->
      <DocumentPreview
        v-if="docParser.sections.value.length > 0"
        :sections="docParser.sections.value"
        :fileName="docParser.fileName.value"
        :chunkCount="chunker.chunks.value.length"
      />

      <!-- 操作按钮 -->
      <div class="action-bar" v-if="docParser.sections.value.length > 0 && !proofreading.isProcessing.value">
        <el-button type="primary" size="large" @click="startCheck" :disabled="!gemini.isConnected.value">
          开始检查
        </el-button>
        <el-button size="large" @click="resetAll">
          重新上传
        </el-button>
        <span v-if="!gemini.isConnected.value" class="action-tip">
          请先在设置中配置并测试 API Key
        </span>
      </div>

      <!-- 进行中的取消按钮 -->
      <div class="action-bar" v-if="proofreading.isProcessing.value">
        <el-button type="danger" @click="proofreading.cancelProofreading()">
          取消检查
        </el-button>
      </div>

      <!-- 进度面板 -->
      <ProgressPanel
        :chunkStatuses="proofreading.chunkStatuses.value"
        :progress="proofreading.progress.value"
        :completedCount="proofreading.completedCount.value"
        :errorCount="proofreading.errorCount.value"
        :currentChunkIndex="proofreading.currentChunkIndex.value"
        :chunks="chunker.chunks.value"
      />

      <!-- 结果展示 -->
      <ResultsDisplay
        :results="proofreading.results.value"
        :summary="proofreading.summary.value"
        :showEmpty="showEmptyResults"
        :fileName="docParser.fileName.value"
        @save="handleSaveResult"
      />
    </main>

    <footer class="app-footer">
      <p>Powered by Gemini AI · 论文内容仅在浏览器端处理</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Setting, Loading, Clock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ApiKeySettings from './components/ApiKeySettings.vue'
import FileUploader from './components/FileUploader.vue'
import DocumentPreview from './components/DocumentPreview.vue'
import ProgressPanel from './components/ProgressPanel.vue'
import ResultsDisplay from './components/ResultsDisplay.vue'
import HistoryDrawer from './components/HistoryDrawer.vue'
import { useDocxParser } from './composables/useDocxParser'
import { useChunker } from './composables/useChunker'
import { useGemini } from './composables/useGemini'
import { useProofreading } from './composables/useProofreading'
import { useResultStorage } from './composables/useResultStorage'

const showSettings = ref(false)
const showHistory = ref(false)
const uploaderRef = ref(null)

const docParser = useDocxParser()
const chunker = useChunker()
const gemini = useGemini()
const proofreading = useProofreading()
const resultStorage = useResultStorage()

const showEmptyResults = computed(() =>
  !proofreading.isProcessing.value &&
  proofreading.chunkStatuses.value.length > 0 &&
  proofreading.chunkStatuses.value.every(s => s === 'completed' || s === 'error')
)

// 如果已有 API key，自动测试连接
if (gemini.apiKey.value) {
  gemini.testConnection()
}

async function handleFileSelected(file) {
  await docParser.parseFile(file)
  if (docParser.sections.value.length > 0) {
    chunker.createChunks(docParser.sections.value)
    ElMessage.success(`文档解析成功，共 ${docParser.sections.value.length} 个章节，分为 ${chunker.chunks.value.length} 块`)
  }
}

async function startCheck() {
  if (!gemini.isConnected.value) {
    ElMessage.warning('请先配置并测试 API Key')
    showSettings.value = true
    return
  }

  if (chunker.chunks.value.length === 0) {
    ElMessage.error('没有可检查的内容')
    return
  }

  await proofreading.startProofreading(chunker.chunks.value, gemini.checkChunk)

  if (proofreading.errorCount.value > 0) {
    ElMessage.warning(`检查完成，${proofreading.errorCount.value} 个分块处理失败`)
  } else {
    ElMessage.success(`检查完成，共发现 ${proofreading.summary.value.total} 个问题`)
  }
}

function resetAll() {
  docParser.sections.value = []
  docParser.error.value = null
  docParser.fileName.value = ''
  chunker.chunks.value = []
  proofreading.results.value = []
  proofreading.chunkStatuses.value = []
  if (uploaderRef.value) {
    uploaderRef.value.reset()
  }
}

function handleSaveResult() {
  resultStorage.saveResult({
    fileName: docParser.fileName.value,
    results: proofreading.results.value,
    summary: proofreading.summary.value,
  })
  ElMessage.success('结果已保存')
}

function handleLoadRecord(record) {
  proofreading.results.value = record.results
  proofreading.chunkStatuses.value = record.results.length > 0
    ? ['completed']
    : []
  docParser.fileName.value = record.fileName || ''
  showHistory.value = false
  ElMessage.success('已加载历史结果')
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #e4e7ed;
}

.app-title {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

.app-subtitle {
  font-size: 14px;
  color: #909399;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-main {
  flex: 1;
  padding: 24px 0;
}

.loading-state {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 20px 0;
}

.action-tip {
  font-size: 13px;
  color: #e6a23c;
}

.app-footer {
  text-align: center;
  padding: 16px 0;
  border-top: 1px solid #e4e7ed;
  font-size: 12px;
  color: #c0c4cc;
}
</style>
