"""
Role Filter — HIPAA-compliant content filtering based on care team access level.

Viktor equivalent: None. Viktor has no concept of information access levels.
Every Slack user in the workspace sees the same information (modulo channels).

In care coordination, a home aide should NOT see insurance details, family
financial discussions, or end-of-life care decisions. A provider should NOT see
the family's personal conversations or financial information.

This filter runs BEFORE the agent sends a response, not after.
"""


class RoleFilter:
    """Filter agent responses based on care team member's access level."""

    # What each access level can see
    ACCESS_MATRIX = {
        "full": {
            "sections": ["*"],  # Everything
            "can_approve_changes": True,
            "can_see_insurance": True,
            "can_see_decision_history": True,
        },
        "schedule+meds": {
            "sections": ["schedule", "medications", "urgent_notes", "care_team",
                         "care_preferences", "emergency_protocols"],
            "can_approve_changes": False,
            "can_see_insurance": False,
            "can_see_decision_history": False,
        },
        "schedule": {
            "sections": ["schedule", "urgent_notes", "care_team", "emergency_protocols"],
            "can_approve_changes": False,
            "can_see_insurance": False,
            "can_see_decision_history": False,
        },
        "provider": {
            "sections": ["medications", "medical_conditions", "allergies",
                         "appointments", "care_team", "lab_results", "visit_history"],
            "can_approve_changes": False,
            "can_see_insurance": False,
            "can_see_decision_history": False,
        },
    }

    def can_see(self, access_level: str, section: str) -> bool:
        """Check if a member can see a specific section of family.md."""
        config = self.ACCESS_MATRIX.get(access_level, {})
        allowed = config.get("sections", [])
        return "*" in allowed or section in allowed

    def can_approve(self, access_level: str) -> bool:
        """Check if a member can approve care plan changes."""
        config = self.ACCESS_MATRIX.get(access_level, {})
        return config.get("can_approve_changes", False)

    def filter_response(self, response: str, access_level: str,
                        content_sections: list[str]) -> str:
        """Filter an agent response to remove sections the member can't see.

        This is a safety net. The agent SHOULD already be composing responses
        appropriate for the member's access level (it sees the access level in
        the context). But this filter catches any leakage.

        Args:
            response: The agent's draft response
            access_level: The receiving member's access level
            content_sections: What types of information the response contains

        Returns:
            Filtered response (or original if everything is allowed)
        """
        config = self.ACCESS_MATRIX.get(access_level, {})
        allowed = config.get("sections", [])

        if "*" in allowed:
            return response  # Full access, no filtering needed

        # Check if any content section is restricted
        restricted = [s for s in content_sections if s not in allowed]
        if restricted:
            # Strip restricted content and note the omission
            # Implementation depends on how responses are structured
            return self._redact_sections(response, restricted)

        return response

    def _redact_sections(self, response: str, restricted_sections: list[str]) -> str:
        """Redact restricted sections from a response.

        Rather than showing [REDACTED], simply omit the information.
        The member doesn't need to know what they can't see.
        """
        # Platform-level implementation
        raise NotImplementedError("Platform implements content redaction")
