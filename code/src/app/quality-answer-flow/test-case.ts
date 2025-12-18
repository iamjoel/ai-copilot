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
  }
];
