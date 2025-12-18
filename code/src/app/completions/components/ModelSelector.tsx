import { MODEL_GROUPS } from "@/lib/model-presets";

type ModelSelectorProps = {
  selectedModels: string[];
  onToggle: (value: string) => void;
};

const ModelSelector = ({ selectedModels, onToggle }: ModelSelectorProps) => (
  <div className="space-y-4">
    {MODEL_GROUPS.map(group => (
      <div key={group.providerLabel} className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{group.providerLabel}</p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {group.options.map(option => {
            const isSelected = selectedModels.includes(option.value);
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition ${
                  isSelected
                    ? "border-blue-400/80 bg-blue-500/10 text-white"
                    : "border-white/10 bg-slate-950/30 text-slate-200 hover:border-white/30"
                }`}
              >
                <input
                  type="checkbox"
                  name="models"
                  value={option.value}
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => onToggle(option.value)}
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

export default ModelSelector;
