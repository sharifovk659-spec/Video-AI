import { Bot } from "grammy";
import type { BotContext } from "@/bot/context";
import { registerHelpCommand } from "@/bot/commands/help";
import { registerProfileCommand } from "@/bot/commands/profile";
import { registerStartCommand } from "@/bot/commands/start";
import { handleBotError } from "@/bot/errors";
import { syncTelegramUserMiddleware } from "@/bot/middleware/sync-user";

export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  bot.use(syncTelegramUserMiddleware);

  registerStartCommand(bot);
  registerHelpCommand(bot);
  registerProfileCommand(bot);

  bot.catch(handleBotError);

  return bot;
}
