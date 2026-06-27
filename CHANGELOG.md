# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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