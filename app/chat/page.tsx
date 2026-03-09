"use client";

import { useState } from "react";
import Chatbot from "@/components/Chatbot";
import type { CriteriaId, ModelEvaluationResult } from "@/types/evaluation";
import { saveEvaluation } from "@/lib/evalStore";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function ChatPage() {
  const [hasResults, setHasResults] = useState(false);

  function handleComplete(results: ModelEvaluationResult[]) {
    saveEvaluation(results);
    setHasResults(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat Interface</h1>
          <p className="text-sm text-gray-500 mt-1">
            Describe your evaluation request in natural language.
          </p>
        </div>
        {hasResults && (
          <Link
            href="/results"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <BarChart3 size={14} />
            View Results
          </Link>
        )}
      </div>

      <div style={{ height: "calc(100vh - 180px)" }}>
        <Chatbot
          onEvaluationStart={(modelIds: string[], criteriaIds: CriteriaId[]) => {
            console.log("Starting evaluation:", { modelIds, criteriaIds });
          }}
          onEvaluationComplete={handleComplete}
        />
      </div>
    </div>
  );
}
