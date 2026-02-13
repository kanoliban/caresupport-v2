"""Auto-generated tool module for viktor_spaces_tools."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from sdk.internal.client import get_client

async def init_app_project(project_name: str, description: str | None = None) -> InitAppProjectResponse:
    """Initialize a new web app project with Convex backend and Vercel hosting.

    Args:
        project_name: Unique name for the project (lowercase, alphanumeric, hyphens)
        description: Brief description of what this app will do

    Returns:
        InitAppProjectResponse: 
    """
    return InitAppProjectResponse.model_validate(await get_client().call("init_app_project", project_name=project_name, description=description))

class InitAppProjectResponse(BaseModel):
    success: bool
    project_name: str | None = None
    sandbox_path: str | None = None
    convex_url_dev: str | None = None
    convex_url_prod: str | None = None
    error: str | None = None


async def deploy_app(project_name: str, environment: Literal['preview', 'production'], commit_message: str | None = None) -> DeployAppResponse:
    """Deploy an app to preview or production environment.

    Args:
        project_name: Name of the project to deploy
        environment: Target environment
        commit_message: Git commit message for changes (auto-generated if not provided)

    Returns:
        DeployAppResponse: 
    """
    return DeployAppResponse.model_validate(await get_client().call("deploy_app", project_name=project_name, environment=environment, commit_message=commit_message))

class DeployAppResponse(BaseModel):
    success: bool
    environment: str | None = None
    url: str | None = None
    vercel_url: str | None = None
    convex_deployment: str | None = None
    error: str | None = None


async def list_apps() -> ListAppsResponse:
    """List all app projects created by this coworker.

    Returns:
        ListAppsResponse: 
    """
    return ListAppsResponse.model_validate(await get_client().call("list_apps", ))

class ListAppsResponse(BaseModel):
    apps: list[dict]


async def get_app_status(project_name: str) -> GetAppStatusResponse:
    """Get detailed status of an app project.

    Args:
        project_name: Name of the project

    Returns:
        GetAppStatusResponse: 
    """
    return GetAppStatusResponse.model_validate(await get_client().call("get_app_status", project_name=project_name))

class GetAppStatusResponse(BaseModel):
    project_name: str
    sandbox_path: str | None = None
    convex_url_dev: str | None = None
    convex_url_prod: str | None = None
    preview_url: str | None = None
    production_url: str | None = None
    last_deployed_at: str | None = None
    error: str | None = None


async def query_app_database(project_name: str, function_name: str, args: dict | None = None, environment: Literal['dev', 'prod'] = "prod") -> QueryAppDatabaseResponse:
    """Query data from an app's Convex database. Runs a query function against the specified environment.

    Args:
        project_name: Name of the app project
        function_name: Convex function to call (e.g., 'users:list', 'tasks:getByStatus')
        args: Arguments to pass to the function as JSON object
        environment: Which environment to query (dev or prod)

    Returns:
        QueryAppDatabaseResponse: 
    """
    return QueryAppDatabaseResponse.model_validate(await get_client().call("query_app_database", project_name=project_name, function_name=function_name, args=args, environment=environment))

class QueryAppDatabaseResponse(BaseModel):
    success: bool
    data: dict | list | None = None
    error: str | None = None


async def delete_app_project(project_name: str) -> DeleteAppProjectResponse:
    """Delete an app project and all its resources (Convex deployments, Vercel project, sandbox files).

    Args:
        project_name: Name of the project to delete

    Returns:
        DeleteAppProjectResponse: 
    """
    return DeleteAppProjectResponse.model_validate(await get_client().call("delete_app_project", project_name=project_name))

class DeleteAppProjectResponse(BaseModel):
    success: bool
    project_name: str | None = None
    deleted_resources: list[str] | None = None
    error: str | None = None
