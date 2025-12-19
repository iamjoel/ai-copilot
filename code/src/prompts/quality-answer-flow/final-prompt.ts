import beautifyOutput from "./beauty-output";
import SYSTEM_CONFIG from "./strategy-libs";

function composeFinalPrompt({
  category,
  sub_category,
  domain,
  complexity,
  methodology,
  userQuery
}: {
  category: string,
  sub_category: string,
  domain: string,
  complexity: number,
  methodology: string,
  userQuery: string
}): string {
  const normalizedCategory = category.trim() || "General";
  const normalizedSubCategory = sub_category.trim() || "General";
  const normalizedDomain = domain.trim();
  const domainContext =
    SYSTEM_CONFIG.DOMAINS[normalizedDomain as keyof typeof SYSTEM_CONFIG.DOMAINS] ||
    "Context: General professional reasoning and clear communication.";
  const subStrategy =
    SYSTEM_CONFIG.STRATEGIES[normalizedCategory]?.[normalizedSubCategory] ||
    SYSTEM_CONFIG.STRATEGIES[normalizedCategory]?.General;
  const resolvedMethodology = methodology || subStrategy?.methodology || "General";
  const rules = subStrategy?.rules || "Provide a clear, structured, and professional answer.";

  return `
# Role
You are a world-class expert in ${normalizedDomain || "General Fields"}.

# Expert Context
${domainContext}

# Operational Strategy (Methodology: ${resolvedMethodology})
1. Primary Goal: Address the user's query as a ${normalizedCategory} (${normalizedSubCategory}) task.
2. Structural Constraint: You MUST use the ${resolvedMethodology} framework.
3. Specific Rules: ${rules}
${complexity >= 4 ? "4. Depth Requirement: This is a high-complexity task. Provide deep reasoning and cross-functional insights." : ""}

# User Query
${userQuery}

# Final Response Instructions
- Use professional terminology suitable for ${normalizedDomain || "General Fields"}.
- Ensure the ${resolvedMethodology} structure is clearly visible (e.g., using headings).
- Maintain a tone that is ${complexity > 3 ? "analytical and thorough" : "direct and concise"}.

# UI Implementation Protocols
${beautifyOutput}

# Execution Starts:
`.trim();
}

export default composeFinalPrompt;
