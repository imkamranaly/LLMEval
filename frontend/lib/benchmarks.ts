// ─────────────────────────────────────────────────────────────
//  Benchmark prompt suites — one per evaluation criterion.
//  Each entry is a deterministic prompt + expected answer used
//  by the scoring engine for automated grading.
//
//  Every criterion has exactly 5 prompts (cases).
//  The scoring engine runs each case 5 times (RUNS_PER_TEST).
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
  {
    id: "math_004",
    prompt:
      "What is the sum of the first 100 positive integers? Give only the numeric answer.",
    expectedAnswer: "5050",
    maxTokens: 128,
  },
  {
    id: "math_005",
    prompt:
      "A rectangle has a perimeter of 54 cm and its length is twice its width. What is the area of the rectangle in cm²? Give only the numeric answer.",
    expectedAnswer: "162",
    maxTokens: 256,
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
  {
    id: "code_004",
    prompt:
      "Write a Python function `binary_search(arr: list[int], target: int) -> int` that returns the index of target in a sorted array, or -1 if not found. Include type hints and a docstring.",
    rubric: "Correct binary search logic, O(log n), handles not-found case, type hints, docstring",
    maxTokens: 512,
  },
  {
    id: "code_005",
    prompt:
      "Write a JavaScript async function `fetchWithRetry(url, maxRetries = 3)` that retries a fetch request on failure with exponential backoff. Include error handling.",
    rubric: "Correct async/await, exponential backoff (e.g. 2^attempt * 100ms), throws after max retries, handles fetch errors",
    maxTokens: 768,
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
  {
    id: "ctx_003",
    prompt:
      "Here is a 200-page research report [SIMULATED] on renewable energy. The conclusion on page 187 states: 'Solar adoption will reach 45% of global electricity by 2035.' What percentage does the report predict for solar adoption and by what year?",
    expectedAnswer: "45% by 2035",
    maxTokens: 256,
  },
  {
    id: "ctx_004",
    prompt:
      "In the following meeting transcript [SIMULATED 10,000 words covering 8 topics], the action item assigned to Alice regarding the Q3 budget review is: 'Alice to submit revised Q3 budget by August 15th.' What is Alice's action item and its deadline?",
    expectedAnswer: "submit revised Q3 budget by August 15th",
    maxTokens: 256,
  },
  {
    id: "ctx_005",
    prompt:
      "A dataset of 50,000 customer records [SIMULATED] includes the entry: customer_id=99812, name='Elena Vasquez', signup_date='2021-06-03', tier='Gold'. What is the signup date and tier for customer ID 99812?",
    expectedAnswer: "2021-06-03, Gold",
    maxTokens: 256,
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
  {
    id: "inst_004",
    prompt:
      "List the planets of the solar system in order from the Sun. Output ONLY a numbered list (1. Mercury, 2. Venus, ...). No other text.",
    expectedAnswer: "Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune",
    maxTokens: 128,
  },
  {
    id: "inst_005",
    prompt:
      "Rewrite the following sentence in passive voice and output ONLY the rewritten sentence, nothing else:\n'The engineer fixed the bug.'",
    expectedAnswer: "The bug was fixed by the engineer.",
    maxTokens: 64,
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
  {
    id: "struct_003",
    prompt: `Parse the following CSV row and return ONLY a valid JSON object with keys: id (number), firstName (string), lastName (string), score (number).

Row: "1042,Jane,Doe,98.5"`,
    expectedAnswer: '{"id":1042,"firstName":"Jane","lastName":"Doe","score":98.5}',
    maxTokens: 128,
  },
  {
    id: "struct_004",
    prompt: `Return ONLY a valid JSON array of 3 objects. Each object must have: country (string), capital (string), population_millions (number). Use real data.`,
    rubric: "Valid JSON array, exactly 3 objects, all three keys present and correct types, real country data",
    maxTokens: 256,
  },
  {
    id: "struct_005",
    prompt: `Convert the following unstructured text into a JSON object with keys: event (string), date (string, ISO 8601), location (string), attendees (number). Return ONLY the JSON.

Text: "The annual tech summit will be held on March 15, 2025 in San Francisco. Around 3200 people are expected to attend."`,
    expectedAnswer: '{"event":"annual tech summit","date":"2025-03-15","location":"San Francisco","attendees":3200}',
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
  {
    id: "multi_002",
    prompt: `This is turn 3 of a conversation.
Turn 1 — User: "I'm debugging a Python script that reads CSV files."
Turn 1 — Assistant: "Sure! What error are you seeing?"
Turn 2 — User: "I get a UnicodeDecodeError on line 12. The CSV has special characters."
Turn 2 — Assistant: "Try opening the file with encoding='utf-8' or 'latin-1' as a fallback."
Turn 3 — User: "I tried utf-8 but still get the error. What next?"`,
    rubric: "Remembers the CSV/Python context, suggests latin-1 or errors='replace', coherent troubleshooting",
    maxTokens: 512,
  },
  {
    id: "multi_003",
    prompt: `This is turn 4 of a conversation.
Turn 1 — User: "I want to build a REST API for a todo app."
Turn 1 — Assistant: "Great! Which language/framework are you using?"
Turn 2 — User: "Node.js with Express."
Turn 2 — Assistant: "Perfect. You'll want routes for GET/POST/DELETE on /todos."
Turn 3 — User: "How should I store the data?"
Turn 3 — Assistant: "For simplicity start with SQLite; for production consider PostgreSQL."
Turn 4 — User: "Show me the Express route for creating a new todo using SQLite."`,
    rubric: "Maintains context (Node.js, Express, SQLite, todo app), provides correct Express + SQLite insert route",
    maxTokens: 768,
  },
  {
    id: "multi_004",
    prompt: `This is turn 3 of a conversation.
Turn 1 — User: "My monthly budget is $3,000. I want to save 20% of it."
Turn 1 — Assistant: "That means saving $600/month. Would you like tips on where to cut expenses?"
Turn 2 — User: "Yes. My biggest expense is rent at $1,200."
Turn 2 — Assistant: "Rent is 40% of your budget. Common advice is to keep housing under 30%."
Turn 3 — User: "If I find a place for $900, how much will I have left to save after all fixed expenses of $400?"`,
    rubric: "Correctly computes: $3000 - $900 rent - $400 fixed = $1700 remaining, maintains budget context",
    maxTokens: 256,
  },
  {
    id: "multi_005",
    prompt: `This is turn 3 of a conversation.
Turn 1 — User: "I'm writing a fantasy novel set in a world with two moons."
Turn 1 — Assistant: "Fascinating! How do the two moons affect the world's tides and calendar?"
Turn 2 — User: "The moons cause unpredictable tides. The civilization uses a lunar calendar based on both moons."
Turn 2 — Assistant: "Interesting — the combined cycles could create complex repeating patterns every few years."
Turn 3 — User: "One moon has a 28-day cycle and the other has a 35-day cycle. How long until they align again?"`,
    rubric: "Correctly computes LCM(28, 35) = 140 days, maintains the fantasy world context",
    maxTokens: 256,
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
  {
    id: "hall_005",
    prompt:
      "What is the speed of light in a vacuum in metres per second? Give only the numeric value.",
    expectedAnswer: "299792458",
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
  {
    id: "tool_002",
    prompt: `You have access to the following tools:
- search_db(query: string, table: string): searches a database table
- send_email(to: string, subject: string, body: string): sends an email

User request: "Find all orders from customer 'C-1042' in the orders table, then email the results to manager@company.com with subject 'Order Report'."

Respond with a JSON array of tool calls in the format:
[{"tool": "name", "params": {...}}, ...]`,
    rubric: "Correct tool sequence: search_db first then send_email, correct params for both",
    maxTokens: 256,
  },
  {
    id: "tool_003",
    prompt: `You have access to the following tools:
- convert_currency(amount: number, from: string, to: string): converts currency
- format_number(value: number, decimals: number): formats a number

User request: "Convert 1500 USD to EUR, then format the result to 2 decimal places."

Respond with a JSON array of tool calls in the format:
[{"tool": "name", "params": {...}}, ...]`,
    rubric: "Correct sequence: convert_currency(1500, 'USD', 'EUR') first, then format_number with 2 decimals",
    maxTokens: 256,
  },
  {
    id: "tool_004",
    prompt: `You have access to the following tools:
- read_file(path: string): reads file contents
- write_file(path: string, content: string): writes content to a file

User request: "Read the file at /data/report.txt and save a copy to /backup/report_backup.txt."

Respond with a JSON array of tool calls in the format:
[{"tool": "name", "params": {...}}, ...]`,
    rubric: "read_file('/data/report.txt') first, then write_file('/backup/report_backup.txt', <content>)",
    maxTokens: 256,
  },
  {
    id: "tool_005",
    prompt: `You have access to the following tools:
- get_stock_price(ticker: string): returns current stock price
- calculate(expression: string): evaluates a math expression

User request: "Get the current price of AAPL stock, then calculate how much 50 shares would cost."

Respond with a JSON array of tool calls in the format:
[{"tool": "name", "params": {...}}, ...]`,
    rubric: "get_stock_price('AAPL') first, then calculate('50 * <price>' or similar expression)",
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
