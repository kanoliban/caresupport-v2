"""Auto-generated tool module for thread_orchestration_tools."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from sdk.internal.client import get_client

class PathInfo(BaseModel):
    """Information about any path - can be a cron job or thread."""

    path_type: Literal['cron', 'thread', 'not_found']
    cron: dict | None = None
    thread: dict | None = None

class CronInfo(BaseModel):
    """Information about a cron job."""

    id: str
    path: str
    title: str
    description: str | None = None
    script_path: str | None = None
    execution_type: str
    cron: str
    dependent_paths: list[str] | None = None
    deleted: bool
    created_at: str
    updated_at: str
    threads: list[dict]  # Threads under this cron job
    depth: int

class ThreadInfo(BaseModel):
    """Information about a thread."""

    id: str
    title: str | None = None
    status: str | None = None
    timestamp: str | None = None
    updated: str | None = None
    path: str | None = None
    thread_type: str | None = None


async def list_running_paths() -> ListRunningPathsResponse:
    """List all currently running threads.

    Returns:
        ListRunningPathsResponse: Response listing running paths.
    """
    return ListRunningPathsResponse.model_validate(await get_client().call("list_running_paths", ))

class ListRunningPathsResponse(BaseModel):
    """Response listing running paths."""

    running_paths: list[str]  # List of paths currently running


async def get_path_info(path: str) -> GetPathInfoResponse:
    """Get detailed information about a path. Works for cron jobs and threads.

    Args:
        path: The path to get info for

    Returns:
        GetPathInfoResponse: Response for getting path info.
    """
    return GetPathInfoResponse.model_validate(await get_client().call("get_path_info", path=path))

class GetPathInfoResponse(BaseModel):
    """Response for getting path info."""

    info: PathInfo | None = None
    error: str | None = None
