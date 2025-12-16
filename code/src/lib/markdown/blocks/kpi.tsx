function UiKpi(props: {
  label?: string;
  value?: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
}) {
  const { label, value, delta, trend } = props;
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-muted-foreground">{label ?? ""}</div>
      <div className="mt-1 text-2xl font-semibold">{value ?? ""}</div>
      {delta ? (
        <div className="mt-1 text-sm">
          <span className="mr-1">{arrow}</span>
          <span>{delta}</span>
        </div>
      ) : null}
    </div>
  );
}

export default UiKpi;
