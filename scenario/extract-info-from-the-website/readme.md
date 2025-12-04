# 从网页中提取信息
使用 LLM 从以下 Wikipedia 页面中提取 Hawf 国家保护区（Hawf National Reserve） 的「成立时间（Established）」字段：

🔗 https://en.wikipedia.org/wiki/Hawf_National_Reserve

并对比不同模型在相同任务下的提取效果与稳定性。

## 对比模型列表
### Gemini 系列
* Gemini 2.0 Flash
* Gemini 2.0 Flash-Lite
* Gemini 1.5 Flash
* Gemini 1.5 Pro

## GPT 系列
* GPT-5.1
* GPT-5.1 Mini
* GPT-4o
* GPT-4o Mini

## 任务描述
提取 Wikipedia 页面上的成立时间）。

评估模型在以下方面的表现：
1. 是否提取正确
2. 是否忠实引用页面真实内容（无幻觉）
3. 多次运行的稳定性（可选）
4. 输出结构化数据格式是否一致（可选）

每个模型运行 3 次，最后输出到 result.csv 里。 csv 的列为：
| Model Name       | Run 1 Result | Run 2 Result | Run 3 Result |
|------------------|--------------|--------------|--------------|

## Prompt
```
你是一个高精度的数据提取助手。从 `https://en.wikipedia.org/wiki/Hawf_National_Reserve` 中提取 Hawf 国家保护区的成立时间（Established）。 

请仅返回成立时间的年份，例如 "1990"。如果页面上没有找到相关信息，请回答 "未找到成立时间"。

```

## 技术栈
* Nodejs
* TypeScript
* [AI SDK](https://ai-sdk.dev/docs/introduction)。 用最新稳定 Node.js 版本。

## 使用方式
1. 在本目录下复制 `.env.example` 为 `.env`，填入 `OPENAI_API_KEY` 和 `GOOGLE_API_KEY`（或 `GEMINI_API_KEY`）。
2. 安装依赖：`npm install`
3. 运行：`npm start`
4. 执行结束后会在当前目录生成 `result.csv`，包含各模型的三次提取结果。
