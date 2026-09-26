import { getEnv } from "@/lib/config/env";
import { createLogger } from "@/lib/logger";
import { createBot } from "@/bot/create-bot";

const log = createLogger("bot");

async function main() {
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to run the bot");
  }

  const bot = createBot(token);
  log.info("Starting bot (long polling)");
  await bot.start();
}

main().catch((error) => {
  log.error("Bot failed to start", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
