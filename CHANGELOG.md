# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **kilo**: Added Kilo Code Gateway routing support. Detect via `x-kilo-baseurl` (URL header). Routes to `/api/gateway` path. Default: `https://api.kilo.ai/api/gateway`.
- **openrouter**: Added OpenRouter routing support. Detect via `x-openrouter-baseurl` (URL header). Routes to `/api/` path. Default: `https://openrouter.ai/api`.
- **nvidia**: Added NVIDIA routing support. Detect via `x-nvidia-baseurl` (URL header) or `Bearer nv-*` token prefix. Routes to `/v1/chat/completions` path. Default: `https://integrate.api.nvidia.com`.
- **openai**: Added `x-openai-baseurl` header detection for URL override capability.

### Fixed

- **routing**: Fixed incorrect default URLs - removed `/v1` suffix from NVIDIA (`https://integrate.api.nvidia.com`) and OpenRouter (`https://openrouter.ai/api`) defaults. The request path already contains API version segments.
- **routing**: Fixed syntax error in `resolveTargetUrl()` where OpenAI provider handling was missing proper else-if chain.
- **config**: Verified all default upstreams are properly defined (openai, anthropic, gemini, chatgpt, vertex, nvidia, kilo, openrouter).
- **config**: Added automatic stripping of trailing `/v1` from upstream URLs (both environment variables and header overrides) to prevent double-prefixing since request paths already contain API version segments.
- **tests**: Fixed OpenRouter and Kilo tests to include required header detection (`x-openrouter-baseurl`, `x-kilo-baseurl`).
- **tests**: Added verification tests for `STRICT_URL_FORWARDING` behavior - when enabled, headers (`x-nvidia-baseurl`, `x-kilo-baseurl`, `x-openrouter-baseurl`, `x-openai-baseurl`) are ignored and path-based classification is used. NVIDIA Bearer token detection (`Bearer nv-*`) is unaffected by strict mode.
- **config**: Added null/undefined handling in `normalizeUpstreamUrl()` for robustness. URLs without trailing `/v1` pass through unchanged.

### Changed

- **routing**: Removed presence header checks (`x-*-client`) in favor of URL header detection only. Detection order is now: ChatGPT → Anthropic → Gemini → Vertex → OpenAI (path) → NVIDIA → OpenRouter → Kilo → OpenAI (header).
- **routing**: Added `strictUrlForwarding` parameter to `classifyRequest()` to skip header-based detection when enabled.
- **routing**: Improved logging format for strict URL forwarding warnings with `[StrictURLForwarding]` prefix.
- **types**: Added `nvidia`, `openrouter`, `kilo` to `Provider` type and `Upstreams` interface to fix TypeScript compilation errors.

## [0.3.1] - 2026-06-27

### Fixed

- **mitm_addon.py**: Fixed mitmproxy addon not injecting `x-target-url` header, which caused the contextio proxy to ignore the `CONTEXT_PROXY_ALLOW_TARGET_OVERRIDE` setting when routing requests through contexts that use HTTPS_PROXY (e.g., Codex, OpenCode, Copilot CLI). The addon now properly sets the `x-target-url` header with the original destination URL before rewriting the request to route through the contextio proxy.

- **forward.ts**: Simplified the `x-target-url` header trust model. The header is now trusted when `allowTargetOverride` is enabled, without requiring the additional check for local remote address. This aligns with the mitmproxy addon use case where the proxy forwards requests with the original target URL.

### Changed

- **forward.ts**: Removed `isLocalRemote()` function and `remoteAddr` parameter from `headersForResolution()` as the local address check is no longer needed.

### Documentation

- Clarified that for Docker container usage with custom upstreams (e.g., NVIDIA), use `UPSTREAM_OPENAI_URL` environment variable instead of `x-target-url` header.

## [0.3.0] - Previous release

### Added

- Initial mitmproxy addon support for tools that respect HTTPS_PROXY
- Support for Claude, Pi, Gemini CLI, Aider, Codex, OpenCode, Copilot CLI

[Unreleased]: https://github.com/larsderidder/contextio/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/larsderidder/contextio/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/larsderidder/contextio/releases/tag/v0.3.0