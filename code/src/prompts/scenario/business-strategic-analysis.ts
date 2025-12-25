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

Customer Profile guidance:
- Provide ~5 concise entries for each of the \`jobs\`, \`pains\`, and \`gains\` arrays; avoid numbered lists.
- Keep each description extremely tight. Use short nouns or verbs that convey the core item.
- Focus every entry on the current customer goal you were given.

Value Curve guidance:
- Define exactly five core \`dimensions\` such as "Customer Insight", "Operational Speed", etc.
- Include five \`curves\`, each representing a meaningful competitor or strategic archetype; the first curve must be named "Your Focus Offering" and feature a unique \`userTag\`.
- Each \`values\` array must match the \`dimensions\` length and use the letters [O,F,S,W,X] where O=over-delivery, F=strong satisfaction, S=industry standard, W=weak coverage, X=abandoned.
- Supply a \`userTag\` like "Tesla: Geek Pioneer" and a single-sentence \`userNote\` for every curve to capture who the curve represents.
- Treat the value curve as a linear line chart; avoid any smoothing.

General rules:
- Stay focused on the customer goal and keep the JSON clean.
- Use the provided customer goal literally when framing responses.
- Make sure the JSON object is the only content in the response; no extra Markdown or explanations.
- Summary: capture the promised data for the two UI components above.
`.trim();

const buildStrategicPrompt = (goal: string) => {
  const normalizedGoal = goal.trim() || "Customer aims to identify differentiated growth opportunities in a highly competitive market";
  const userQuery = `Customer Objective: ${normalizedGoal}\n\n${OUTPUT_TEMPLATE}`;
  return composeFinalPrompt({
    ...BASE_CONTEXT,
    userQuery,
  });
};

export default buildStrategicPrompt;
