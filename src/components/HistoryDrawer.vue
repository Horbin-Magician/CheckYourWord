<template>
  <el-drawer v-model="visible" title="历史记录" direction="rtl" size="460px">
    <div v-if="savedList.length === 0" class="empty-state">
      <p>暂无保存的检查结果</p>
    </div>

    <template v-else>
      <div class="history-actions">
        <el-popconfirm title="确定清空所有历史记录？" @confirm="$emit('clearAll')">
          <template #reference>
            <el-button size="small" type="danger" plain>清空全部</el-button>
          </template>
        </el-popconfirm>
      </div>

      <div class="history-list">
        <el-card v-for="record in savedList" :key="record.id" class="history-item" shadow="hover">
          <div class="item-header">
            <span class="item-filename" :title="record.fileName">{{ record.fileName || '未知文件' }}</span>
            <span class="item-time">{{ formatTime(record.savedAt) }}</span>
          </div>
          <div class="item-summary">
            <el-tag size="small" type="danger" v-if="record.summary.errors">{{ record.summary.errors }} 错误</el-tag>
            <el-tag size="small" type="warning" v-if="record.summary.warnings">{{ record.summary.warnings }} 警告</el-tag>
            <el-tag size="small" type="info" v-if="record.summary.infos">{{ record.summary.infos }} 建议</el-tag>
            <span class="item-total">共 {{ record.summary.total }} 个问题</span>
          </div>
          <div class="item-actions">
            <el-button size="small" type="primary" plain @click="$emit('load', record)">
              查看结果
            </el-button>
            <el-button size="small" plain @click="handleExportRecord(record)">
              导出
            </el-button>
            <el-popconfirm title="确定删除这条记录？" @confirm="$emit('delete', record.id)">
              <template #reference>
                <el-button size="small" type="danger" plain>删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
defineProps({
  savedList: { type: Array, required: true },
})

const visible = defineModel('visible', { type: Boolean })

defineEmits(['load', 'delete', 'clearAll'])

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function handleExportRecord(record) {
  const data = {
    fileName: record.fileName,
    savedAt: record.savedAt,
    summary: record.summary,
    results: record.results,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${record.fileName || '论文检查报告'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}
.history-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.history-item {
  cursor: default;
}
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.item-filename {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}
.item-time {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}
.item-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.item-total {
  font-size: 12px;
  color: #909399;
}
.item-actions {
  display: flex;
  gap: 8px;
}
</style>
