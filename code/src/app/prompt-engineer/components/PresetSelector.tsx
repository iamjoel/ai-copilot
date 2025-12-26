import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TestCase } from "../test-cases";
import { CUSTOM_PROMPT_VALUE } from "../useCompletions";

type PresetSelectorProps = {
  selectedPreset: string;
  onChange: (value: string) => void;
  presets: TestCase[];
};

const PresetSelector = ({ selectedPreset, onChange, presets }: PresetSelectorProps) => (
  <div className="flex items-center space-x-1">
    <Label className="text-slate-200">Templates</Label>
    <Select value={selectedPreset} onValueChange={onChange}>
      <SelectTrigger className="h-11 border-white/10 bg-slate-950/60 text-slate-100 focus:ring-blue-500 focus:ring-offset-0">
        <SelectValue placeholder="Choose a prompt example" />
      </SelectTrigger>
      <SelectContent className="border-white/10 bg-slate-900 text-slate-100">
        <SelectItem
          value={CUSTOM_PROMPT_VALUE}
          className="pl-8 pr-3 text-slate-100 focus:bg-slate-800 focus:text-white"
        >
          Custom input
        </SelectItem>
        <SelectSeparator className="bg-white/10" />
        {presets.map(testCase => (
          <SelectItem
            key={testCase.name}
            value={testCase.name}
            className="pl-8 pr-3 text-slate-100 focus:bg-slate-800 focus:text-white"
          >
            {testCase.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default PresetSelector;
