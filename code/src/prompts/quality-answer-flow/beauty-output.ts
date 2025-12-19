const beautifyOutput = `
You must wrap specific structural data in custom containers to enable rich UI rendering.

1. **Card Layout** (For parallel options or SWOT):
  Use \`:::cards\` container. Each card starts with \`---\`.
  Example:
  :::cards
  ### Option A
  Description here...
  ---
  ### Option B
  Description here...
  :::

2. **Step/Process Layout** (For Plans or 5-Whys):
  Use \`:::steps\` container for sequential logic.
  Example:
  :::steps
  1. **Analyze**: Initial root cause.
  2. **Verify**: Deep dive logic.
  :::

3. **Data Visualization** (For stats or metrics):
  Use \`:::chart{type="bar"}\` for tables you want to visualize.
  Example:
  :::chart{type="bar" title="Performance Comparison"}
  | Metric | Tool A | Tool B |
  | :--- | :--- | :--- |
  | Latency | 200ms | 450ms |
  :::

# Response Style
- Use standard Markdown for prose.
- Use the UI Protocols above for any structured lists or comparisons.
`.trim();

export default beautifyOutput;
