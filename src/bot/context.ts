import type { Context } from "grammy";
import type { TelegramUserRecord } from "@/lib/users/upsert-telegram-user";

export type BotContext = Context & {
  dbUser?: TelegramUserRecord;
};
