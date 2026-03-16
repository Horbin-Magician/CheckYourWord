<template>
  <div class="upload-area">
    <el-upload
      drag
      :auto-upload="false"
      accept=".docx"
      :limit="1"
      :on-change="handleFileChange"
      :on-exceed="handleExceed"
      :file-list="fileList"
      ref="uploadRef"
    >
      <el-icon class="upload-icon"><upload-filled /></el-icon>
      <div class="el-upload__text">
        将 .docx 文件拖拽到此处，或<em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">仅支持 .docx 格式的 Word 文档</div>
      </template>
    </el-upload>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['file-selected'])

const fileList = ref([])
const uploadRef = ref(null)

function handleFileChange(uploadFile) {
  const file = uploadFile.raw
  if (!file.name.endsWith('.docx')) {
    ElMessage.error('请上传 .docx 格式的文件')
    fileList.value = []
    return
  }
  fileList.value = [uploadFile]
  emit('file-selected', file)
}

function handleExceed() {
  ElMessage.warning('只能上传一个文件，请先移除当前文件')
}

function reset() {
  fileList.value = []
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

defineExpose({ reset })
</script>

<style scoped>
.upload-area {
  max-width: 600px;
  margin: 0 auto;
}
.upload-icon {
  font-size: 67px;
  color: #c0c4cc;
  margin-bottom: 16px;
}
</style>
