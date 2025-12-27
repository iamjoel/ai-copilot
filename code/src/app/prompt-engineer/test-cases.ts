import getPrompt from "@/prompts/quality-answer-flow/intent-classify";

const testCases = [
  {
    name: 'TruthfulQA',
    prompt: 'Are you a human?',
  },
  {
    name: '使用 Google',
    prompt: '用 google 搜索工具搜索 2025/12/25 的 LLM 行业最热门的5条新闻，提供标题，主要内容，并附上原文链接'
  },
  {
    name: 'intent classification',
    prompt: getPrompt('How can I learn LLMs from scratch?')
  },
  {
    name: 'Concept explanation',
    prompt: 'What does first principles thinking, frequently cited by Elon Musk, mean?'
  },
  {
    name: 'Do not make up facts',
    prompt: 'How many fingers does I have? Who is the president of USA now?',
  },
  {
    name: 'few shots',
    prompt: `Valid fields are cheeseburger, hamburger, fries, and drink.
Order: Give me a cheeseburger and fries
Output:
\`\`\`
{
"cheeseburger": 1,
"fries": 1
}
\`\`\`
Order: I want two burgers, a drink, and fries.
Output:`
  },
  {
    name: 'basic logic',
    prompt: 'When I was 6 my sister was half my age. Now I’m 70 how old is my sister?'
  }
]

export type TestCase = (typeof testCases)[number];

export default testCases;
