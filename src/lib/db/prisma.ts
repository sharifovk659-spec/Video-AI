import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { databaseUrlForRuntime } from "@/lib/db/database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveIpv4(hostname: string): string {
  const script =
    "const dns=require('node:dns');dns.lookup(process.argv[1],{family:4},(e,a)=>{if(e||!a){process.exit(1)}process.stdout.write(a)})";
  return execFileSync(process.execPath, ["-e", script, hostname], {
    encoding: "utf8",
    timeout: 5_000,
  }).trim();
}

function runtimeDatabaseUrl(): string | undefined {
  return databaseUrlForRuntime(process.env.DATABASE_URL, {
    serverless: process.env.VERCEL === "1",
    resolveIpv4,
  });
}

const databaseUrl = runtimeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
