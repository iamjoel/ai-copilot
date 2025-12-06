# Token, 计费 和 Rate Limits

Token 分为 Input Token 和 Output Token。Input Token 是指发送给模型的文本所包含的 token 数量，而 Output Token 则是模型生成的文本所包含的 token 数量。不同的语言和符号会被分解成不同数量的 token。例如，英文单词通常对应一个或多个 token，而中文字符通常对应一个 token。

## Gemini 的费用
| 模型名称              | 调用方式       | 输入价格（每 1百万 tokens） | 输出价格（每 1百万 tokens） | 
|----------------------|----------------|---------------------------|---------------------------|
| Gemini 3 Pro       | 标准       | $2（≤ 20万 输入）      | $12（≤ 20万 输出）        |
|                      |                | $4（> 20万 输入）      | $18（> 20万 输出）        |
| Gemini 3 Pro       | 批量      | $1（≤ 20万 输入）      | $6（≤ 20万 输出）        |
|                      |                | $2（> 20万 输入）      | $9（> 20万 输出）        |
| Gemini 2.5 Pro       | 标准       | $1.25（≤ 20万 输入）      | $10（≤ 20万 输出）        |
|                      |                | $2.50（> 20万 输入）      | $15（> 20万 输出）        |
| Gemini 2.5 Flash     | 标准       | $0.30                     | $2.50                     |
|                      | 批量          | $0.15                    | $1.25                    |
| Gemini 2.5 Flash-Lite| 标准       | $0.10                     | $0.40                     |
|                      | 批量          | $0.05                    | $0.20                     |


网址上下文 按各模型的输入 token 价格收费。
Google 搜索 免费使用 1,500 RPD（Flash 和 Flash-Lite 共用此限额）。
然后，每 1,000 次接地提示收费 35 美元

[详情](https://ai.google.dev/gemini-api/docs/pricing?hl=zh-cn)

## OpenAI 计费
OpenAI 的模型按使用的 token 数量计费。不同的模型有不同的定价结构，通常分为输入 token 和输出 token 两部分。例如，GPT-4 和 GPT-3.5 Turbo 都有各自的每千 token 价格。你可以参考 [OpenAI 的定价页面](https://openai.com/pricing) 获取最新的价格信息。


## Rate Limits
不同的模型和服务提供商对 API 调用有不同的速率限制（Rate Limits）。这些限制通常以每分钟或每秒允许的请求次数来衡量。具体的限制取决于你所使用的模型和你的账户类型（例如，免费账户和付费账户可能有不同的限制）。
