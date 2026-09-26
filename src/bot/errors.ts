import type { BotError } from "grammy";
import type { BotContext } from "@/bot/context";
import { createLogger } from "@/lib/logger";

const log = createLogger("bot");

const USER_MESSAGE =
  "⚠️ Что-то пошло не так. Попробуйте ещё раз чуть позже.";

export async function handleBotError(error: BotError<BotContext>): Promise<void> {
  log.error("Bot handler error", {
    message: error.message,
    updateId: error.ctx.update.update_id,
    errorName: error.error instanceof Error ? error.error.name : "Unknown",
  });

  try {
    await error.ctx.reply(USER_MESSAGE);
  } catch (replyError) {
    log.error("Failed to send bot error reply", {
      message:
        replyError instanceof Error ? replyError.message : String(replyError),
    });
  }
}
