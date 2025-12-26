import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CompletionsController } from "../useCompletions";
import CompletionsForm from "./CompletionsForm";

type CompletionsRequestCardProps = {
  controller: CompletionsController;
};

const CompletionsRequestCard = ({ controller }: CompletionsRequestCardProps) => (
  <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
    <CardContent className="space-y-6">
      <CompletionsForm controller={controller} />
    </CardContent>
  </Card>
);

export default CompletionsRequestCard;
