import 'dotenv/config';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

const qiniuKey = process.env.QI_NIU_API_KEY;

const qiniu = createOpenAICompatible({
  name: 'qiniu',                         // 自己起个名字即可
  apiKey: qiniuKey,
  baseURL: 'https://api.qnaigc.com/v1',  // 七牛文档里的 baseURL
});

async function main() {
  const { text } = await generateText({
    // 这里会走 POST https://api.qnaigc.com/v1/chat/completions
    // body 结构与你 curl 的 chat/completions 一致
    // model: qiniu.chatModel('openai/gpt-5'),
    // model: qiniu.chatModel('openai/gpt-5'),
    model: qiniu.chatModel('avatar-deepseek-v3'),
    prompt: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say hello world' },
    ],
  });

  console.log(text);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
