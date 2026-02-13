"""
CareSupport Tool Gateway Client

Viktor equivalent: sdk/internal/client.py — identical pattern.

The gateway sits between the agent and all external APIs. It holds OAuth
tokens, API keys, and HIPAA-compliant credential storage. The agent never
sees credentials.

Architecture:
  Agent  ─── HTTPS POST ───>  Care Gateway  ─── OAuth/API ───>  External Service
  (sandbox)   bearer token    (gateway URL)      tokens held     (Twilio, Epic, etc.)
                              HIPAA-compliant    by gateway
                              credential vault

Key difference from Viktor: the gateway ALSO handles PHI audit logging.
Every call that touches patient data is logged server-side, not just client-side.
"""

import os
import httpx


class CareToolClient:
    def __init__(self):
        self.gateway_url = os.environ.get("CARE_GATEWAY_URL")
        self.auth_token = os.environ.get("CARE_AUTH_TOKEN")
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.gateway_url,
                headers={
                    "Authorization": f"Bearer {self.auth_token}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    async def call(self, role: str, **kwargs) -> dict:
        """Call a tool through the gateway.

        The gateway:
        1. Validates the auth token
        2. Resolves the tool (role → handler)
        3. Handles OAuth/API auth to the external service
        4. Logs PHI access if the tool touches patient data
        5. Returns the result as JSON

        Args:
            role: The tool identifier (e.g., "send_message", "check_interactions")
            **kwargs: Tool-specific arguments

        Returns:
            Tool response as dict
        """
        client = self._get_client()
        response = await client.post(
            "/v1/tools/call",
            json={"role": role, "arguments": kwargs},
        )
        response.raise_for_status()
        return response.json()


_client = None


def get_client() -> CareToolClient:
    """Get or create the singleton gateway client."""
    global _client
    if _client is None:
        _client = CareToolClient()
    return _client
