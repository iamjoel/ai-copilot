import composeFinalPrompt from "@/prompts/quality-answer-flow/final-prompt";

const BASE_CONTEXT = {
  category: "Plan",
  sub_category: "Roadmap",
  domain: "Business Strategy",
  complexity: 4,
  methodology: "Value Proposition Canvas & Value Curve",
};

const CODE_SAMPLE = [
  "```json",
  "{",
  '  "customerProfile": {',
  '    "jobs": ["..."],',
  '    "pains": ["..."],',
  '    "gains": ["..."]',
  "  },",
  '  "valueCurve": {',
  '    "dimensions": ["..."],',
  '    "curves": [',
  "      {",
  '        "name": "Competitor or Offering",',
  '        "values": ["O","S","W"],',
  '        "userTag": "Label: descriptor",',
  '        "userNote": "One-sentence rationale"',
  "      }",
  "    ]",
  "  }",
  "}",
  "```",
].join("\n");

const OUTPUT_TEMPLATE = `
Please return a single JSON object (without additional commentary) that feeds the two custom components.
The JSON must follow this structure:
${CODE_SAMPLE}
- Provide ~5 concise items for each of jobs, pains, and gains (no numbered lists) describing the customer context.
- Define five core dimensions for the value curve such as "Customer Insight", "Operational Speed", etc.
- Include five curves, each representing a meaningful competitor or strategic archetype (one entry should reflect the customer's focus offering).
- Each values array must align with dimensions length and use the letters [O,F,S,W,X] where O=over-delivery, F=strong satisfaction, S=industry standard, W=weak coverage, X=abandoned.
- Supply a userTag like "Tesla: 极客先锋" and a single-sentence userNote for every curve to capture the representative user group.
- Value Curve is a linear line chart; avoid any smoothing.
- Customer Profile values will render inside a segmented circular canvas (right half for jobs, left bottom quadrant for pains, left top quadrant for gains).
- Token: stay focused on the current customer goal and keep the JSON clean.
- Make sure the JSON object is the only content in the response.
- Do not add extra Markdown beyond the code block.
- Use the provided customer goal literally when framing recommendations.
- Tag the customer's focus offering by naming the first curve "Your Focus Offering" with a distinct userTag.
- Summary: capture the promised data for the two UI components above.
- Output is for parsing only; no explanations.
`.trim();

const buildStrategicPrompt = (goal: string) => {
  const normalizedGoal = goal.trim() || "客户希望在竞争激烈的市场中找出差异化增长机会";
  const userQuery = `客户目标：${normalizedGoal}\n\n${OUTPUT_TEMPLATE}`;
  return composeFinalPrompt({
    ...BASE_CONTEXT,
    userQuery,
  });
};

export default buildStrategicPrompt;
