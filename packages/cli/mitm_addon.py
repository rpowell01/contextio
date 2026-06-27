"""
mitmproxy addon for contextio.

Rewrites intercepted HTTPS requests to route through the contextio
proxy. mitmproxy handles TLS termination; the contextio proxy handles
redaction, logging, and forwarding to the real API.

Sets the 'x-target-url' header with the original destination URL so
the contextio proxy can forward to the correct upstream. This header
is only trusted when CONTEXT_PROXY_ALLOW_TARGET_OVERRIDE=1 is set.

No capture logic here. That all lives in the Node.js plugin pipeline.

Environment variables:
  CONTEXTIO_PROXY_URL  - contextio proxy base URL (required)
  CONTEXTIO_SOURCE     - tool name for source tagging (default: "unknown")
  CONTEXTIO_SESSION_ID - session ID for source tagging (default: "")
"""

import os

from mitmproxy import http

PROXY_URL = os.environ.get("CONTEXTIO_PROXY_URL", "").strip()
SOURCE = os.environ.get("CONTEXTIO_SOURCE", "unknown").strip()
SESSION_ID = os.environ.get("CONTEXTIO_SESSION_ID", "").strip()


def request(flow: http.HTTPFlow) -> None:
    """Rewrite the request to route through the contextio proxy."""
    if not PROXY_URL:
        return

    # Store the original URL for the contextio proxy to forward to
    flow.request.headers["x-target-url"] = flow.request.url

    # Build source-tagged path: /{source}/{sessionId}{original_path}
    source_prefix = f"/{SOURCE}"
    if SESSION_ID:
        source_prefix += f"/{SESSION_ID}"

    # Rewrite the URL to go through the contextio proxy
    flow.request.url = PROXY_URL + source_prefix + flow.request.path
