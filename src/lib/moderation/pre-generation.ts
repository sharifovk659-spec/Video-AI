import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";

/**
 * Configurable pre-generation moderation — runs before credit reserve / expensive AI calls.
 * Rejects clearly abusive impersonation / deceptive deepfake workflows.
 */
const DEEPFAKE_IMPERSONATION = [
  /\b(deep\s*fake|deepfake)\b/i,
  /\b(impersonat(e|ing|ion)|pretend\s+to\s+be|fake\s+identity)\b/i,
  /\b(non[-\s]?consensual|revenge\s*porn)\b/i,
  /\b(without\s+(their|his|her|the)\s+consent)\b/i,
  /\b(celebrity\s+nude|nude\s+of\s+[a-z])/i,
  /\b(scam\s+video|fraudulent\s+(video|recording))\b/i,
];

const ABUSE = [
  /\b(child\s*(porn|sexual|exploit)|csam|underage\s+sex)\b/i,
  /\b(kill|murder|rape)\b/i,
];

export type ModerationInput = {
  userId: string;
  templateSlug?: string | null;
  templateTitle?: string | null;
  userPrompt?: string | null;
  isStudio?: boolean;
};

export type ModerationResult = {
  allowed: boolean;
  reason?: string;
  code?: string;
};

export async function isModerationEnabled(): Promise<boolean> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "moderation_enabled" },
  });
  if (setting?.value === false) return false;
  return true;
}

export async function isMaintenanceMode(): Promise<boolean> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "maintenance_mode" },
  });
  return setting?.value === true;
}

export function evaluateContentSafety(text: string): ModerationResult {
  const normalized = text.trim();
  if (!normalized) return { allowed: true };

  for (const pattern of ABUSE) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        code: "CONTENT_ABUSE",
        reason: "Content violates safety policy",
      };
    }
  }
  for (const pattern of DEEPFAKE_IMPERSONATION) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        code: "DECEPTIVE_DEEPFAKE",
        reason:
          "Deceptive deepfake / impersonation workflows are not allowed",
      };
    }
  }
  return { allowed: true };
}

/**
 * Hook invoked before expensive AI generation.
 * Extend via AppSetting `moderation_webhook_url` later without rewriting core flow.
 */
export async function runPreGenerationModeration(
  input: ModerationInput,
): Promise<void> {
  if (await isMaintenanceMode()) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Service is temporarily unavailable",
    );
  }

  if (!(await isModerationEnabled())) return;

  const corpus = [
    input.userPrompt ?? "",
    input.templateTitle ?? "",
    input.templateSlug ?? "",
  ]
    .join(" ")
    .trim();

  const result = evaluateContentSafety(corpus);
  if (!result.allowed) {
    throw new AppError("FORBIDDEN", result.reason ?? "Blocked by moderation", {
      details: { code: result.code },
    });
  }

  const webhook = await prisma.appSetting.findUnique({
    where: { key: "moderation_webhook_url" },
  });
  const url =
    typeof webhook?.value === "string" && webhook.value.startsWith("http")
      ? webhook.value
      : null;

  if (url) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: input.userId,
          templateSlug: input.templateSlug,
          isStudio: Boolean(input.isStudio),
          // Never send private media; text-only signals
          hasUserPrompt: Boolean(input.userPrompt),
          promptLength: input.userPrompt?.length ?? 0,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status === 403 || res.status === 422) {
        throw new AppError("FORBIDDEN", "Blocked by external moderation");
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      // Fail open on webhook timeout/outage — local rules already applied
    }
  }
}
