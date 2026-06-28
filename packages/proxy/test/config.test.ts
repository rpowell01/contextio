import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { resolveConfig } from "../src/config.js";

describe("resolveConfig", () => {
  const originalEnv = process.env;

  before(() => {
    // Clean env for each test
    process.env = { ...originalEnv };
    delete process.env.UPSTREAM_OPENAI_URL;
    delete process.env.UPSTREAM_NVIDIA_URL;
    delete process.env.UPSTREAM_KILO_URL;
    delete process.env.UPSTREAM_OPENROUTER_URL;
    delete process.env.STRICT_URL_FORWARDING;
  });

  after(() => {
    process.env = originalEnv;
  });

  it("returns default config with all required fields", () => {
    const config = resolveConfig();

    assert.equal(config.bindHost, "127.0.0.1");
    assert.equal(config.port, 4040);
    assert.equal(config.allowTargetOverride, false);
    assert.equal(config.strictUrlForwarding, false);
    assert.ok(config.upstreams);
  });

  it("applies programmatic overrides", () => {
    const config = resolveConfig({
      port: 9999,
      bindHost: "0.0.0.0",
      allowTargetOverride: true,
      strictUrlForwarding: true,
    });

    assert.equal(config.port, 9999);
    assert.equal(config.bindHost, "0.0.0.0");
    assert.equal(config.allowTargetOverride, true);
    assert.equal(config.strictUrlForwarding, true);
  });

  it("applies upstream overrides", () => {
    const config = resolveConfig({
      upstreams: {
        openai: "https://custom.openai.com",
        nvidia: "https://custom.nvidia.com",
      },
    });

    assert.equal(config.upstreams.openai, "https://custom.openai.com");
    assert.equal(config.upstreams.nvidia, "https://custom.nvidia.com");
  });

  it("normalizes trailing /v1 from NVIDIA URL", () => {
    const config = resolveConfig({
      upstreams: {
        nvidia: "https://integrate.api.nvidia.com/v1",
      },
    });

    assert.equal(config.upstreams.nvidia, "https://integrate.api.nvidia.com");
  });

  it("normalizes trailing /v1 from OpenRouter URL", () => {
    const config = resolveConfig({
      upstreams: {
        openrouter: "https://openrouter.ai/api/v1",
      },
    });

    assert.equal(config.upstreams.openrouter, "https://openrouter.ai/api");
  });

  it("normalizes trailing /v1 from Kilo URL", () => {
    const config = resolveConfig({
      upstreams: {
        kilo: "https://api.kilo.ai/api/gateway/v1",
      },
    });

    assert.equal(config.upstreams.kilo, "https://api.kilo.ai/api/gateway");
  });

  it("normalizes trailing /v1 from OpenAI URL", () => {
    const config = resolveConfig({
      upstreams: {
        openai: "https://api.openai.com/v1",
      },
    });

    assert.equal(config.upstreams.openai, "https://api.openai.com");
  });

  it("preserves URLs without trailing /v1", () => {
    const config = resolveConfig({
      upstreams: {
        openai: "https://api.openai.com",
        nvidia: "https://integrate.api.nvidia.com",
        openrouter: "https://openrouter.ai/api",
        kilo: "https://api.kilo.ai/api/gateway",
      },
    });

    assert.equal(config.upstreams.openai, "https://api.openai.com");
    assert.equal(config.upstreams.nvidia, "https://integrate.api.nvidia.com");
    assert.equal(config.upstreams.openrouter, "https://openrouter.ai/api");
    assert.equal(config.upstreams.kilo, "https://api.kilo.ai/api/gateway");
  });

  it("does not modify URLs with /v1 in the middle", () => {
    const config = resolveConfig({
      upstreams: {
        openai: "https://api.openai.com/v1/chat/completions",
      },
    });

    assert.equal(
      config.upstreams.openai,
      "https://api.openai.com/v1/chat/completions",
    );
  });

  it("reads STRICT_URL_FORWARDING from environment", () => {
    process.env.STRICT_URL_FORWARDING = "true";
    const config = resolveConfig();

    assert.equal(config.strictUrlForwarding, true);
  });

  it("ignores invalid STRICT_URL_FORWARDING values", () => {
    process.env.STRICT_URL_FORWARDING = "1";
    const config = resolveConfig();

    assert.equal(config.strictUrlForwarding, false);
  });
});