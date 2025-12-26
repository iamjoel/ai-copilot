import { useModel } from "@/hooks/use-model";

type SelectedModelsSummaryProps = {
  selectedModels: string[];
  className?: string;
};

const SelectedModelsSummary = ({ selectedModels, className }: SelectedModelsSummaryProps) => {
  const { getModelLabel } = useModel();

  return (
    <p className={`text-xs text-slate-300 ${className ?? ""}`}>
      Selected:{" "}
      {selectedModels.length ? selectedModels.map(getModelLabel).join(", ") : "None selected"}
    </p>
  );
};
export default SelectedModelsSummary;
