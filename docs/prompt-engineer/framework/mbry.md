## MBRY
Original: [MBRY Prompt Framework](https://jmysu.com/docs/prompt-to-product/17-mbry-prompt-framework)

## 1 Core Principle
- Put the goal (Mission) first in the prompt.
- Avoid starting with background or conversational context.
- Goal-first alignment directs the model to optimize toward the intended outcome.

## 2 Framework Structure — Four Steps (in order)
**M — Mission**
- Clearly state the desired outcome and success criteria.

**B — Background**
- Provide only the necessary context: constraints, inputs, audience, environment.

**R — Route**
- Specify the method, reasoning path, or strategy to follow.
- Explicitly state what to avoid if relevant.

**Y — Yield (Requirements)**
- Define output format, structure, quality bar, and validation rules.

## 3 Why the Order Matters
- Mission anchors the optimization target early.
- Background enriches context without diluting intent.
- Route constrains reasoning and execution choices.
- Yield locks in output shape and acceptance criteria.

## 4 Practical Effects
- Reduces ambiguity in the model’s objective.
- Shrinks the search space for token generation.
- Improves relevance, correctness, and consistency.
- Reduces drift and hallucination.

## 5 Simple Template

Mission:
Produce <output type> that achieves <explicit success criteria>.

Background:
Relevant context, constraints, inputs, audience.

Route:
Use <method / reasoning strategy>; avoid <common pitfalls>.

Yield:
Output in <format>; include <must-have elements>; enforce <checks>.

## 6 Behavioral Guidelines
- Remove polite or conversational fillers (“please”, “could you…”).
- Use direct, imperative verbs.
- Make constraints explicit and testable.

## 7 Why It Works (Mechanism)
- Large language models implicitly optimize toward the earliest and strongest objective signals.
- Placing the Mission first aligns token probability mass around the correct goal.
- Explicit Route guidance limits uncontrolled reasoning paths.
- Clear Yield requirements act as a loss function surrogate, guiding final output selection.

## 8 Example Comparison
**Vague Prompt:**
```
“Can you help me write a summary of the latest AI research papers? Please make it concise and informative.”
```

**MBRY Prompt:**
```
Mission:
Produce a concise, information-dense summary of the most important AI research papers published in the last 6 months, highlighting each paper’s key findings and practical/theoretical implications.

Background:
- Source scope: Top-tier AI conferences only: NeurIPS, ICML, CVPR.
- Time window: Last 6 months (relative to today).
- Audience: Practitioners and researchers who want fast signal, minimal hype.

Route:
1. Collect candidate papers from official conference proceedings (or official author/preprint pages if needed).
2. For each selected paper, use extractive summarization:
   - Prefer exact claims from the abstract, main contributions, and results sections.
   - Capture concrete numbers, benchmarks, or comparisons when present.
3. Avoid generic statements (e.g., “improves performance”, “novel approach”) unless you include the specific what/where/how much.
4. If a claim cannot be verified from the paper text, omit it.

Yield:
- Output format: Bulleted list.
- Each bullet must include:
  - Title
  - Authors
  - Venue + year
  - 2–4 extractive key points (verbatim or near-verbatim, clearly attributable)
  - 1 short implication line (practical or theoretical), grounded in the key points
  - Link to the official paper/proceedings page (or arXiv if official not available)
- Factuality rules:
  - No invented results, datasets, or comparisons.
  - If uncertain, write: “Not confirmed from the paper.”
```

## One-Sentence Summary
MBRY works because it aligns the model’s implicit optimization target early, constrains reasoning paths, and enforces output criteria—turning vague prompts into controllable, product-grade instructions.
