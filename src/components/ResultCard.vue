<template>
  <el-card class="result-card" shadow="hover">
    <div class="result-header">
      <div class="badges">
        <el-tag :type="severityType" size="small">{{ severityLabel }}</el-tag>
        <el-tag size="small">{{ categoryLabel }}</el-tag>
      </div>
      <span class="section-info">{{ issue.headingHierarchy }}</span>
    </div>

    <div class="result-body">
      <div class="original">
        <span class="label">原文:</span>
        <span class="text original-text">{{ issue.original }}</span>
      </div>
      <div class="suggestion">
        <span class="label">建议:</span>
        <span class="text suggestion-text">{{ issue.suggestion }}</span>
      </div>
      <div class="reason">
        <span class="label">原因:</span>
        <span class="text">{{ issue.reason }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  issue: { type: Object, required: true },
})

const severityMap = {
  error: { type: 'danger', label: '必须修改' },
  warning: { type: 'warning', label: '建议修改' },
  info: { type: 'info', label: '可选改进' },
}

const categoryMap = {
  grammar: '语法',
  style: '风格',
  logic: '逻辑',
  terminology: '术语',
  structure: '结构',
  formatting: '格式',
}

const severityType = computed(() => severityMap[props.issue.severity]?.type || 'info')
const severityLabel = computed(() => severityMap[props.issue.severity]?.label || props.issue.severity)
const categoryLabel = computed(() => categoryMap[props.issue.category] || props.issue.category)
</script>

<style scoped>
.result-card {
  margin-bottom: 12px;
}
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.badges {
  display: flex;
  gap: 6px;
}
.section-info {
  font-size: 12px;
  color: #909399;
}
.result-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.label {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
  flex-shrink: 0;
}
.text {
  color: #303133;
}
.original-text {
  background: #fef0f0;
  padding: 2px 6px;
  border-radius: 3px;
  text-decoration: line-through;
  text-decoration-color: #f56c6c;
}
.suggestion-text {
  background: #f0f9eb;
  padding: 2px 6px;
  border-radius: 3px;
}
.original, .suggestion, .reason {
  display: flex;
  align-items: baseline;
  line-height: 1.6;
}
</style>
