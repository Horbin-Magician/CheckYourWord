<template>
  <el-card class="progress-panel" v-if="chunkStatuses.length > 0">
    <template #header>
      <div class="card-header">
        <span>检查进度</span>
        <span class="progress-text">
          {{ completedCount }} / {{ chunkStatuses.length }} 块
          <template v-if="errorCount > 0">
            （{{ errorCount }} 个失败）
          </template>
        </span>
      </div>
    </template>

    <el-progress
      :percentage="progress"
      :status="allDone ? (errorCount > 0 ? 'warning' : 'success') : ''"
      :stroke-width="20"
      striped
      striped-flow
    />

    <div class="chunk-list" v-if="chunkStatuses.length <= 20">
      <div
        v-for="(status, i) in chunkStatuses"
        :key="i"
        class="chunk-item"
        :class="'chunk-' + status"
      >
        <el-icon v-if="status === 'completed'" color="#67c23a"><circle-check-filled /></el-icon>
        <el-icon v-else-if="status === 'error'" color="#f56c6c"><circle-close-filled /></el-icon>
        <el-icon v-else-if="status === 'processing'" class="is-loading" color="#409eff"><loading /></el-icon>
        <el-icon v-else color="#c0c4cc"><clock /></el-icon>
        <span class="chunk-label">块 {{ i + 1 }}</span>
      </div>
    </div>

    <div class="current-info" v-if="currentChunkIndex >= 0 && chunks[currentChunkIndex]">
      正在处理: {{ chunks[currentChunkIndex].headingHierarchy }}
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { CircleCheckFilled, CircleCloseFilled, Loading, Clock } from '@element-plus/icons-vue'

const props = defineProps({
  chunkStatuses: { type: Array, required: true },
  progress: { type: Number, required: true },
  completedCount: { type: Number, required: true },
  errorCount: { type: Number, required: true },
  currentChunkIndex: { type: Number, default: -1 },
  chunks: { type: Array, default: () => [] },
})

const allDone = computed(() =>
  props.chunkStatuses.length > 0 &&
  props.chunkStatuses.every(s => s === 'completed' || s === 'error')
)
</script>

<style scoped>
.progress-panel {
  margin: 20px 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.progress-text {
  font-size: 14px;
  color: #606266;
}
.chunk-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.chunk-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #f5f7fa;
}
.chunk-processing {
  background: #ecf5ff;
}
.chunk-completed {
  background: #f0f9eb;
}
.chunk-error {
  background: #fef0f0;
}
.current-info {
  margin-top: 12px;
  font-size: 13px;
  color: #909399;
}
</style>
