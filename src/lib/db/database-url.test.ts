import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  databaseUrlForRuntime,
  mysqlHostname,
  replaceMysqlHost,
} from "@/lib/db/database-url";

const sample =
  "mysql://user:p%40ss@srv1482.hstgr.io:3306/u417315406_Video";

describe("database url", () => {
  it("reads the host after the last @", () => {
    assert.equal(mysqlHostname(sample), "srv1482.hstgr.io");
  });

  it("replaces only the hostname", () => {
    const next = replaceMysqlHost(sample, "195.35.59.14");
    assert.equal(
      next,
      "mysql://user:p%40ss@195.35.59.14:3306/u417315406_Video",
    );
  });

  it("uses IPv4 and a single connection on serverless", () => {
    const next = databaseUrlForRuntime(sample, {
      serverless: true,
      resolveIpv4: () => "195.35.59.14",
    });
    assert.match(next ?? "", /@195\.35\.59\.14:3306\//);
    assert.match(next ?? "", /connection_limit=1/);
    assert.match(next ?? "", /user:p%40ss@/);
  });

  it("leaves a local database url unchanged", () => {
    const local = "mysql://root@localhost:3308/vidoo_ai";
    const next = databaseUrlForRuntime(local, {
      serverless: false,
      resolveIpv4: () => {
        throw new Error("should not resolve");
      },
    });
    assert.equal(next, local);
  });
});
