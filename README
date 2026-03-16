# CheckYourWord - 毕业论文检查润色助手

使用 Gemini 大模型辅助检查、润色毕业论文的纯前端网站。上传 .docx 文件后，AI 自动分析并给出修改建议。

## 主要需求

一个使用Gemini大模型辅助检查、润色毕业论文的网站，有前端网页用于上传文件，展示需要修改、修改内容、修改建议等信息。

## 次要需求

1、使用Vue+Vite；
2、可以自动规划提交给AI的内容范围以充分利用AI性能；

## 技术栈

- **前端框架**: Vue 3 (Composition API + `<script setup>`) + Vite
- **UI 组件库**: Element Plus（按需自动导入）
- **DOCX 解析**: mammoth.js（浏览器端 .docx → HTML）
- **AI 调用**: @google/genai（Gemini SDK，纯前端直接调用）
- **状态管理**: Vue 3 Composables（ref/reactive），无需 Pinia

## 项目结构

```
CheckYourWord/
├── index.html                  # 入口 HTML
├── package.json
├── vite.config.js              # Vite 配置 + Element Plus 按需导入
├── src/
│   ├── main.js                 # Vue 应用入口
│   ├── App.vue                 # 根组件，整体布局和流程控制
│   ├── components/
│   │   ├── ApiKeySettings.vue  # 设置抽屉：API Key / 模型 / 分块大小
│   │   ├── FileUploader.vue    # 拖拽上传 .docx
│   │   ├── DocumentPreview.vue # 文档结构预览（章节、字数、Token）
│   │   ├── ProgressPanel.vue   # 逐块检查进度
│   │   ├── ResultCard.vue      # 单条修改建议卡片
│   │   └── ResultsDisplay.vue  # 结果列表 + 过滤 + 导出
│   ├── composables/
│   │   ├── useDocxParser.js    # mammoth 解析 .docx
│   │   ├── useChunker.js       # 智能分块（按标题/段落，默认 6000 tokens/块）
│   │   ├── useGemini.js        # Gemini API 封装（限流 / 重试 / 结构化输出）
│   │   └── useProofreading.js  # 流程编排：解析 → 分块 → 检查 → 收集结果
│   ├── utils/
│   │   ├── tokenEstimator.js   # Token 数估算（中英文分别处理）
│   │   ├── htmlSplitter.js     # HTML 按标题层级拆分为章节
│   │   └── prompts.js          # Gemini 提示词模板 + JSON Schema
│   └── styles/
│       └── global.css
```

## 使用方法

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build
```

启动后：
1. 点击右上角设置按钮，输入 Gemini API Key 并测试连接
2. 拖拽上传 .docx 论文文件
3. 查看文档结构预览，点击「开始检查」
4. 查看检查结果，支持按严重度/分类过滤，可导出 Markdown 报告

## 核心流程

```
上传 .docx → mammoth 解析为 HTML → 按标题层级拆分章节
  → Token 估算 → 智能分块（合并小节/拆分大节）
  → 逐块调用 Gemini API（限流 6s 间隔，失败重试 2 次）
  → 结构化 JSON 输出 → 实时展示修改建议 → 可导出报告
```

## AI 检查维度

| 分类 | 说明 |
|------|------|
| grammar | 语法错误 |
| style | 学术写作风格 |
| logic | 逻辑连贯性 |
| terminology | 术语一致性 |
| structure | 段落结构 |
| formatting | 格式问题 |

每条建议包含严重度：error（必须修改）、warning（建议修改）、info（可选改进）
