/**
 * 定义策略库的结构
 */
interface StrategyConfig {
  constraints: string;
  recommendedTone: 'Direct' | 'Analytical' | 'Creative';
}

const STRATEGY_LIBRARY: Record<string, StrategyConfig> = {
  "Pyramid Principle": {
    constraints: `
- Structure: Start with the "Core Conclusion" first.
- Support: Group supporting arguments into 3 distinct logical categories.
- Flow: Ensure a top-down hierarchy where each level summarizes the ideas below it.`,
    recommendedTone: 'Analytical'
  },

  "SMART Criteria": {
    constraints: `
- Audit: Validate each goal against Specific, Measurable, Achievable, Relevant, and Time-bound criteria.
- Requirement: If any element is missing in the user's query, explicitly ask for clarification.`,
    recommendedTone: 'Direct'
  },

  "5 Whys": {
    constraints: `
- Process: Demonstrate the iterative "Why" questioning process (at least 3-5 levels).
- Goal: Provide the final recommendation only after identifying the root cause.`,
    recommendedTone: 'Analytical'
  },

  "SWOT": {
    constraints: `
- Layout: Use clear headings or a structured list for Strengths, Weaknesses, Opportunities, and Threats.
- Focus: Balance internal factors (S/W) with external factors (O/T).`,
    recommendedTone: 'Analytical'
  },


  "Six Thinking Hats": {
    constraints: `
  - Process: Analyze the problem through 6 perspectives: White (Facts), Red (Emotions), Black (Risks), Yellow (Benefits), Green (Creativity), and Blue (Control).
  - Structure: Dedicate a brief paragraph to each relevant "Hat".`,
    recommendedTone: 'Analytical'
  },

  "MECE": {
    constraints: `
- Breakdown: Decompose the problem into mutually exclusive and collectively exhaustive components.
- Clarity: Avoid overlaps and ensure all aspects of the problem are covered.`,
    recommendedTone: 'Analytical'
  },

  "SCAMPER": {
    constraints: `
- Technique: Apply the SCAMPER checklist (Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse) to generate ideas.
- Creativity: Encourage out-of-the-box thinking while remaining relevant to the user's query.`,
    recommendedTone: 'Creative'
  },

  "First Principles": {
    constraints: `
- Foundation: Deconstruct complex problems into their most basic elements.
- Reconstruction: Build up solutions from these fundamental truths rather than relying on analogies or assumptions.`,
    recommendedTone: 'Analytical'
  }
};

export default STRATEGY_LIBRARY;
