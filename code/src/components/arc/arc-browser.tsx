"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ArcDatasetType = "ARC-Challenge" | "ARC-Easy";

type ArcChoice = {
  label: string;
  text: string;
};

type ArcRecord = {
  id: string;
  question: string;
  choices: ArcChoice[];
  answerKey: string;
  datasetType: ArcDatasetType;
};

type ArcApiResponse = {
  items: ArcRecord[];
  total: number;
  page: number;
  pageSize: number;
};

type RunResponse = {
  raw: string;
  model: string;
};

const PAGE_SIZE = 10;

export default function ArcBrowser() {
  const [datasetType, setDatasetType] = useState<ArcDatasetType | "all">("all");
  const [page, setPage] = useState(1);
  const [runResults, setRunResults] = useState<Record<string, RunResponse>>({});
  const [runningId, setRunningId] = useState<string | null>(null);

  const queryKey = useMemo(() => ["arc", datasetType, page], [datasetType, page]);

  const { data, isLoading, isFetching, error } = useQuery<ArcApiResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (datasetType !== "all") {
        params.set("type", datasetType);
      }
      const response = await fetch(`/api/arc?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load ARC datasets.");
      }
      return response.json();
    },
  });

  const runMutation = useMutation({
    mutationFn: async (record: ArcRecord) => {
      const response = await fetch("/api/arc/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: record.question,
          choices: record.choices,
        }),
      });
      if (!response.ok) {
        throw new Error("Run request failed.");
      }
      return response.json() as Promise<RunResponse>;
    },
    onMutate: record => {
      setRunningId(record.id);
    },
    onSuccess: (result, record) => {
      setRunResults(prev => ({ ...prev, [record.id]: result }));
    },
    onSettled: () => {
      setRunningId(null);
    },
  });

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const handleDatasetChange = (value: string) => {
    setDatasetType(value as ArcDatasetType | "all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">ARC Test Datasets</p>
            <p className="text-sm text-muted-foreground">
              Browse ARC-Challenge and ARC-Easy with 10 rows per page.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={datasetType} onValueChange={handleDatasetChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All datasets</SelectItem>
                <SelectItem value="ARC-Challenge">ARC-Challenge</SelectItem>
                <SelectItem value="ARC-Easy">ARC-Easy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Question</th>
                <th className="px-4 py-3 text-left font-medium">Choices</th>
                <th className="px-4 py-3 text-left font-medium">Answer Key</th>
                <th className="px-4 py-3 text-left font-medium">Run</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                    Loading ARC data...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-6 text-center text-destructive" colSpan={5}>
                    Failed to load dataset rows.
                  </td>
                </tr>
              ) : data?.items.length ? (
                data.items.map(record => {
                  const runResult = runResults[record.id];
                  const isRunning = runningId === record.id;
                  return (
                    <tr key={`${record.datasetType}-${record.id}`} className="border-t">
                      <td className="px-4 py-4 align-top">
                        <Badge variant="secondary">{record.datasetType}</Badge>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="whitespace-pre-wrap text-foreground">{record.question}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-2">
                          {record.choices.map(choice => (
                            <div key={`${record.id}-${choice.label}`} className="text-muted-foreground">
                              <span className="font-semibold text-foreground">{choice.label}.</span>{" "}
                              {choice.text}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="font-semibold text-foreground">{record.answerKey}</span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            disabled={isRunning}
                            onClick={() => runMutation.mutate(record)}
                          >
                            {isRunning ? "Running..." : "Run"}
                          </Button>
                          {runResult ? (
                            <div className="text-xs text-muted-foreground">
                              <div className="line-clamp-2">Result: <span className="font-semibold text-foreground">
                                {runResult.raw}</span></div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          {data
            ? `Page ${data.page} of ${totalPages} • ${data.total} records`
            : "Page 1"}
          {isFetching && !isLoading ? " • Refreshing..." : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!canGoPrev} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={!canGoNext} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
