"use client";

import { MODELS } from "@/data/models";
import type { ModelConfig } from "@/types/evaluation";
import { Check } from "lucide-react";
import clsx from "clsx";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "bg-amber-100 text-amber-800 border-amber-300",
  openai:    "bg-green-100 text-green-800 border-green-300",
  google:    "bg-blue-100 text-blue-800 border-blue-300",
  deepseek:  "bg-purple-100 text-purple-800 border-purple-300",
  alibaba:   "bg-orange-100 text-orange-800 border-orange-300",
  local:     "bg-gray-100 text-gray-700 border-gray-300",
};

export default function ModelSelector({ selectedIds, onChange }: Props) {
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    );
  };

  const selectAll = () => onChange(MODELS.map((m) => m.id));
  const clearAll  = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
          Select Models ({selectedIds.length}/{MODELS.length})
        </h2>
        <div className="flex gap-2 text-xs">
          <button onClick={selectAll} className="text-blue-600 hover:underline">All</button>
          <span className="text-gray-300">|</span>
          <button onClick={clearAll} className="text-blue-600 hover:underline">Clear</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {MODELS.map((model: ModelConfig) => {
          const isSelected = selectedIds.includes(model.id);
          return (
            <button
              key={model.id}
              onClick={() => toggle(model.id)}
              className={clsx(
                "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                isSelected
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              {/* Checkbox */}
              <div className={clsx(
                "mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center",
                isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
              )}>
                {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900">{model.name}</span>
                  <span className={clsx(
                    "text-xs px-1.5 py-0.5 rounded border font-medium",
                    PROVIDER_COLORS[model.provider] ?? "bg-gray-100 text-gray-700"
                  )}>
                    {model.provider}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{model.description}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>${model.inputCostPer1kTokens}/1k in</span>
                  <span>${model.outputCostPer1kTokens}/1k out</span>
                  <span>{(model.contextWindow / 1000).toFixed(0)}k ctx</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
