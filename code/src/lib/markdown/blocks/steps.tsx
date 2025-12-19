function UiSteps({ children }: { children?: React.ReactNode }) {
  return (
    <div className="my-3 rounded-2xl border p-4">
      <div className="text-base font-semibold">Steps</div>
      <details className="mt-2">
        <summary className="cursor-pointer select-none text-sm text-muted-foreground">
          Click to expand/collapse
        </summary>
        <div className="mt-2 prose prose-sm max-w-none">{children}</div>
      </details>
    </div>
  );
}

export default UiSteps;
