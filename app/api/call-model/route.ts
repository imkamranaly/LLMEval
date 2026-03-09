// ─────────────────────────────────────────────────────────────
//  POST /api/call-model
//  Unified interface for calling any model provider
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { callModel } from "@/lib/modelRouter";
import type { CallModelRequest } from "@/types/evaluation";

export async function POST(request: NextRequest) {
  try {
    const body: CallModelRequest = await request.json();

    if (!body.modelId || !body.prompt) {
      return NextResponse.json(
        { error: "modelId and prompt are required" },
        { status: 400 }
      );
    }

    const result = await callModel({
      modelId: body.modelId,
      prompt: body.prompt,
      systemPrompt: body.systemPrompt,
      temperature: body.temperature ?? 0,
      maxTokens: body.maxTokens ?? 2048,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[call-model] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
