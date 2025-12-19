import DOMAINS from "./domain";
export type StrategyConfig = {
  methodology: string;
  rules: string;
};

export type SystemConfig = {
  STRATEGIES: Record<string, Record<string, StrategyConfig>>;
  DOMAINS: Record<string, string>;
};

const METHODOLOGIES = {
  PYRAMID: "Pyramid Principle",
  MECE: "MECE",
  FIVE_WHY: "5 Whys",
  SMART: "SMART",
  SWOT: "SWOT",
  SCAMPER: "SCAMPER",
};

const STRATEGY_FACT_FINDING: StrategyConfig = {
  methodology: METHODOLOGIES.PYRAMID,
  rules: "Provide verified facts first, then group supporting details logically."
};

const STRATEGY_INFORM_GENERAL: StrategyConfig = {
  methodology: METHODOLOGIES.PYRAMID,
  rules: "Lead with the core conclusion, then offer concise supporting facts."
};

const STRATEGY_UNDERSTAND_CONCEPTUAL: StrategyConfig = {
  methodology: METHODOLOGIES.MECE,
  rules: "Break the concept into non-overlapping parts with clear relationships."
};

const STRATEGY_UNDERSTAND_GENERAL: StrategyConfig = {
  methodology: METHODOLOGIES.PYRAMID,
  rules: "Explain from core idea to supporting explanations step by step."
};

const STRATEGY_SOLVE_OPTIMIZATION: StrategyConfig = {
  methodology: METHODOLOGIES.FIVE_WHY,
  rules: "Focus on bottlenecks, efficiency metrics, and scalability. Provide 'Before vs After' logic."
};

const STRATEGY_SOLVE_TROUBLESHOOTING: StrategyConfig = {
  methodology: METHODOLOGIES.FIVE_WHY,
  rules: "Trace symptoms to root causes and propose targeted fixes."
};

const STRATEGY_SOLVE_GENERAL: StrategyConfig = {
  methodology: METHODOLOGIES.FIVE_WHY,
  rules: "Identify root causes before proposing solutions."
};

const STRATEGY_PLAN_PROJECT: StrategyConfig = {
  methodology: METHODOLOGIES.SMART,
  rules: "Break down into phases, define KPIs, and identify dependencies."
};

const STRATEGY_PLAN_ROADMAP: StrategyConfig = {
  methodology: METHODOLOGIES.SMART,
  rules: "Define milestones, owners, timelines, and measurable outcomes."
};

const STRATEGY_PLAN_GENERAL: StrategyConfig = {
  methodology: METHODOLOGIES.SMART,
  rules: "Translate goals into specific, measurable, time-bound steps."
};

const STRATEGY_DECIDE_MULTI_CRITERIA: StrategyConfig = {
  methodology: METHODOLOGIES.SWOT,
  rules: "Compare options across strengths, weaknesses, opportunities, and threats."
};

const STRATEGY_DECIDE_GENERAL: StrategyConfig = {
  methodology: METHODOLOGIES.SWOT,
  rules: "Balance internal and external factors for each option."
};

const STRATEGY_CREATE_IDEATION: StrategyConfig = {
  methodology: METHODOLOGIES.SCAMPER,
  rules: "Generate multiple ideas using SCAMPER prompts and select promising ones."
};

const STRATEGY_CREATE_GENERAL: StrategyConfig = {
  methodology: METHODOLOGIES.SCAMPER,
  rules: "Use SCAMPER to expand idea space, then converge with a short shortlist."
};

const STRATEGY_VERIFY_VALIDATION: StrategyConfig = {
  methodology: METHODOLOGIES.FIVE_WHY,
  rules: "Validate assumptions and trace inconsistencies to root causes."
};

const STRATEGY_VERIFY_GENERAL: StrategyConfig = {
  methodology: METHODOLOGIES.FIVE_WHY,
  rules: "Confirm facts and logic before drawing conclusions."
};

const SYSTEM_CONFIG: SystemConfig = {
  STRATEGIES: {
    Inform: {
      "Fact-Finding": STRATEGY_FACT_FINDING,
      General: STRATEGY_INFORM_GENERAL
    },
    Understand: {
      Conceptual: STRATEGY_UNDERSTAND_CONCEPTUAL,
      General: STRATEGY_UNDERSTAND_GENERAL
    },
    Solve: {
      Optimization: STRATEGY_SOLVE_OPTIMIZATION,
      Troubleshooting: STRATEGY_SOLVE_TROUBLESHOOTING,
      General: STRATEGY_SOLVE_GENERAL
    },
    Plan: {
      Project: STRATEGY_PLAN_PROJECT,
      Roadmap: STRATEGY_PLAN_ROADMAP,
      General: STRATEGY_PLAN_GENERAL
    },
    Decide: {
      "Multi-Criteria": STRATEGY_DECIDE_MULTI_CRITERIA,
      General: STRATEGY_DECIDE_GENERAL
    },
    Create: {
      Ideation: STRATEGY_CREATE_IDEATION,
      General: STRATEGY_CREATE_GENERAL
    },
    Verify: {
      Validation: STRATEGY_VERIFY_VALIDATION,
      General: STRATEGY_VERIFY_GENERAL
    }
  },
  DOMAINS
};

export default SYSTEM_CONFIG;
