function UiSteps({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-base font-semibold">步骤</div>
      <div className="mt-2 prose prose-sm max-w-none">{children}</div>
    </div>
  );
}

export default UiSteps;
