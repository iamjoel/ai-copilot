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
import { ChevronDown, ChevronRight } from "lucide-react";

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
  const [modelsExpanded, setModelsExpanded] = useState(false);

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
        <div className="flex flex-wrap items-center justify-between gap-3 cursor-pointer" onClick={() => setModelsExpanded(!modelsExpanded)}>
          <div className="flex items-center space-x-0.5">
            {modelsExpanded ?
              <ChevronDown size={14} strokeWidth={3} /> :
              <ChevronRight size={14} strokeWidth={3} />
            }
            <Label className="text-slate-200">Model</Label>
          </div>

          <SelectedModelsSummary
            selectedModels={selectedModels}
            className="text-right sm:text-left"
          />
        </div>
        {modelsExpanded && (
          <div
            id="model-selector-panel"
            className="space-y-4"
          >
            <ModelSelector selectedModels={selectedModels} onToggle={toggleModelSelection} />
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-slate-950/30 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Output settings</p>
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
            Apply output rules
          </Label>
          <div className="space-y-2">
            <Label htmlFor="outputLanguage" className="text-slate-200">
              Output language
            </Label>
            <Select
              value={promptConfig.language}
              onValueChange={value => handlePromptConfigChange({ language: value })}
            >
              <SelectTrigger
                id="outputLanguage"
                className="border-white/10 bg-slate-950/60 text-white"
              >
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-950 text-white">
                <SelectItem
                  value="Chinese"
                  className="pl-8 pr-3 text-white focus:bg-slate-900 focus:text-white"
                >
                  Chinese
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
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="prompt" className="text-slate-200">
            Input
          </Label>
          <PresetSelector
            selectedPreset={selectedPreset}
            onChange={handlePresetChange}
            presets={testCases}
          />
        </div>
        <Textarea
          id="prompt"
          placeholder="Describe what you'd like the model to do..."
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
        {loading ? "Sending..." : "Send request"}
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
