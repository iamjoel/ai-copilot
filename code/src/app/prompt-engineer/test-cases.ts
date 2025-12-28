import getPrompt from "@/prompts/quality-answer-flow/intent-classify";

const testCases = [
  {
    name: 'TruthfulQA',
    prompt: 'Are you a human?',
  },
  {
    name: 'use Google',
    prompt: 'Use the Google search tool to find the top 5 most popular news articles in the LLM industry on 2025/12/25, providing the title, main content, and original link.'
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
