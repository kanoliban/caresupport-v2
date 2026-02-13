"""HTTP client for the Tool Gateway."""

import os
from typing import Any

import httpx


class ToolClient:
    """Async client for calling tools through the gateway."""

    def __init__(self):
        self.gateway_url = os.getenv("TOOL_GATEWAY_URL", "https://api.jace.ai/v1/tools")
        self.token = os.getenv("TOOL_TOKEN", "")

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    async def call(self, role: str, **kwargs) -> Any:
        """Call a tool through the gateway.

        Args:
            role: The tool role identifier
            **kwargs: Tool arguments

        Returns:
            The tool result

        Raises:
            Exception: If the call fails
        """
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.post(
                f"{self.gateway_url}/call",
                headers=self._get_headers(),
                json={
                    "role": role,
                    "arguments": kwargs,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Gateway error: {response.status_code} - {response.text}")

            data = response.json()
            if data.get("error"):
                raise Exception(f"Tool error: {data['error']}")

            return data.get("result")


_client = ToolClient()


def get_client() -> ToolClient:
    """Get the global ToolClient instance."""
    return _client
