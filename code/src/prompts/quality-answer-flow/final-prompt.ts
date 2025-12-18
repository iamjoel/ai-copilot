import STRATEGY_LIBRARY from "./strategy-libs";

function composeFinalPrompt({
  category,
  complexity,
  methodology,
  userQuery
}: {
  category: string,
  complexity: number,
  methodology: string,
  userQuery: string
}): string {
  const strategy = STRATEGY_LIBRARY[methodology] || {
    constraints: "- Provide a direct and professional answer.",
    recommendedTone: "Direct"
  };

  return `
# Role
You are an expert consultant specialized in ${category}.

# Operational Strategy
${strategy.constraints}
${complexity < 3 ? "- Keep the response concise and skip framework meta-talk." : ""}

# User Query
${userQuery}

# Final Response Instructions
- Use a ${strategy.recommendedTone} tone.
- Strictly adhere to the logic of the framework if provided.
- Ensure clarity and actionable insights.

# Response:
`.trim();
}

export default composeFinalPrompt;

