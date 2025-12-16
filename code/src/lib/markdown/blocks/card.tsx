import React from "react";

function UiCard(props: {
  title?: string;
  subtitle?: string;
  icon?: string;
  children?: React.ReactNode;
}) {
  const { title, subtitle, icon, children } = props;
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {icon ? <div className="text-xl">{icon}</div> : null}
        <div className="min-w-0">
          {title ? <div className="text-base font-semibold">{title}</div> : null}
          {subtitle ? (
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
      </div>
      {children ? <div className="mt-3 prose prose-sm max-w-none">{children}</div> : null}
    </div>
  );
}

export default UiCard;
