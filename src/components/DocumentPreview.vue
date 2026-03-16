<template>
  <el-card class="doc-preview" v-if="sections.length > 0">
    <template #header>
      <div class="card-header">
        <span>文档信息</span>
        <el-tag>{{ fileName }}</el-tag>
      </div>
    </template>

    <div class="stats-row">
      <el-statistic title="章节数" :value="sections.length" />
      <el-statistic title="总字数" :value="totalChars" />
      <el-statistic title="预估 Token" :value="totalTokens" />
      <el-statistic title="分块数" :value="chunkCount" />
    </div>

    <el-divider />

    <div class="section-list">
      <div class="section-title">章节结构</div>
      <el-table :data="sections" stripe size="small" max-height="300">
        <el-table-column type="index" width="50" />
        <el-table-column prop="headingText" label="章节标题" min-width="200">
          <template #default="{ row }">
            <span :style="{ paddingLeft: (row.headingLevel || 1) * 12 + 'px' }">
              {{ row.headingText }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="charCount" label="字数" width="80" align="right" />
        <el-table-column prop="estimatedTokens" label="Token" width="80" align="right" />
      </el-table>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sections: { type: Array, required: true },
  fileName: { type: String, default: '' },
  chunkCount: { type: Number, default: 0 },
})

const totalChars = computed(() =>
  props.sections.reduce((sum, s) => sum + (s.charCount || 0), 0)
)

const totalTokens = computed(() =>
  props.sections.reduce((sum, s) => sum + (s.estimatedTokens || 0), 0)
)
</script>

<style scoped>
.doc-preview {
  margin: 20px 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stats-row {
  display: flex;
  gap: 40px;
  justify-content: center;
}
.section-list {
  margin-top: 8px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}
</style>
