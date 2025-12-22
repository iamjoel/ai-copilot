import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import testCases from "../test-cases";
import type { CompletionsController } from "../useCompletions";
import ErrorNotice from "./ErrorNotice";
import ModelSelector from "./ModelSelector";
import PresetSelector from "./PresetSelector";
import ResponsesSection from "./ResponsesSection";
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
    promptConfig,
    handlePromptConfigChange,
    loading,
    handleSubmit,
    error,
    modelResponses,
  },
}: CompletionsFormProps) => {
  const [isResizable, setIsResizable] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const updateLayout = () => {
      setIsResizable(mediaQuery.matches);
    };

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);

    return () => {
      mediaQuery.removeEventListener("change", updateLayout);
    };
  }, []);

  const leftPanel = (
    <section className="space-y-6 lg:pr-4">
      <div className="space-y-4">
        <Label className="text-slate-200">模型</Label>
        <ModelSelector selectedModels={selectedModels} onToggle={toggleModelSelection} />
        <SelectedModelsSummary selectedModels={selectedModels} />
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-slate-950/30 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">输出配置</p>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
          <Label
            htmlFor="applyOutputRules"
            className="flex items-center gap-3 text-sm text-slate-200"
          >
            <input
              id="applyOutputRules"
              type="checkbox"
              checked={promptConfig.applyOutputRules}
              onChange={event =>
                handlePromptConfigChange({ applyOutputRules: event.target.checked })
              }
              className="h-4 w-4 rounded border-slate-400 bg-slate-950 text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            应用输出规则
          </Label>
          <div className="space-y-2">
            <Label htmlFor="outputLanguage" className="text-slate-200">
              输出语言
            </Label>
            <Select
              value={promptConfig.language}
              onValueChange={value => handlePromptConfigChange({ language: value })}
            >
              <SelectTrigger
                id="outputLanguage"
                className="border-white/10 bg-slate-950/60 text-white"
              >
                <SelectValue placeholder="选择语言" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-950 text-white">
                <SelectItem
                  value="中文"
                  className="pl-8 pr-3 text-white focus:bg-slate-900 focus:text-white"
                >
                  中文
                </SelectItem>
                <SelectItem
                  value="English"
                  className="pl-8 pr-3 text-white focus:bg-slate-900 focus:text-white"
                >
                  English
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );

  const rightPanel = (
    <section className="space-y-6 lg:pl-4">
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

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading || !prompt.trim() || selectedModels.length === 0}
      >
        {loading ? "发送中..." : "发送请求"}
      </Button>

      {error ? <ErrorNotice message={error} /> : null}
      <ResponsesSection responses={modelResponses} />
    </section>
  );

  if (!isResizable) {
    return (
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        {leftPanel}
        {rightPanel}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <ResizablePanelGroup direction="horizontal" className="w-full">
        <ResizablePanel defaultSize={42} minSize={28} className="min-w-0">
          {leftPanel}
        </ResizablePanel>
        <ResizableHandle withHandle className="mx-2" />
        <ResizablePanel defaultSize={58} minSize={32} className="min-w-0">
          {rightPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
    </form>
  );
};

export default CompletionsForm;
