const BLOCKLIST = [
  /\b(kill|murder|rape|child\s*porn|csam)\b/i,
  /\b(bomb\s*making|how\s*to\s*make\s*a\s*bomb)\b/i,
];

const MAX_PROMPT_LENGTH = 1500;
const MIN_PROMPT_LENGTH = 8;
const ALLOWED_DURATIONS = [5, 8, 10] as const;
const ALLOWED_ASPECTS = ["9:16", "16:9", "1:1"] as const;

export type StudioSafeInput = {
  userPrompt: string;
  durationSeconds: number;
  aspectRatio: string;
};

export function getStudioLimits() {
  return {
    maxPromptLength: MAX_PROMPT_LENGTH,
    minPromptLength: MIN_PROMPT_LENGTH,
    allowedDurations: [...ALLOWED_DURATIONS],
    allowedAspects: [...ALLOWED_ASPECTS],
  };
}

export function validateStudioInput(input: {
  userPrompt: string;
  durationSeconds: number;
  aspectRatio: string;
}): StudioSafeInput {
  const userPrompt = input.userPrompt.trim().replace(/\s+/g, " ");
  if (userPrompt.length < MIN_PROMPT_LENGTH) {
    throw new Error(`Description must be at least ${MIN_PROMPT_LENGTH} characters`);
  }
  if (userPrompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Description must be at most ${MAX_PROMPT_LENGTH} characters`);
  }
  for (const pattern of BLOCKLIST) {
    if (pattern.test(userPrompt)) {
      throw new Error("Description failed content safety checks");
    }
  }
  if (!(ALLOWED_DURATIONS as readonly number[]).includes(input.durationSeconds)) {
    throw new Error("Unsupported duration");
  }
  if (!(ALLOWED_ASPECTS as readonly string[]).includes(input.aspectRatio)) {
    throw new Error("Unsupported aspect ratio");
  }
  return {
    userPrompt,
    durationSeconds: input.durationSeconds,
    aspectRatio: input.aspectRatio,
  };
}

/**
 * Compose provider prompt server-side only.
 * Users never set provider credentials or internal template wrappers.
 */
export function composeStudioProviderPrompt(
  templatePrompt: string,
  userPrompt: string,
): string {
  if (templatePrompt.includes("{{user_prompt}}")) {
    return templatePrompt.replaceAll("{{user_prompt}}", userPrompt);
  }
  return `${templatePrompt.trim()}\n\nUser direction: ${userPrompt}`;
}
