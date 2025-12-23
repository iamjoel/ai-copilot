import { getModelGroups } from "@/lib/model-presets";
import { useEnv } from "@/service/env";

export const useModel = () => {
  const { data, isLoading } = useEnv();
  const modelGroups = getModelGroups(data?.massType as string) || [];
  const allModelOptions = modelGroups.flatMap(group => group.options);
  const defaultModelValue = allModelOptions[0]?.value ?? ""
  const getModelLabel = (value: string) =>
    allModelOptions.find(option => option.value === value)?.label ?? value;

  return {
    isLoading,
    modelGroups,
    allModelOptions,
    defaultModelValue,
    getModelLabel,
  }
}
