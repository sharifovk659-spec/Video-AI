import { NextRequest, NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { getEnv } from "@/lib/config/env";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { createBot } from "@/bot/create-bot";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const secret = getEnv().TELEGRAM_BOT_WEBHOOK_SECRET;
    if (secret) {
      const header = request.headers.get("x-telegram-bot-api-secret-token");
      if (header !== secret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const token = getEnv().TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const handleUpdate = webhookCallback(createBot(token), "std/http");
    return handleUpdate(request);
  } catch (error) {
    return handleApiError(error);
  }
}
