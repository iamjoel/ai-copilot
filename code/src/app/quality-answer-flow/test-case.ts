interface TestCase {
  id: string;
  complexity: number;
  category: 'Inform' | 'Understand' | 'Solve' | 'Plan' | 'Decide' | 'Create' | 'Verify';
  userQuery: string;
  expectedMethodology: string | null;
  debugFocus: string;
}

export const DEBUG_TEST_CASES: TestCase[] = [
  {
    id: "TC-001",
    complexity: 1,
    category: "Inform",
    userQuery: "What is the boiling point of water at sea level?",
    expectedMethodology: null,
    debugFocus: "Ensure the system bypasses advanced frameworks for simple facts."
  },
  {
    id: "TC-002",
    complexity: 2,
    category: "Verify",
    userQuery: "I heard that the 'async/await' syntax in JavaScript was introduced in ES2017. Can you confirm this?",
    expectedMethodology: null,
    debugFocus: "Test factual verification without unnecessary complexity."
  },
  {
    id: "TC-003",
    complexity: 3,
    category: "Understand",
    userQuery: "Explain the concept of 'Inflation' and how it affects my daily purchasing power.",
    expectedMethodology: "Pyramid Principle",
    debugFocus: "Check if the output follows a top-down hierarchical structure (Conclusion first)."
  },
  {
    id: "TC-004",
    complexity: 4,
    category: "Plan",
    userQuery: "I want to learn Three.js from scratch to build a 3D portfolio in 3 months. Create a roadmap for me.",
    expectedMethodology: "SMART",
    debugFocus: "Verify if milestones are specific and have clear time-bound metrics."
  },
  {
    id: "TC-005",
    complexity: 5,
    category: "Decide",
    userQuery: "My company is choosing between migrating to AWS or staying on-premise. Which one should we choose?",
    expectedMethodology: "SWOT", // Could also be Six Thinking Hats
    debugFocus: "Assess multi-dimensional reasoning and risk/benefit balance."
  },
  // --- 编程行业 (Software_Engineering) ---
  {
    id: "TC-006",
    complexity: 2,
    category: "Solve",
    // Sub-category: Troubleshoot
    userQuery: "I'm getting a 'ReferenceError: x is not defined' in my JavaScript code. What does it mean?",
    expectedMethodology: null,
    debugFocus: "Programming - Basic troubleshooting with direct explanation."
  },
  {
    id: "TC-007",
    complexity: 4,
    category: "Understand",
    // Sub-category: Mechanism
    userQuery: "How does the React Virtual DOM diffing algorithm work under the hood?",
    expectedMethodology: "First Principles",
    debugFocus: "Programming - Deep dive into mechanisms using structural derivation."
  },

  // --- 大语言模型行业 (LLM_Expert) ---
  {
    id: "TC-008",
    complexity: 5,
    category: "Solve",
    // Sub-category: Optimization
    userQuery: "Our RAG system is too slow. The latency is over 5 seconds. How can we optimize it?",
    expectedMethodology: "5 Whys",
    debugFocus: "LLM - Multi-step root cause analysis for performance bottlenecks."
  },
  {
    id: "TC-009",
    complexity: 4,
    category: "Decide",
    // Sub-category: Multi-Criteria
    userQuery: "Should we use GPT-4o or a fine-tuned Llama-3 for a specialized legal assistant?",
    expectedMethodology: "SWOT",
    debugFocus: "LLM - Trade-off analysis considering cost, privacy, and performance."
  },

  // --- 生命科学行业 (Life_Sciences) ---
  {
    id: "TC-010",
    complexity: 3,
    category: "Verify",
    // Sub-category: Fact-Check
    userQuery: "Can the CRISPR-Cas9 system be used for multi-gene editing in a single session?",
    expectedMethodology: "Pyramid Principle",
    debugFocus: "Life Sciences - Factual validation with high-rigor evidence structure."
  },
  {
    id: "TC-011",
    complexity: 5,
    category: "Plan",
    // Sub-category: Project
    userQuery: "Design a Phase I clinical trial protocol for a new mRNA-based cancer vaccine.",
    expectedMethodology: "SMART",
    debugFocus: "Life Sciences - Complex compliance-heavy planning with specific constraints."
  },

  // --- 产品设计行业 (Product_Design) ---
  {
    id: "TC-012",
    complexity: 3,
    category: "Create",
    // Sub-category: Ideation
    userQuery: "Brainstorm 5 innovative features for a grocery delivery app targeting elderly users.",
    expectedMethodology: "SCAMPER",
    debugFocus: "Product Design - Creative output filtered through user accessibility lens."
  },
  {
    id: "TC-013",
    complexity: 4,
    category: "Understand",
    // Sub-category: Relationship
    userQuery: "Compare 'Material Design' vs 'Fluent Design' in terms of user psychology and adoption.",
    expectedMethodology: "MECE",
    debugFocus: "Product Design - Structured comparison without overlapping attributes."
  }
];
