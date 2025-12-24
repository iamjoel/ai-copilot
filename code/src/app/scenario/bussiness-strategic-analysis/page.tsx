"use client";

import { FormEvent, useState } from "react";
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } from "ai";
import CustomerProfileCanvas, { type CustomerProfileData } from "./components/CustomerProfileCanvas";
import ValueCurveChart, { type ValueCurveData } from "./components/ValueCurveChart";
import buildStrategicPrompt from "@/prompts/scenario/business-strategic-analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const GEMINI_MODEL = "gemini-3-flash-preview";

const normalizeStringList = (value: unknown, label: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  const filtered = value
    .map(item => (typeof item === "string" ? item.trim() : String(item).trim()))
    .filter(Boolean);
  if (!filtered.length) {
    throw new Error(`${label} needs at least one entry.`);
  }
  return filtered;
};

const normalizeCurveEntries = (value: unknown, dimensionCount: number) => {
  if (!Array.isArray(value)) {
    throw new Error("valueCurve.curves must be an array.");
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`curve at index ${index} is not an object.`);
    }
    const record = entry as Record<string, unknown>;
    const name = (typeof record.name === "string" ? record.name.trim() : `Curve ${index + 1}`) || `Curve ${index + 1}`;
    const values = Array.isArray(record.values)
      ? record.values
        .map(item => (typeof item === "string" ? item.trim().toUpperCase() : String(item).trim().toUpperCase()))
        .filter(Boolean)
      : [];
    while (values.length < dimensionCount) {
      values.push("S");
    }
    const userTag = (typeof record.userTag === "string" ? record.userTag.trim() : "") || "Customer Tags";
    const userNote = (typeof record.userNote === "string" ? record.userNote.trim() : "") || "Strategic Role Description";

    return { name, values, userTag, userNote };
  });
};

const parseStructuredOutput = (text: string) => {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const payload = (jsonMatch ? jsonMatch[1] : text).trim();
  if (!payload) {
    throw new Error("LLM did not return readable JSON.");
  }

  const parsed = JSON.parse(payload);
  if (!parsed.customerProfile || !parsed.valueCurve) {
    throw new Error("The response is missing required sections.");
  }

  const customerProfile: CustomerProfileData = {
    jobs: normalizeStringList(parsed.customerProfile.jobs, "Customer Jobs"),
    pains: normalizeStringList(parsed.customerProfile.pains, "Pains"),
    gains: normalizeStringList(parsed.customerProfile.gains, "Gains"),
  };
  const dimensions = normalizeStringList(parsed.valueCurve.dimensions, "Value Curve dimensions");
  const valueCurve: ValueCurveData = {
    dimensions,
    curves: normalizeCurveEntries(parsed.valueCurve.curves, dimensions.length),
  };
  if (!valueCurve.curves.length) {
    throw new Error("At least one value curve entry is required.");
  }
  return { customerProfile, valueCurve };
};

const readCompletionText = async (response: Response) => {
  if (!response.body) {
    throw new Error("Empty response body");
  }
  const parsedStream = parseJsonEventStream({ stream: response.body, schema: uiMessageChunkSchema });
  const chunkStream = parsedStream.pipeThrough(
    new TransformStream({
      transform(part, controller) {
        if (!part?.success) return;
        controller.enqueue(part.value);
      },
    }),
  );
  let completionText = "";
  for await (const message of readUIMessageStream({ stream: chunkStream })) {
    const latest = (message.parts ?? [])
      .filter(part => part.type === "text")
      .map(part => part.text)
      .join("");
    if (latest) {
      completionText = latest;
    }
  }
  return completionText;
};

export default function Page() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfileData | null>(null);
  const [valueCurveData, setValueCurveData] = useState<ValueCurveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      setError("Please enter a customer objective first.");
      return;
    }
    setLoading(true);
    setError(null);
    setCustomerProfile(null);
    setValueCurveData(null);
    setRawOutput(null);

    try {
      const prompt = buildStrategicPrompt(trimmedGoal);
      const response = await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: GEMINI_MODEL,
          config: {
            applyOutputRules: true,
            language: "English",
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Request failed");
      }

      const completionText = await readCompletionText(response);
      if (!completionText) {
        throw new Error("LLM did not return any content.");
      }

      setRawOutput(completionText);
      const { customerProfile, valueCurve } = parseStructuredOutput(completionText);
      setCustomerProfile(customerProfile);
      setValueCurveData(valueCurve);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Operation failed, please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Business Strategic Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Label className="mb-2">Customer Objective</Label>
            <Textarea
              value={goal}
              onChange={event => setGoal(event.target.value)}
              rows={4}
              placeholder="Describe a core objective the customer hopes to achieve, for example: increasing brand loyalty and boosting online conversion in emerging markets."
            />
          </form>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-slate-900" />
                Processing...
              </span>
            ) : (
              "Submit"
            )}
          </Button>
        </CardFooter>
      </Card>
      {error && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}
      {customerProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerProfileCanvas profile={customerProfile} />
          </CardContent>
        </Card>
      )}
      {valueCurveData && (
        <Card>
          <CardHeader>
            <CardTitle>Strategic Mapping Canvas</CardTitle>
          </CardHeader>
          <CardContent>
            <ValueCurveChart data={valueCurveData} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
