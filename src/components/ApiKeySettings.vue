<template>
  <el-drawer v-model="visible" title="设置" direction="rtl" size="400px">
    <el-form label-position="top">
      <el-form-item label="Gemini API Key">
        <el-input
          v-model="gemini.apiKey.value"
          :type="showKey ? 'text' : 'password'"
          placeholder="输入你的 Gemini API Key"
        >
          <template #append>
            <el-button @click="showKey = !showKey">
              {{ showKey ? '隐藏' : '显示' }}
            </el-button>
          </template>
        </el-input>
        <div class="tip">API Key 仅存储在浏览器本地，不会上传到任何服务器</div>
      </el-form-item>

      <el-form-item label="API 地址">
        <el-input
          v-model="gemini.baseUrl.value"
          placeholder="自定义 API 地址（留空使用官方默认）"
          clearable
          @clear="gemini.baseUrl.value = gemini.DEFAULT_BASE_URL"
        />
        <div class="tip">默认: {{ gemini.DEFAULT_BASE_URL }}，可填入第三方代理地址</div>
      </el-form-item>

      <el-form-item label="模型选择">
        <el-select v-model="gemini.model.value" style="width: 100%" filterable allow-create>
          <el-option-group label="Gemini 3.x (Preview)">
            <el-option label="Gemini 3.1 Pro Preview" value="gemini-3.1-pro-preview" />
            <el-option label="Gemini 3 Flash Preview" value="gemini-3-flash-preview" />
            <el-option label="Gemini 3.1 Flash-Lite Preview" value="gemini-3.1-flash-lite-preview" />
          </el-option-group>
          <el-option-group label="Gemini 2.5 (Stable)">
            <el-option label="Gemini 2.5 Flash (推荐)" value="gemini-2.5-flash" />
            <el-option label="Gemini 2.5 Pro" value="gemini-2.5-pro" />
            <el-option label="Gemini 2.5 Flash-Lite" value="gemini-2.5-flash-lite" />
          </el-option-group>
          <el-option-group label="Gemini 2.0 (即将退役)">
            <el-option label="Gemini 2.0 Flash" value="gemini-2.0-flash" />
          </el-option-group>
        </el-select>
        <div class="tip">支持手动输入自定义模型名称</div>
      </el-form-item>

      <el-form-item label="每块最大 Token 数">
        <el-input-number
          v-model="maxTokens"
          :min="2000"
          :max="20000"
          :step="1000"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="检查选项">
        <el-switch
          v-model="ignoreFormulaIssues"
          active-text="忽略公式相关问题"
          inactive-text="检查公式相关问题"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSaveAndTest" :loading="testing">
          保存并测试连接
        </el-button>
        <el-tag v-if="gemini.isConnected.value" type="success" class="status-tag">已连接</el-tag>
        <el-tag v-if="gemini.connectionError.value" type="danger" class="status-tag">
          {{ gemini.connectionError.value }}
        </el-tag>
      </el-form-item>
    </el-form>
  </el-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  gemini: { type: Object, required: true },
  maxTokens: { type: Number, required: true },
  ignoreFormulaIssues: { type: Boolean, required: true },
})

const emit = defineEmits(['update:maxTokens', 'update:ignoreFormulaIssues'])

const visible = defineModel('visible', { type: Boolean })
const showKey = ref(false)
const testing = ref(false)

const maxTokens = ref(props.maxTokens)
const ignoreFormulaIssues = ref(props.ignoreFormulaIssues)

watch(maxTokens, (val) => {
  emit('update:maxTokens', val)
})

watch(ignoreFormulaIssues, (val) => {
  emit('update:ignoreFormulaIssues', val)
})

async function handleSaveAndTest() {
  testing.value = true
  props.gemini.saveSettings()
  emit('update:maxTokens', maxTokens.value)
  await props.gemini.testConnection()
  testing.value = false
}
</script>

<style scoped>
.tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.status-tag {
  margin-left: 12px;
}
</style>
