import type { CalculusTopic, DifficultyLevel, QuestionType } from '@/types';

export interface GeneratedProblemInput {
  slug: string;
  title: string;
  topic: CalculusTopic;
  difficulty: DifficultyLevel;
  source: string;
  type: QuestionType;
  statement: string;
  options: string[];
  correctOption?: number;
  correctValue?: number;
  tolerance: number;
  hint: string;
  solution: string;
  tags: string[];
}

export interface GenerateProblemsParams {
  topic: CalculusTopic;
  difficulty: DifficultyLevel;
  type: QuestionType | 'mixed';
  count: number;
  modelOverride?: string;
}

const VALID_TOPICS: CalculusTopic[] = [
  'Limits & Continuity',
  'Differential Calculus',
  'Integral Calculus',
  'Differential Equations',
  'Multivariable & Vector Calculus',
  'Infinite Series & Sequences',
];

const VALID_DIFFICULTIES: DifficultyLevel[] = [
  'Foundation',
  'JEE Advanced',
  'MIT / Putnam',
];

function getAIConfig(modelOverride?: string) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const baseUrl = (
    process.env.AI_BASE_URL ||
    'https://generativelanguage.googleapis.com/v1beta/openai'
  ).replace(/\/+$/, '');
  const model =
    modelOverride?.trim() ||
    process.env.AI_MODEL ||
    'gemini-4-hydrogen';
  const apiKey = geminiKey || process.env.AI_API_KEY || '';
  return { baseUrl, model, apiKey };
}

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'calculus-problem'}-${suffix}`;
}

function extractJsonPayload(raw: string): unknown {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : cleaned;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(candidate);
}

function validateProblem(
  raw: Record<string, unknown>,
  fallbackTopic: CalculusTopic,
  fallbackDifficulty: DifficultyLevel,
  model: string
): GeneratedProblemInput | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const statement = typeof raw.statement === 'string' ? raw.statement.trim() : '';
  const hint = typeof raw.hint === 'string' ? raw.hint.trim() : '';
  const solution = typeof raw.solution === 'string' ? raw.solution.trim() : '';

  if (!title || !statement || !solution) return null;

  const topic = VALID_TOPICS.includes(raw.topic as CalculusTopic)
    ? (raw.topic as CalculusTopic)
    : fallbackTopic;

  const difficulty = VALID_DIFFICULTIES.includes(raw.difficulty as DifficultyLevel)
    ? (raw.difficulty as DifficultyLevel)
    : fallbackDifficulty;

  const type: QuestionType = raw.type === 'numerical' ? 'numerical' : 'mcq';

  if (type === 'mcq') {
    const options = Array.isArray(raw.options)
      ? raw.options.map((o) => String(o).trim()).filter(Boolean)
      : [];
    const correctOption = Number(raw.correctOption);
    if (
      options.length !== 4 ||
      !Number.isInteger(correctOption) ||
      correctOption < 0 ||
      correctOption > 3
    ) {
      return null;
    }
    return {
      slug: slugify(title),
      title,
      topic,
      difficulty,
      source:
        typeof raw.source === 'string' && raw.source.trim()
          ? raw.source.trim()
          : `${model} · ${difficulty}`,
      type: 'mcq',
      statement,
      options,
      correctOption,
      tolerance: 0.01,
      hint: hint || 'Look for symmetry, substitution, or series expansion.',
      solution,
      tags: Array.isArray(raw.tags)
        ? raw.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 5)
        : [topic],
    };
  }

  const correctValue = Number(raw.correctValue);
  if (Number.isNaN(correctValue)) return null;

  return {
    slug: slugify(title),
    title,
    topic,
    difficulty,
    source:
      typeof raw.source === 'string' && raw.source.trim()
        ? raw.source.trim()
        : `${model} · ${difficulty}`,
    type: 'numerical',
    statement,
    options: [],
    correctValue,
    tolerance:
      typeof raw.tolerance === 'number' && raw.tolerance >= 0
        ? raw.tolerance
        : 0.01,
    hint: hint || 'Simplify using standard calculus identities.',
    solution,
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 5)
      : [topic],
  };
}

export async function generateCalculusProblems(
  params: GenerateProblemsParams
): Promise<GeneratedProblemInput[]> {
  const { baseUrl, model, apiKey } = getAIConfig(params.modelOverride);

  if (!apiKey || apiKey === 'your-gemini-api-key') {
    throw new Error(
      'AI_API_KEY is not configured. Set your Gemini API key (or Ollama config) in .env.local.'
    );
  }

  const count = Math.max(1, Math.min(5, params.count));

  const formatInstruction =
    params.type === 'mixed'
      ? 'Mix of "mcq" (4 options) and "numerical" (exact integer or decimal answer).'
      : params.type === 'mcq'
        ? 'All problems must have "type": "mcq" with exactly 4 options and "correctOption" (0-3).'
        : 'All problems must have "type": "numerical" with "options": [] and "correctValue" (a number).';

  const systemPrompt = `You are a Mathematics Professor designing original, mathematically verified calculus problems at ${params.difficulty} standard (JEE Advanced / MIT 18.01 / MIT 18.02 / Putnam).
