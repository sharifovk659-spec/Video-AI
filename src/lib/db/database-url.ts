/**
 * Hostinger publishes an IPv6 address for srv*.hstgr.io.
 * Prisma's engine often tries that first on Vercel and fails with
 * "Can't reach database server", which breaks Mini App login.
 * Keep the credentials untouched and point the host at IPv4.
 */

export function mysqlHostname(raw: string): string | null {
  if (!raw.startsWith("mysql://")) return null;
  const at = raw.lastIndexOf("@");
  if (at < 0) return null;
  const rest = raw.slice(at + 1);
  const hostEnd = rest.search(/[:/?]/);
  const host = hostEnd === -1 ? rest : rest.slice(0, hostEnd);
  return host || null;
}

export function replaceMysqlHost(raw: string, nextHost: string): string {
  const host = mysqlHostname(raw);
  if (!host || host === nextHost) return raw;
  const at = raw.lastIndexOf("@");
  const rest = raw.slice(at + 1);
  return raw.slice(0, at + 1) + nextHost + rest.slice(host.length);
}

export function withServerlessPool(raw: string): string {
  if (raw.includes("connection_limit=")) return raw;
  const joiner = raw.includes("?") ? "&" : "?";
  return `${raw}${joiner}connection_limit=1&pool_timeout=20&connect_timeout=20`;
}

export function databaseUrlForRuntime(
  raw: string | undefined,
  options: {
    serverless: boolean;
    resolveIpv4: (hostname: string) => string;
  },
): string | undefined {
  if (!raw) return raw;
  let url = raw;
  const host = mysqlHostname(raw);
  if (host?.endsWith(".hstgr.io")) {
    try {
      const ip = options.resolveIpv4(host);
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        url = replaceMysqlHost(url, ip);
      }
    } catch {
      // Keep the hostname if DNS lookup fails.
    }
  }
  if (options.serverless) {
    url = withServerlessPool(url);
  }
  return url;
}
