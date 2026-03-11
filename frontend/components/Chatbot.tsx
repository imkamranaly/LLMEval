"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Play } from "lucide-react";
import type { ChatMessage, CriteriaId, ModelEvaluationResult } from "@/types/evaluation";
import clsx from "clsx";

interface Props {
  onEvaluationStart?: (modelIds: string[], criteriaIds: CriteriaId[]) => void;
  onEvaluationComplete?: (results: ModelEvaluationResult[]) => void;
}

interface PendingEval {
  modelIds: string[];
  criteriaIds: CriteriaId[];
}

export default function Chatbot({ onEvaluationStart, onEvaluationComplete }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your LLM Evaluation Assistant. Tell me which models and criteria you want to evaluate.\n\nExample: **\"Evaluate Claude Opus 4.6 and GPT-5.2 Thinking for math reasoning and code generation\"**\n\nOr type **help** to see all available options.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEval, setPendingEval] = useState<PendingEval | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
    ]);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setInput("");
    addMessage({ role: "user", content: text });
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (data.error) {
        addMessage({ role: "assistant", content: `Error: ${data.error}` });
        return;
      }

      addMessage({ role: "assistant", content: data.responseText });

      if (data.action === "evaluate" && data.modelIds?.length) {
        setPendingEval({
          modelIds: data.modelIds,
          criteriaIds: data.criteriaIds,
        });
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "Sorry, I encountered a network error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runEvaluation = async () => {
    if (!pendingEval) return;
    setPendingEval(null);
    setIsEvaluating(true);
    onEvaluationStart?.(pendingEval.modelIds, pendingEval.criteriaIds);

    addMessage({
      role: "assistant",
      content: `Starting evaluation for **${pendingEval.modelIds.length} model(s)** across **${pendingEval.criteriaIds.length} criteria**. This may take a few minutes...`,
    });

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelIds: pendingEval.modelIds,
          criteriaIds: pendingEval.criteriaIds,
        }),
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          const eventMatch = chunk.match(/^event: (\w+)/m);
          const dataMatch = chunk.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (event === "progress" || event === "status") {
            setEvalProgress(data.message ?? "");
          } else if (event === "complete") {
            setIsEvaluating(false);
            setEvalProgress("");
            onEvaluationComplete?.(data.results);
            addMessage({
              role: "assistant",
              content:
                `✅ **Evaluation complete!**\n\n` +
                `Results are now visible on the **Results** and **Dashboard** tabs.\n\n` +
                `You can download the full PDF report from the **Report** page.`,
              evaluationResult: data.results,
            });
          } else if (event === "error") {
            setIsEvaluating(false);
            setEvalProgress("");
            addMessage({
              role: "assistant",
              content: `❌ Evaluation failed: ${data.message}`,
            });
          }
        }
      }
    } catch (err) {
      setIsEvaluating(false);
      setEvalProgress("");
      addMessage({
        role: "assistant",
        content: `❌ Evaluation error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <div className="font-semibold text-white text-sm">LLM Evaluation Assistant</div>
          <div className="text-xs text-blue-200">
            {isEvaluating ? "Evaluating..." : "Ready"}
          </div>
        </div>
        {isEvaluating && (
          <Loader2 className="ml-auto text-white animate-spin" size={16} />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex gap-3 max-w-[85%]",
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            )}
          >
            {/* Avatar */}
            <div className={clsx(
              "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold",
              msg.role === "user" ? "bg-blue-500" : "bg-gray-700"
            )}>
              {msg.role === "user"
                ? <User size={14} />
                : <Bot size={14} />
              }
            </div>

            {/* Bubble */}
            <div className={clsx(
              "px-4 py-3 rounded-2xl text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-blue-500 text-white rounded-tr-sm"
                : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-xs"
            )}>
              <MessageContent content={msg.content} isUser={msg.role === "user"} />
            </div>
          </div>
        ))}

        {/* Progress indicator */}
        {isEvaluating && evalProgress && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-500 shadow-xs">
              <Loader2 className="inline mr-2 animate-spin" size={12} />
              {evalProgress}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Run evaluation button */}
        {pendingEval && !isEvaluating && (
          <div className="flex justify-center">
            <button
              onClick={runEvaluation}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-full shadow-md transition-colors"
            >
              <Play size={14} />
              Run Evaluation ({pendingEval.modelIds.length} models × {pendingEval.criteriaIds.length} criteria)
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your evaluation request..."
            rows={2}
            disabled={isLoading || isEvaluating}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading || isEvaluating}
            className="flex-shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 ml-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// Simple markdown renderer for bold and newlines
function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="space-y-1">
      {content.split("\n").map((line, i) => (
        <p key={i} className={line === "" ? "h-2" : undefined}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className={isUser ? "font-bold" : "font-semibold text-gray-900"}>
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      ))}
    </div>
  );
}
