<template>
  <div class="app-container">
    <!-- 顶部导航 -->
    <header class="app-header">
      <div class="brand">
        <span class="brand-pill">Academic Proof Lab</span>
        <h1 class="app-title">CheckYourWord</h1>
        <span class="app-subtitle">文档检查润色助手</span>
      </div>
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
      @update:maxTokens="v => chunker.maxTokens.value = v"
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
      <section v-if="!docParser.sections.value.length && !docParser.isLoading.value" class="upload-section">
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

      <!-- 自定义提示词 -->
      <section class="prompt-section">
        <div class="section-head">
          <h3 class="section-title">自定义提示词</h3>
          <span class="section-badge">已启用 {{ enabledPromptCount }} 条</span>
        </div>
        <div class="prompt-editor">
          <el-input
            v-model="newPromptText"
            placeholder="例如：忽略‘卷夹’名词使用相关问题"
            clearable
            @keyup.enter="addPrompt"
          >
            <template #append>
              <el-button @click="addPrompt">添加</el-button>
            </template>
          </el-input>
          <div class="prompt-tip">已启用的提示词会附加到每次审校请求中</div>
        </div>

        <div class="prompt-list" v-if="gemini.customPrompts.value.length > 0">
          <div class="prompt-item" v-for="item in gemini.customPrompts.value" :key="item.id">
            <el-switch v-model="item.enabled" />
            <span class="prompt-text">{{ item.text }}</span>
            <el-tag v-if="item.builtIn" size="small" type="info">内置</el-tag>
            <el-button
              v-else
              type="danger"
              link
              @click="removePrompt(item.id)"
            >删除</el-button>
          </div>
        </div>
        <div class="prompt-tip" v-else>暂无自定义提示词</div>
      </section>

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
import { ref, computed, watch } from 'vue'
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
const newPromptText = ref('')

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

const enabledPromptCount = computed(() =>
  gemini.customPrompts.value.filter(item => item.enabled).length
)

watch(
  () => gemini.customPrompts.value,
  () => {
    gemini.persistCustomPrompts()
  },
  { deep: true }
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

  await proofreading.startProofreading(chunker.chunks.value, gemini.checkChunk, {
    concurrency: 3,
    maxRetries: 2,
  })

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

function addPrompt() {
  const text = newPromptText.value.trim()
  if (!text) {
    ElMessage.warning('请输入提示词内容')
    return
  }

  const exists = gemini.customPrompts.value.some(item => item.text === text)
  if (exists) {
    ElMessage.info('该提示词已存在')
    return
  }

  gemini.customPrompts.value.push({
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    enabled: true,
    builtIn: false,
  })
  newPromptText.value = ''
}

function removePrompt(id) {
  gemini.customPrompts.value = gemini.customPrompts.value.filter(item => item.id !== id)
}
</script>

<style scoped>
.app-container {
  --surface: rgba(255, 255, 255, 0.86);
  --surface-strong: rgba(255, 255, 255, 0.96);
  --line: rgba(10, 31, 68, 0.14);
  --ink: #162033;
  --ink-soft: #4e5b75;
  --accent: #0f9d8f;
  --accent-soft: #d9f3ef;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 980px;
  margin: 0 auto;
  padding: 18px 20px 24px;
  position: relative;
}

.app-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 18px 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(130deg, var(--surface-strong), rgba(241, 249, 255, 0.9));
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 30px rgba(5, 35, 71, 0.08);
  animation: rise-in 0.55s ease;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-pill {
  width: fit-content;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #0d5f70;
  background: #dbf2f8;
  border: 1px solid rgba(13, 95, 112, 0.18);
}

.app-title {
  font-size: clamp(24px, 2.3vw, 30px);
  font-weight: 650;
  color: var(--ink);
  letter-spacing: 0.01em;
  margin: 0;
  line-height: 1.1;
}

.app-subtitle {
  font-size: 14px;
  color: var(--ink-soft);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.app-main {
  flex: 1;
  padding: 18px 0 22px;
}

.upload-section {
  width: 100%;
}

.prompt-section {
  margin: 18px 0 22px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(160deg, var(--surface), rgba(234, 246, 242, 0.72));
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 24px rgba(8, 37, 72, 0.07);
  animation: rise-in 0.65s ease;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 17px;
  color: var(--ink);
}

.section-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  color: #0a5f54;
  background: var(--accent-soft);
  border: 1px solid rgba(10, 95, 84, 0.14);
}

.prompt-editor {
  width: 100%;
  margin-top: 12px;
}

.prompt-tip {
  font-size: 12px;
  color: var(--ink-soft);
  margin-top: 6px;
}

.prompt-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.prompt-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(12, 42, 87, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.76);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.prompt-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(9, 31, 64, 0.08);
}

.prompt-text {
  flex: 1;
  line-height: 1.5;
  color: var(--ink);
}

.loading-state {
  text-align: center;
  padding: 40px 0;
  color: var(--ink-soft);
  border: 1px dashed var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.56);
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 22px 0;
}

.action-tip {
  font-size: 13px;
  color: #aa6e12;
}

.app-footer {
  text-align: center;
  padding: 14px 0 4px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: #6c7892;
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .app-container {
    padding: 12px 12px 16px;
  }

  .app-header {
    flex-direction: column;
    align-items: stretch;
    padding: 14px;
  }

  .app-title {
    font-size: 24px;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .prompt-section {
    padding: 12px;
  }

  .section-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .prompt-item {
    flex-wrap: wrap;
  }
}
</style>
