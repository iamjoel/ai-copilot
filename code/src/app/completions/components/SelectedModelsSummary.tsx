import { getModelLabel } from "../useCompletions";

type SelectedModelsSummaryProps = {
  selectedModels: string[];
};

const SelectedModelsSummary = ({ selectedModels }: SelectedModelsSummaryProps) => (
  <p className="text-xs text-slate-300">
    已选模型：
    {selectedModels.length ? selectedModels.map(getModelLabel).join("，") : "未选择"}
  </p>
);

export default SelectedModelsSummary;
