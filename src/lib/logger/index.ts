import { getEnv } from "@/lib/config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  try {
    const min = getEnv().LOG_LEVEL;
    return LEVEL_ORDER[level] >= LEVEL_ORDER[min];
  } catch {
    return level !== "debug";
  }
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    write("error", message, meta),
};

export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: Record<string, unknown>) =>
      logger.debug(message, { scope, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) =>
      logger.info(message, { scope, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) =>
      logger.warn(message, { scope, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) =>
      logger.error(message, { scope, ...meta }),
  };
}
