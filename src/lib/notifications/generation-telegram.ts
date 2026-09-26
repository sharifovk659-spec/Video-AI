import type { InlineKeyboard } from "grammy";
import { getEnv } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logger";
import { getOutboundBot } from "@/bot/outbound";
import { buildOpenMiniAppKeyboard } from "@/bot/mini-app-keyboard";

const log = createLogger("notify");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendWithRetry(
  chatId: number | string,
  text: string,
  replyMarkup?: InlineKeyboard,
): Promise<boolean> {
  const bot = getOutboundBot();
  if (!bot) return false;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await bot.api.sendMessage(chatId, text, {
        reply_markup: replyMarkup,
        link_preview_options: { is_disabled: true },
      });
      return true;
    } catch (error) {
      const err = error as {
        error_code?: number;
        parameters?: { retry_after?: number };
        description?: string;
      };
      if (err.error_code === 429) {
        const wait = Math.min(
          (err.parameters?.retry_after ?? 2) * 1000,
          15_000,
        );
        log.warn("Telegram rate limited", { wait, attempt });
        await sleep(wait);
        continue;
      }
      // Blocked / chat not found — do not retry
      if (err.error_code === 403 || err.error_code === 400) {
        log.warn("Telegram notify skipped", {
          code: err.error_code,
          description: err.description,
        });
        return false;
      }
      log.error("Telegram notify failed", {
        attempt,
        description: err.description ?? String(error),
      });
      await sleep(500 * (attempt + 1));
    }
  }
  return false;
}

/**
 * Sends a one-time completion notification. Deduped via notifiedCompletedAt.
 */
export async function notifyGenerationCompleted(
  generationId: string,
): Promise<void> {
  if (!getEnv().TELEGRAM_NOTIFY_ENABLED) return;

  const claimed = await prisma.generation.updateMany({
    where: {
      id: generationId,
      status: "completed",
      notifiedCompletedAt: null,
    },
    data: { notifiedCompletedAt: new Date() },
  });
  if (claimed.count === 0) return;

  const generation = await prisma.generation.findUnique({
    where: { id: generationId },
    include: {
      user: { include: { telegramAccount: true } },
      template: { select: { title: true } },
    },
  });

  const tg = generation?.user.telegramAccount;
  if (!tg || !generation) {
    return;
  }

  const keyboard = buildOpenMiniAppKeyboard(
    "🎬 Открыть видео",
    `/generations/${generationId}`,
  );

  const title = generation.isStudio ? "AI Studio" : generation.template.title;
  const ok = await sendWithRetry(
    tg.telegramUserId.toString(),
    `✅ Ваше видео готово!\n\n«${title}»`,
    keyboard,
  );

  if (!ok) {
    // Allow a later retry if send failed (e.g. temporary outage)
    await prisma.generation.update({
      where: { id: generationId },
      data: { notifiedCompletedAt: null },
    });
  }
}

/**
 * Sends a concise failure notification once. Skips cancelled / mid-retry.
 */
export async function notifyGenerationFailed(
  generationId: string,
): Promise<void> {
  if (!getEnv().TELEGRAM_NOTIFY_ENABLED) return;

  const claimed = await prisma.generation.updateMany({
    where: {
      id: generationId,
      status: "failed",
      notifiedFailedAt: null,
      notifiedCompletedAt: null,
    },
    data: { notifiedFailedAt: new Date() },
  });
  if (claimed.count === 0) return;

  const generation = await prisma.generation.findUnique({
    where: { id: generationId },
    include: {
      user: { include: { telegramAccount: true } },
      template: { select: { title: true } },
    },
  });

  const tg = generation?.user.telegramAccount;
  if (!tg || !generation) return;

  const title = generation.isStudio ? "AI Studio" : generation.template.title;
  const ok = await sendWithRetry(
    tg.telegramUserId.toString(),
    `⚠️ Не удалось создать видео «${title}». Кредиты возвращены, если списывались. Попробуйте ещё раз в приложении.`,
    buildOpenMiniAppKeyboard("Открыть Vidoo AI"),
  );

  if (!ok) {
    await prisma.generation.update({
      where: { id: generationId },
      data: { notifiedFailedAt: null },
    });
  }
}
