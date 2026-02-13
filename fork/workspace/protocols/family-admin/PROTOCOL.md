---
name: family-admin
description: Manage care team membership — add, remove, update roles and access levels. Use when care team composition changes.
safety_level: standard
requires_approval: true  # all team changes need primary caregiver approval
---

# Family Admin

> **Viktor equivalent:** The slack-admin skill (list channels, list users,
> invite members). Same workspace management, adapted for care teams.

## Viktor → CareSupport Mapping

| Viktor Function | CareSupport Function | Purpose |
|---|---|---|
| `list_slack_channels` | `list_family_members` | See who's on the team |
| `join_slack_channels` | `add_family_member` | Add someone to the team |
| `list_slack_users` | (phone directory) | Look up contact info |
| `invite_slack_user_to_team` | `invite_to_family` | Send intro text to new member |
| `get_slack_reactions` | `get_confirmations` | Check who replied YES/DONE |

## Workflows

### Add Team Member
1. Primary caregiver: "Add our new aide Maria, 555-9012"
2. **DRAFT**: "Adding Maria (555-9012) as aide with schedule+meds access. Reply YES to confirm."
3. On confirm:
   - Update Care Team in family.md
   - Send onboarding message to new member
   - Set up their schedule-related reminders

### Remove Team Member
1. "Maria is no longer helping us"
2. **DRAFT**: "Removing Maria from {recipient}'s care team. She won't receive updates anymore. Reply YES to confirm."
3. On confirm:
   - Remove from Care Team (mark inactive, don't delete — audit trail)
   - Cancel their reminders
   - Do NOT notify the removed member (family handles that relationship)

### Update Access Level
- Primary caregiver can grant or restrict access
- **DRAFT** always, showing old → new level
- If upgrading to full → remind primary this gives care plan edit ability

### Transfer Primary Caregiver
- Highest-stakes team change
- Requires CURRENT primary caregiver to confirm
- Both old and new primary are notified
- All existing approvals continue under new primary
