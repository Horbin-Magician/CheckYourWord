<template>
  <div class="results-display" v-if="results.length > 0 || showEmpty">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="summary">
            <span class="title">检查结果</span>
            <el-tag type="danger" v-if="summary.errors">{{ summary.errors }} 个错误</el-tag>
            <el-tag type="warning" v-if="summary.warnings">{{ summary.warnings }} 个警告</el-tag>
            <el-tag type="info" v-if="summary.infos">{{ summary.infos }} 个建议</el-tag>
            <el-tag v-if="summary.total === 0" type="success">未发现问题</el-tag>
          </div>
          <div class="actions" v-if="results.length > 0">
            <el-button size="small" type="primary" @click="$emit('save')">
              保存结果
            </el-button>
            <el-dropdown trigger="click" @command="handleExport">
              <el-button size="small">
                导出报告 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="md">导出 Markdown</el-dropdown-item>
                  <el-dropdown-item command="json">导出 JSON</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>

      <!-- 过滤器 -->
      <div class="filters" v-if="results.length > 0">
        <el-select v-model="severityFilter" placeholder="严重度" clearable size="small">
          <el-option label="必须修改" value="error" />
          <el-option label="建议修改" value="warning" />
          <el-option label="可选改进" value="info" />
        </el-select>
        <el-select v-model="categoryFilter" placeholder="分类" clearable size="small">
          <el-option label="语法" value="grammar" />
          <el-option label="风格" value="style" />
          <el-option label="逻辑" value="logic" />
          <el-option label="术语" value="terminology" />
          <el-option label="结构" value="structure" />
          <el-option label="格式" value="formatting" />
        </el-select>
        <span class="filter-count">显示 {{ filteredResults.length }} / {{ results.length }} 条</span>
      </div>

      <!-- 结果列表 -->
      <div class="result-list">
        <ResultCard v-for="(issue, i) in filteredResults" :key="i" :issue="issue" />
      </div>
    </el-card>

    <el-dialog
      v-model="exportDialogVisible"
      title="导出筛选"
      width="460px"
      append-to-body
    >
      <div class="export-dialog-content">
        <div class="export-format">导出格式：{{ pendingExportFormat === 'md' ? 'Markdown' : 'JSON' }}</div>
        <div class="export-label">按重要程度筛选：</div>
        <el-checkbox-group v-model="exportSeveritySelections">
          <el-checkbox label="error">必须修改</el-checkbox>
          <el-checkbox label="warning">建议修改</el-checkbox>
          <el-checkbox label="info">可选改进</el-checkbox>
        </el-checkbox-group>
        <div class="export-preview">
          将导出 {{ exportSummary.total }} 条问题：
          {{ exportSummary.errors }} 条必须修改、{{ exportSummary.warnings }} 条建议修改、{{ exportSummary.infos }} 条可选改进
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="exportDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmExport">确认导出</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import ResultCard from './ResultCard.vue'

const props = defineProps({
  results: { type: Array, required: true },
  summary: { type: Object, required: true },
  showEmpty: { type: Boolean, default: false },
  fileName: { type: String, default: '' },
})

defineEmits(['save'])

const severityFilter = ref('')
const categoryFilter = ref('')
const exportDialogVisible = ref(false)
const pendingExportFormat = ref('md')
const exportSeveritySelections = ref(['error', 'warning', 'info'])

const filteredResults = computed(() => {
  let list = props.results
  if (severityFilter.value) {
    list = list.filter(r => r.severity === severityFilter.value)
  }
  if (categoryFilter.value) {
    list = list.filter(r => r.category === categoryFilter.value)
  }
  return list
})

const categoryMap = {
  grammar: '语法', style: '风格', logic: '逻辑',
  terminology: '术语', structure: '结构', formatting: '格式',
}
const severityMap = { error: '错误', warning: '警告', info: '建议' }

const exportResults = computed(() => {
  const selectedSet = new Set(exportSeveritySelections.value)
  return props.results.filter(r => selectedSet.has(r.severity))
})

const exportSummary = computed(() => buildSummary(exportResults.value))

function buildSummary(list) {
  return {
    total: list.length,
    errors: list.filter(r => r.severity === 'error').length,
    warnings: list.filter(r => r.severity === 'warning').length,
    infos: list.filter(r => r.severity === 'info').length,
  }
}

function simplifyHeadingHierarchy(headingHierarchy) {
  const text = (headingHierarchy || '').trim()
  if (!text) return '文档开头'
  const parts = text.split(' / ').map(s => s.trim()).filter(Boolean)
  return parts[parts.length - 1] || text
}

function handleExport(format) {
  pendingExportFormat.value = format
  exportSeveritySelections.value = ['error', 'warning', 'info']
  exportDialogVisible.value = true
}

function confirmExport() {
  if (exportSeveritySelections.value.length === 0) {
    ElMessage.warning('请至少选择一个重要程度级别')
    return
  }
  if (exportResults.value.length === 0) {
    ElMessage.warning('当前筛选下没有可导出的结果')
    return
  }

  if (pendingExportFormat.value === 'md') exportMarkdown(exportResults.value, exportSummary.value)
  else if (pendingExportFormat.value === 'json') exportJSON(exportResults.value, exportSummary.value)

  exportDialogVisible.value = false
}

function exportMarkdown(results, summary) {
  const lines = ['# 论文检查报告\n']
  if (props.fileName) {
    lines.push(`**文件**: ${props.fileName}\n`)
  }
  lines.push(`**时间**: ${new Date().toLocaleString('zh-CN')}\n`)
  lines.push(`共发现 ${summary.total} 个问题：${summary.errors} 个错误、${summary.warnings} 个警告、${summary.infos} 个建议\n`)

  results.forEach((r, i) => {
    lines.push(`## 问题 ${i + 1} [${severityMap[r.severity]}][${categoryMap[r.category]}]`)
    lines.push(`- 位置: ${simplifyHeadingHierarchy(r.headingHierarchy)}`)
    lines.push(`- 原文: ${r.original}`)
    lines.push(`- 建议: ${r.suggestion}`)
    lines.push(`- 原因: ${r.reason}`)
    lines.push('')
  })

  downloadFile(lines.join('\n'), '论文检查报告.md', 'text/markdown;charset=utf-8')
}

function exportJSON(results, summary) {
  const data = {
    fileName: props.fileName,
    exportedAt: new Date().toISOString(),
    summary,
    selectedSeverities: exportSeveritySelections.value,
    results: results.map(r => ({
      ...r,
      headingHierarchy: simplifyHeadingHierarchy(r.headingHierarchy),
    })),
  }
  downloadFile(JSON.stringify(data, null, 2), '论文检查报告.json', 'application/json;charset=utf-8')
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.results-display {
  margin: 20px 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.summary {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  font-weight: 600;
  font-size: 16px;
}
.actions {
  display: flex;
  gap: 8px;
}
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.filter-count {
  font-size: 13px;
  color: #909399;
}
.result-list {
  max-height: 600px;
  overflow-y: auto;
}
.export-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.export-format {
  font-size: 13px;
  color: #606266;
}
.export-label {
  font-weight: 600;
  color: #303133;
}
.export-preview {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}
</style>
