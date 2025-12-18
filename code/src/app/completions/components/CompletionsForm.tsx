import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import testCases from "../test-cases";
import type { CompletionsController } from "../useCompletions";
import ModelSelector from "./ModelSelector";
import PresetSelector from "./PresetSelector";
import SelectedModelsSummary from "./SelectedModelsSummary";

type CompletionsFormProps = {
  controller: CompletionsController;
};

const CompletionsForm = ({
  controller: {
    prompt,
    handlePromptChange,
    selectedPreset,
    handlePresetChange,
    selectedModels,
    toggleModelSelection,
    loading,
    handleSubmit,
  },
}: CompletionsFormProps) => (
  <form onSubmit={handleSubmit} className="space-y-6">
    <div className="space-y-4">
      <Label className="text-slate-200">模型</Label>
      <ModelSelector selectedModels={selectedModels} onToggle={toggleModelSelection} />
    </div>

    <div className="space-y-4">
      <PresetSelector
        selectedPreset={selectedPreset}
        onChange={handlePresetChange}
        presets={testCases}
      />
      <Label htmlFor="prompt" className="text-slate-200">
        输入文本
      </Label>
      <Textarea
        id="prompt"
        placeholder="描述你想让模型完成的内容..."
        value={prompt}
        onChange={event => handlePromptChange(event.target.value)}
        className="bg-slate-950/60 text-white placeholder:text-slate-400"
      />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SelectedModelsSummary selectedModels={selectedModels} />
      <Button
        type="submit"
        size="lg"
        disabled={loading || !prompt.trim() || selectedModels.length === 0}
      >
        {loading ? "发送中..." : "发送请求"}
      </Button>
    </div>
  </form>
);

export default CompletionsForm;
