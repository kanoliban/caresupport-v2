"""Auto-generated tool module for browser_tools."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from sdk.internal.client import get_client

async def browser_create_session(starting_url: str | None = None, viewport_width: int = 1024, viewport_height: int = 768, enable_proxies: bool = False, timeout_seconds: int = 300) -> BrowserCreateSessionResponse:
    """Create a new Browserbase session and return connection info.

    Args:
        starting_url: Optional URL to open after connecting in the sandbox
        viewport_width: Viewport width in pixels
        viewport_height: Viewport height in pixels
        enable_proxies: Enable Browserbase proxies
        timeout_seconds: Session timeout in seconds (keep_alive)

    Returns:
        BrowserCreateSessionResponse: Response with session info for connecting.
    """
    return BrowserCreateSessionResponse.model_validate(await get_client().call("browser_create_session", starting_url=starting_url, viewport_width=viewport_width, viewport_height=viewport_height, enable_proxies=enable_proxies, timeout_seconds=timeout_seconds))

class BrowserCreateSessionResponse(BaseModel):
    """Response with session info for connecting."""

    session_id: str | None = None  # Browserbase session ID
    connect_url: str | None = None  # CDP connect URL containing a session signingKey (safe for sandbox)
    live_view_url: str | None = None  # Live session URL for viewing the browser
    recording_url: str | None = None  # Browserbase session recording URL
    error: str | None = None  # Error message if failed


async def browser_download_files(session_id: str, target_directory: str = "/work/downloads") -> BrowserDownloadFilesResponse:
    """Download files from a browser session to the sandbox.

    Args:
        session_id: Browserbase session ID
        target_directory: Target directory in sandbox for downloaded files

    Returns:
        BrowserDownloadFilesResponse: Response from downloading files.
    """
    return BrowserDownloadFilesResponse.model_validate(await get_client().call("browser_download_files", session_id=session_id, target_directory=target_directory))

class BrowserDownloadFilesResponse(BaseModel):
    """Response from downloading files."""

    files: list[str]  # Downloaded file paths
    error: str | None = None  # Error message if failed


async def browser_close_session(session_id: str) -> BrowserCloseSessionResponse:
    """Close a browser session to release resources.

    Args:
        session_id: Browserbase session ID

    Returns:
        BrowserCloseSessionResponse: Response from closing a session.
    """
    return BrowserCloseSessionResponse.model_validate(await get_client().call("browser_close_session", session_id=session_id))

class BrowserCloseSessionResponse(BaseModel):
    """Response from closing a session."""

    success: bool  # Whether the close succeeded
    error: str | None = None  # Error message if failed
