// ─────────────────────────────────────────────────────────────
//  Benchmark prompt suites — one per evaluation criterion.
//  Each entry is a deterministic prompt + expected answer used
//  by the scoring engine for automated grading.
//
//  To add a new benchmark: append an entry to the relevant array.
// ─────────────────────────────────────────────────────────────
import type { CriteriaId } from "@/types/evaluation";

export interface BenchmarkPrompt {
  id: string;
  prompt: string;
  systemPrompt?: string;
  expectedAnswer?: string;   // used by exact-match scorers
  rubric?: string;           // used by LLM-as-judge scorers
  maxTokens: number;
}

// ── 1. Mathematical Reasoning ────────────────────────────────
const MATH_PROMPTS: BenchmarkPrompt[] = [
  {
    id: "math_001",
    prompt:
      "Find all integer solutions to: x² - 7x + 12 = 0. Show your full working.",
    expectedAnswer: "x=3, x=4",
    maxTokens: 512,
  },
  {
    id: "math_002",
    prompt:
      "A train travels from city A to city B at 60 km/h and returns at 40 km/h. What is the average speed for the round trip? Provide exact value.",
    expectedAnswer: "48 km/h",
    maxTokens: 512,
  },
  {
    id: "math_003",
    prompt:
      "Evaluate the integral: ∫(0 to π) sin(x) dx. Show all steps.",
    expectedAnswer: "2",
    maxTokens: 512,
  },
];

// ── 2. Code Generation ───────────────────────────────────────
const CODE_PROMPTS: BenchmarkPrompt[] = [
  {
    id: "code_001",
    prompt:
      "Write a TypeScript function `mergeIntervals(intervals: [number, number][]): [number, number][]` that merges all overlapping intervals. Include edge cases and a brief docstring.",
    rubric: "Correct algorithm (O(n log n) sort + merge), handles edge cases, TypeScript types, docstring present",
    maxTokens: 1024,
  },
  {
    id: "code_002",
    prompt:
      "Implement a thread-safe LRU cache in Python with O(1) get and put. Capacity provided at construction.",
    rubric: "Uses OrderedDict or doubly-linked list + hash map, thread-safe with Lock, correct eviction, O(1) operations",
    maxTokens: 1024,
  },
  {
    id: "code_003",
    prompt:
      "Write a SQL query that finds the top 3 customers by total purchase amount in the last 30 days. Tables: orders(id, customer_id, amount, created_at), customers(id, name).",
    rubric: "Correct JOIN, date filter, GROUP BY, ORDER BY, LIMIT 3",
    maxTokens: 512,
  },
];

// ── 3. Long Context ──────────────────────────────────────────
const LONG_CONTEXT_PROMPTS: BenchmarkPrompt[] = [
  {
    id: "ctx_001",
    prompt:
      "Here is a contract document: [SIMULATED 5000-word legal contract about software licensing with the key clause 'The liability cap is set at USD 250,000 per incident' buried in section 14.3]\n\nQuestion: What is the exact liability cap stated in the contract, and in which section?",
    expectedAnswer: "USD 250,000 per incident in section 14.3",
    maxTokens: 256,
  },
  {
    id: "ctx_002",
    prompt:
      "Given the following codebase with 100 files [SIMULATED], find all places where the function `calculateTax` is called and list each file and line number.",
    rubric: "Correctly identifies all call sites, no false positives, proper citation format",
    maxTokens: 512,
  },
];

// ── 4. Instruction Following ─────────────────────────────────
const INSTRUCTION_PROMPTS: BenchmarkPrompt[] = [
  {
    id: "inst_001",
    prompt:
      "Respond with ONLY a valid JSON object (no markdown, no explanation) with keys: name (string), age (number), hobbies (array of strings). Use fictional data.",
    rubric: "Pure JSON, no markdown fences, correct types, all three keys present",
    maxTokens: 128,
  },
  {
    id: "inst_002",
    prompt:
      "Write exactly 3 bullet points about climate change. Each bullet must start with a capital letter and end with a period. Use no more than 15 words per bullet.",
    rubric: "Exactly 3 bullets, proper capitalization, ends with period, ≤15 words each",
    maxTokens: 256,
  },
  {
    id: "inst_003",
    prompt:
      "Translate the following to French, Spanish, and German, presenting each translation on a separate line with the language name as a label:\n'The quick brown fox jumps over the lazy dog.'",
    rubric: "All three languages, labeled correctly, correct translations",
    maxTokens: 256,
  },
];

