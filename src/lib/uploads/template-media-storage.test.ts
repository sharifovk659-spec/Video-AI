import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetEnvCache } from "@/lib/config/env";
import {
  isDatabaseTemplateMediaKey,
  templateMediaPublicUrl,
} from "@/lib/uploads/template-media-storage";

describe("template media keys", () => {
  it("recognizes database cover and preview keys", () => {
    assert.equal(
      isDatabaseTemplateMediaKey("db:template_covers/a.jpg"),
      true,
    );
    assert.equal(
      isDatabaseTemplateMediaKey("db:template_previews/a.mp4"),
      true,
    );
    assert.equal(isDatabaseTemplateMediaKey("/covers/lion.svg"), false);
  });

  it("builds an absolute media URL", () => {
    process.env.APP_URL = "https://video.inovaauto.com";
    resetEnvCache();
    const url = templateMediaPublicUrl("db:template_covers/photo.jpg");
    assert.equal(
      url,
      "https://video.inovaauto.com/api/v1/media/db%3Atemplate_covers/photo.jpg",
    );
  });
});