Respond ONLY with valid JSON matching this exact schema:
{
  "problems": [
    {
      "title": "Concise descriptive title",
      "topic": "${params.topic}",
      "difficulty": "${params.difficulty}",
      "source": "${model} · ${params.difficulty}",
      "type": "mcq" | "numerical",
      "statement": "LaTeX problem statement using $...$ and $$...$$",
      "options": ["$opt0$", "$opt1$", "$opt2$", "$opt3$"],
      "correctOption": 0,
      "correctValue": 0,
      "tolerance": 0.01,
      "hint": "Concise LaTeX hint",
      "solution": "Complete, rigorous step-by-step LaTeX derivation",
      "tags": ["Tag1", "Tag2"]
    }
  ]
}
Ensure all LaTeX backslashes are properly escaped in JSON strings (e.g. \\\\frac, \\\\int, \\\\lim). Verify every calculation carefully before outputting.`;

  const userPrompt = `Generate ${count} original, non-trivial calculus problem(s) in "${params.topic}" at "${params.difficulty}" difficulty.
${formatInstruction}
For JEE Advanced / MIT / Putnam problems, emphasize multi-concept synthesis (e.g. King's property, Feynman differentiation under the integral sign, Taylor cancellation, Bernoulli ODEs, Jacobians, Stokes/Green's theorem, or telescoping series).`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `AI endpoint (${baseUrl}, model: ${model}) returned ${response.status}: ${errText.slice(0, 240)}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI provider returned an empty response.');
  }

  const parsed = extractJsonPayload(content) as {
    problems?: Record<string, unknown>[];
  };

  const rawList = Array.isArray(parsed?.problems)
    ? parsed.problems
    : Array.isArray(parsed)
      ? (parsed as Record<string, unknown>[])
      : [];

  const validated = rawList
    .map((item) => validateProblem(item, params.topic, params.difficulty, model))
    .filter((p): p is GeneratedProblemInput => p !== null);

  if (validated.length === 0) {
    throw new Error('AI response did not contain any valid calculus problems.');
  }

  return validated;
}

export async function checkAIHealth(): Promise<{
  configured: boolean;
  reachable: boolean;
  baseUrl: string;
  model: string;
}> {
  const { baseUrl, model, apiKey } = getAIConfig();
  const configured = Boolean(apiKey && apiKey !== 'your-gemini-api-key');

  if (!configured) {
    return { configured: false, reachable: false, baseUrl, model };
  }

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000),
    });
    return { configured: true, reachable: res.ok, baseUrl, model };
  } catch {
    return { configured: true, reachable: false, baseUrl, model };
  }
}
