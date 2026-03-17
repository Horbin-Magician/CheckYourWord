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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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

function simplifyHeadingHierarchy(headingHierarchy) {
  const text = (headingHierarchy || '').trim()
  if (!text) return '文档开头'
  const parts = text.split(' / ').map(s => s.trim()).filter(Boolean)
  return parts[parts.length - 1] || text
}

function handleExport(format) {
  if (format === 'md') exportMarkdown()
  else if (format === 'json') exportJSON()
}

function exportMarkdown() {
  const lines = ['# 论文检查报告\n']
  if (props.fileName) {
    lines.push(`**文件**: ${props.fileName}\n`)
  }
  lines.push(`**时间**: ${new Date().toLocaleString('zh-CN')}\n`)
  lines.push(`共发现 ${props.summary.total} 个问题：${props.summary.errors} 个错误、${props.summary.warnings} 个警告、${props.summary.infos} 个建议\n`)

  props.results.forEach((r, i) => {
    lines.push(`## 问题 ${i + 1} [${severityMap[r.severity]}][${categoryMap[r.category]}]`)
    lines.push(`- 位置: ${simplifyHeadingHierarchy(r.headingHierarchy)}`)
    lines.push(`- 原文: ${r.original}`)
    lines.push(`- 建议: ${r.suggestion}`)
    lines.push(`- 原因: ${r.reason}`)
    lines.push('')
  })

  downloadFile(lines.join('\n'), '论文检查报告.md', 'text/markdown;charset=utf-8')
}

function exportJSON() {
  const data = {
    fileName: props.fileName,
    exportedAt: new Date().toISOString(),
    summary: props.summary,
    results: props.results.map(r => ({
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
</style>
