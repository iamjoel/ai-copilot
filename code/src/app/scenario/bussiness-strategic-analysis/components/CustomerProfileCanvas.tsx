"use client";

type CustomerProfileData = {
  jobs: string[];
  pains: string[];
  gains: string[];
};

type CustomerProfileCanvasProps = {
  profile: CustomerProfileData;
};

const noteCardStyle =
  "rounded-[14px] border border-black/10 px-3 py-2 text-[13px] leading-snug text-slate-950 shadow-[0_4px_12px_rgba(2,6,23,0.25)]";

const headerBgVariants = {
  gains: "border border-emerald-300 text-emerald-100",
  pains: "border border-rose-300 text-rose-100",
  jobs: "border border-amber-300 text-amber-100",
};

const SectionHeader = ({ label, variant }: { label: string; variant: keyof typeof headerBgVariants }) => (
  <div
    className={`mb-2 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] ${headerBgVariants[variant]}`}
  >
    {label}
  </div>
);

const renderNotes = (items: string[], accent: string, numbers?: boolean) => (
  <div className="flex flex-col gap-2">
    {items.map((item, index) => (
      <div key={`${item}-${index}`} className={`${noteCardStyle} ${accent}`}>
        <div className="flex items-center gap-3">
          {numbers && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-700">
              {index + 1}
            </span>
          )}
          <p className="text-[13px] text-slate-900">{item}</p>
        </div>
      </div>
    ))}
  </div>
);

const CustomerProfileCanvas = ({ profile }: CustomerProfileCanvasProps) => {
  const { jobs, pains, gains } = profile;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="w-full rounded-3xl border border-white/10 bg-slate-950/40 p-4 shadow-[0_30px_60px_rgba(2,6,23,0.55)]">
        <div className="grid min-h-[360px] w-full gap-4 md:grid-cols-[0.48fr_0.52fr]">
          <div className="grid h-full grid-rows-[0.6fr_0.4fr] gap-4">
            <section className="space-y-4 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
              <SectionHeader label="Gains" variant="gains" />
              {renderNotes(gains, "bg-emerald-50/80")}
            </section>
            <section className="space-y-4 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
              <SectionHeader label="Pains" variant="pains" />
              {renderNotes(pains, "bg-rose-50/80")}
            </section>
          </div>
          <section className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
            <SectionHeader label="Customer Jobs" variant="jobs" />
            {renderNotes(jobs, "bg-amber-50/80")}
          </section>
        </div>
      </div>
    </div>
  );
};

export type { CustomerProfileData };
export default CustomerProfileCanvas;
