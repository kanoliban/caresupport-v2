"""Auto-generated tool module for scheduled_crons."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from sdk.internal.client import get_client

async def create_agent_cron(path: str, description: str, cron: str, title: str | None = None, dependent_paths: list[str] | None = None, trigger_now: bool = False) -> dict:
    """Creates a scheduled cron job that runs an agent with a prompt.

    Args:
        path: Path for the cron job, e.g. '/reports/weekly'
        description: Task prompt/instructions to execute on each run.
        cron: Cron expression for scheduling
        title: Short title for the cron job
        dependent_paths: Paths to wait for before each run. Can be cron paths or thread paths.
        trigger_now: Whether to immediately run this cron job.

    Returns:
        Tool execution result
    """
    return await get_client().call("create_agent_cron", path=path, title=title, description=description, cron=cron, dependent_paths=dependent_paths, trigger_now=trigger_now)


async def create_script_cron(path: str, script_path: str, cron: str, title: str | None = None, dependent_paths: list[str] | None = None, trigger_now: bool = False) -> dict:
    """Creates a scheduled cron job that runs a Python script directly.

    Args:
        path: Path for the cron job, e.g. '/cleanup/logs'
        script_path: Path to Python script in sandbox, e.g. '/work/scripts/cleanup_logs.py'
        cron: Cron expression for scheduling
        title: Short title for the cron job
        dependent_paths: Paths to wait for before each run. Can be cron paths or thread paths.
        trigger_now: Whether to immediately run this cron job.

    Returns:
        Tool execution result
    """
    return await get_client().call("create_script_cron", path=path, title=title, script_path=script_path, cron=cron, dependent_paths=dependent_paths, trigger_now=trigger_now)


async def delete_cron(path: str | None = None, cron_id: str | None = None) -> DeleteCronResponse:
    """Deletes a scheduled cron job permanently. Requires either path or cron_id.

    Args:
        path: Path of the cron job to delete
        cron_id: ID of the cron job to delete

    Returns:
        DeleteCronResponse: Response from deleting a cron job.
    """
    return DeleteCronResponse.model_validate(await get_client().call("delete_cron", path=path, cron_id=cron_id))

class DeleteCronResponse(BaseModel):
    """Response from deleting a cron job."""

    status: str
    deleted: bool


async def trigger_cron(path: str, extra_prompt: str | None = None) -> TriggerCronResponse:
    """Manually trigger a cron job to run immediately, optionally with additional context.

    Args:
        path: Path of the cron job to trigger
        extra_prompt: Optional additional context or instructions to include when triggering.

    Returns:
        TriggerCronResponse: Response from triggering a cron job.
    """
    return TriggerCronResponse.model_validate(await get_client().call("trigger_cron", path=path, extra_prompt=extra_prompt))

class TriggerCronResponse(BaseModel):
    """Response from triggering a cron job."""

    status: str
    thread_id: str | None = None
    thread_path: str | None = None