// ── 5. Structured Output ─────────────────────────────────────
const STRUCTURED_PROMPTS: BenchmarkPrompt[] = [
  {
    id: "struct_001",
    prompt: `Extract the following information from the text and return ONLY a valid JSON object with schema:
{
  "person": { "name": string, "age": number, "email": string },
  "company": { "name": string, "role": string }
}

Text: "John Smith, 34 years old (john.smith@acme.com), is the Lead Engineer at Acme Corp."`,
    expectedAnswer:
      '{"person":{"name":"John Smith","age":34,"email":"john.smith@acme.com"},"company":{"name":"Acme Corp","role":"Lead Engineer"}}',
    maxTokens: 256,
  },
  {
    id: "struct_002",
    prompt: `Return an XML document with root element <products> containing 3 <product> elements each with attributes: id (integer), name (string), price (float).`,
    rubric: "Valid XML, root element correct, 3 product children, correct attribute types",
    maxTokens: 256,
  },
];

// ── 6. Multi-Turn Reasoning ──────────────────────────────────
const MULTI_TURN_PROMPTS: BenchmarkPrompt[] = [
  {
    id: "multi_001",
    prompt: `This is turn 3 of a conversation.
Turn 1 — User: "I'm planning a trip to Japan in April."
Turn 1 — Assistant: "Great! April is cherry blossom season. Will you visit Tokyo?"
Turn 2 — User: "Yes, and Kyoto. What's the best way to travel between them?"
Turn 2 — Assistant: "The Shinkansen (bullet train) is the fastest option, taking about 2h15min."
Turn 3 — User: "How much does it cost and where do I buy tickets?"`,
    rubric: "Maintains context (April, Japan, Tokyo-Kyoto route), gives accurate Shinkansen pricing and ticket sources",
    maxTokens: 512,
  },
];

// ── 7. Hallucination Rate ────────────────────────────────────
const HALLUCINATION_PROMPTS: BenchmarkPrompt[] = [
  {
    id: "hall_001",
    prompt:
      "What is the capital of Australia? Give only the city name.",
    expectedAnswer: "Canberra",
    maxTokens: 32,
  },
  {
    id: "hall_002",
    prompt:
      "In what year was the Eiffel Tower completed? Give only the year.",
    expectedAnswer: "1889",
    maxTokens: 32,
  },
  {
    id: "hall_003",
    prompt:
      "Who wrote the novel '1984'? Give only the author's full name.",
    expectedAnswer: "George Orwell",
    maxTokens: 32,
  },
  {
    id: "hall_004",
    prompt:
      "What is the atomic number of carbon? Give only the number.",
    expectedAnswer: "6",
    maxTokens: 32,
  },
];

// ── 8. Tool Use ──────────────────────────────────────────────
const TOOL_USE_PROMPTS: BenchmarkPrompt[] = [
  {
    id: "tool_001",
    prompt: `You have access to the following tools:
- get_weather(city: string): returns current weather
- calculate(expression: string): evaluates a math expression

User request: "What's the weather in Paris, and what is 15% of 240?"

Respond with a JSON array of tool calls in the format:
[{"tool": "name", "params": {...}}, ...]`,
    expectedAnswer:
      '[{"tool":"get_weather","params":{"city":"Paris"}},{"tool":"calculate","params":{"expression":"0.15 * 240"}}]',
    maxTokens: 256,
  },
];

// ── Registry ─────────────────────────────────────────────────

export const BENCHMARK_PROMPTS: Record<CriteriaId, BenchmarkPrompt[]> = {
  math_reasoning: MATH_PROMPTS,
  code_generation: CODE_PROMPTS,
  long_context: LONG_CONTEXT_PROMPTS,
  instruction_following: INSTRUCTION_PROMPTS,
  structured_output: STRUCTURED_PROMPTS,
  multi_turn_reasoning: MULTI_TURN_PROMPTS,
  hallucination_rate: HALLUCINATION_PROMPTS,
  tool_use: TOOL_USE_PROMPTS,
  // Derived criteria — handled directly in scoring.ts
  cost_efficiency: [],
  latency: [],
};
