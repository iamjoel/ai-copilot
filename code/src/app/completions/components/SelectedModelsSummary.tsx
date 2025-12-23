import { useModel } from "@/hooks/use-model";

type SelectedModelsSummaryProps = {
  selectedModels: string[];
};

const SelectedModelsSummary = ({ selectedModels }: SelectedModelsSummaryProps) => {
  const { getModelLabel } = useModel();

  return (
    <p className="text-xs text-slate-300">
      已选模型：
      {selectedModels.length ? selectedModels.map(getModelLabel).join("，") : "未选择"}
    </p>
  );
};
export default SelectedModelsSummary;
