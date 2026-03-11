"use client";

import { EVALUATION_CRITERIA } from "@/data/evaluationCriteria";
import type { CriteriaId } from "@/types/evaluation";
import { Check } from "lucide-react";
import clsx from "clsx";

interface Props {
  selectedIds: CriteriaId[];
  onChange: (ids: CriteriaId[]) => void;
}

const CRITERIA_ICONS: Record<string, string> = {
  math_reasoning:       "∑",
  code_generation:      "</>",
  long_context:         "📄",
  instruction_following:"🎯",
  structured_output:    "{}",
  multi_turn_reasoning: "💬",
  hallucination_rate:   "✓",
  tool_use:             "🔧",
  cost_efficiency:      "$",
  latency:              "⚡",
};

export default function CriteriaSelector({ selectedIds, onChange }: Props) {
  const toggle = (id: CriteriaId) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    );
  };

  const selectAll = () =>
    onChange(EVALUATION_CRITERIA.map((c) => c.id as CriteriaId));
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
          Evaluation Criteria ({selectedIds.length}/{EVALUATION_CRITERIA.length})
        </h2>
        <div className="flex gap-2 text-xs">
          <button onClick={selectAll} className="text-blue-600 hover:underline">All</button>
          <span className="text-gray-300">|</span>
          <button onClick={clearAll} className="text-blue-600 hover:underline">Clear</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {EVALUATION_CRITERIA.map((criteria) => {
          const isSelected = selectedIds.includes(criteria.id as CriteriaId);
          return (
            <button
              key={criteria.id}
              onClick={() => toggle(criteria.id as CriteriaId)}
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

              {/* Icon */}
              <span className="text-lg leading-none mt-0.5 w-6 text-center flex-shrink-0">
                {CRITERIA_ICONS[criteria.id] ?? "●"}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-gray-900">{criteria.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    w={criteria.weight}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {criteria.benchmark}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
