import { Label } from "@/components/ui/label";
import type { ModelResponse } from "../useCompletions";
import ModelResponsesPanel from "./ModelResponsesPanel";

type ResponsesSectionProps = {
  responses: Record<string, ModelResponse>;
};

const ResponsesSection = ({ responses }: ResponsesSectionProps) => (
  <div className="space-y-2">
    <Label className="text-slate-200">API responses</Label>
    <ModelResponsesPanel responses={responses} />
  </div>
);

export default ResponsesSection;
