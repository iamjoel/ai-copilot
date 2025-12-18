import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CompletionsController } from "../useCompletions";
import CompletionsForm from "./CompletionsForm";
import ErrorNotice from "./ErrorNotice";
import ResponsesSection from "./ResponsesSection";

type CompletionsRequestCardProps = {
  controller: CompletionsController;
};

const CompletionsRequestCard = ({ controller }: CompletionsRequestCardProps) => (
  <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
    <CardHeader>
      <CardTitle>发送补全请求</CardTitle>
      <CardDescription className="text-slate-200">自由切换模型，快速比较回复风格。</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <CompletionsForm controller={controller} />
      {controller.error ? <ErrorNotice message={controller.error} /> : null}
      <ResponsesSection responses={controller.modelResponses} />
    </CardContent>
  </Card>
);

export default CompletionsRequestCard;
