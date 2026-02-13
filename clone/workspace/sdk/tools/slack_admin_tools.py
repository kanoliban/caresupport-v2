"""Auto-generated tool module for slack_admin_tools."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from sdk.internal.client import get_client

async def coworker_list_slack_channels() -> CoworkerListSlackChannelsResponse:
    """List all Slack channels with their access status.

    Returns:
        CoworkerListSlackChannelsResponse: Response listing Slack channels.
    """
    return CoworkerListSlackChannelsResponse.model_validate(await get_client().call("coworker_list_slack_channels", ))

class CoworkerListSlackChannelsResponse(BaseModel):
    """Response listing Slack channels."""

    info: str
    channels: list[dict]  # List of channels with id, name, is_private, bot_has_access


async def coworker_join_slack_channels(channel_ids: list[str]) -> CoworkerJoinSlackChannelsResponse:
    """Join one or more public Slack channels.

    Use this to explicitly join channels before reading them. Only works for
    public channels - private channels require the user to invite you.

    Args:
        channel_ids: List of channel IDs (e.g., ['C01ABC123', 'C02DEF456']) to join

    Returns:
        CoworkerJoinSlackChannelsResponse: Response from joining Slack channels.
    """
    return CoworkerJoinSlackChannelsResponse.model_validate(await get_client().call("coworker_join_slack_channels", channel_ids=channel_ids))

class CoworkerJoinSlackChannelsResponse(BaseModel):
    """Response from joining Slack channels."""

    results: list[dict]  # List of results with channel_id, channel_name, success, error (if any)


async def coworker_list_slack_users(include_bots: bool = False) -> CoworkerListSlackUsersResponse:
    """List users in the Slack workspace.

    Args:
        include_bots: Whether to include bot users in the results

    Returns:
        CoworkerListSlackUsersResponse: Response listing Slack users.
    """
    return CoworkerListSlackUsersResponse.model_validate(await get_client().call("coworker_list_slack_users", include_bots=include_bots))

class CoworkerListSlackUsersResponse(BaseModel):
    """Response listing Slack users."""

    users: list[dict]  # List of users with id, name, real_name, display_name, email, is_bot, is_admin, has_viktor_account


async def coworker_invite_slack_user_to_team(slack_user_id: str, message: str = "") -> CoworkerInviteSlackUserToTeamResponse:
    """Invite a Slack user to join the team by sending them a DM with an invite link.

    Args:
        slack_user_id: The Slack user ID (e.g., U123ABC)
        message: Optional personalized message

    Returns:
        CoworkerInviteSlackUserToTeamResponse: Response from inviting a Slack user to the team.
    """
    return CoworkerInviteSlackUserToTeamResponse.model_validate(await get_client().call("coworker_invite_slack_user_to_team", slack_user_id=slack_user_id, message=message))

class CoworkerInviteSlackUserToTeamResponse(BaseModel):
    """Response from inviting a Slack user to the team."""

    success: bool
    error: str | None = None  # Error if invite failed
    invite_id: str | None = None  # Created team invite ID
    invited_email: str | None = None  # Email of invited user
    invited_name: str | None = None  # Display name of invited user


async def coworker_get_slack_reactions(channel_id: str, message_ts: str) -> CoworkerGetSlackReactionsResponse:
    """Get reactions for a Slack message by timestamp.

    Args:
        channel_id: Channel ID (or user ID for DMs)
        message_ts: Timestamp of message to fetch reactions for

    Returns:
        CoworkerGetSlackReactionsResponse: Response from fetching Slack reactions.
    """
    return CoworkerGetSlackReactionsResponse.model_validate(await get_client().call("coworker_get_slack_reactions", channel_id=channel_id, message_ts=message_ts))

class CoworkerGetSlackReactionsResponse(BaseModel):
    """Response from fetching Slack reactions."""

    found: bool  # Whether the message was found
    reactions: list[dict]  # List of reactions with name, count, and optional users
    error: str | None = None  # Error if fetch failed
    info: str | None = None  # Extra info (e.g., no reactions)
