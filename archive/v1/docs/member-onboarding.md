# Member Onboarding — Adding Families and Members

## Directory Structure

```
fork/workspace/families/
└── {family_id}/
    ├── routing.json          # Phone → member mapping (runtime reads this)
    ├── family.md             # Family operational state (schedule, meds, events)
    └── members/
        └── {name}.md         # Individual member profile
```

Each family is a directory under `fork/workspace/families/`. The `family_id` is the directory name (e.g., `kano`).

## routing.json — Phone Resolution

This file maps phone numbers to family members. The runtime uses it to identify who's texting.

**Current schema** (dict-keyed by phone):
```json
{
  "family_id": "kano",
  "members": {
    "+16517037981": {
      "name": "Liban",
      "role": "primary_caregiver",
      "access_level": "full",
      "active": true,
      "chat_id": "1965f2b5-c5e6-4a08-80e9-9224b8a20d88"
    }
  },
  "care_recipient": "Degitu",
  "status": "active",
  "created": "2026-02-25",
  "notes": "Cold start. All care details to be learned through conversation."
}
```

**Fields per member:**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Display name used in prompts and logs |
| `role` | yes | One of: `care_recipient`, `primary_caregiver`, `family_caregiver`, `professional_caregiver`, `community_supporter` |
| `access_level` | yes | `full` (can see/edit everything) or `limited` (scoped view) |
| `active` | yes | Whether this member receives messages |
| `chat_id` | no | Linq chat UUID — populated after first message exchange |
| `relationship` | no | Relationship to care recipient (e.g., "grandson") |

**KNOWN ISSUE:** `sms_handler.py` resolve functions expect a file named `phone_routing.json` with `members` as an array. The actual file is `routing.json` with `members` as a dict keyed by phone. This mismatch needs reconciliation.

## Member Profile — members/{name}.md

Each member gets a profile that the agent loads into its system prompt for personalization.

**Template:**
```markdown
# {Name} — Member Profile

## Identity
- Name: {Full Name}
- Phone: {E.164 format}
- Role: {role from routing.json}
- Relationship to care recipient: {relationship}
- Access level: {full or limited}

## Communication Preferences
<!-- Learned through interaction — not pre-loaded -->
- Preferred channel:
- Language:
- Response time expectations:
- Preferred notification hours:

## Care Responsibilities
<!-- What this person handles day-to-day — learned through conversation -->

## Personal Context
<!-- Context that helps CareSupport be human, not clinical -->

## Interaction History
- {date}: {first contact event}
```

Profiles are intentionally sparse at creation. The runtime agent fills them in via the `member_updates` field in its JSON response schema, which triggers `_persist_member_updates()` in `sms_handler.py`.

## Phone Resolution Flow

When a message arrives via `poll_inbound.py`:

```
1. poll_inbound.py receives message with from_phone and chat_id
2. Calls handle_sms(from_phone, body, service=service)
3. handle_sms → resolve_member(chat_id, phone)
   a. First tries resolve_chat_id() — scans routing files for matching chat_id
   b. Falls back to resolve_phone() — scans routing files for matching phone
4. If resolved → loads family.md, member profile, builds system prompt
5. If NOT resolved → logs "Unknown phone" and skips
```

## Adding a New Family

1. Create directory: `fork/workspace/families/{family_id}/`
2. Create `routing.json` with at least one member
3. Create `family.md` with initial sections (schedule, medications, care team, events, notes)
4. Create `members/{name}.md` from template above
5. Send initial message via Linq CLI to establish chat_id:
   ```bash
   python runtime/scripts/linq_gateway.py create --to "+1..." --body "Welcome message" --service iMessage
   ```
6. Update routing.json with the returned `chat_id`

## Adding a Member to an Existing Family

1. Add phone entry to `routing.json` members dict
2. Create `members/{name}.md` from template
3. Add member to family.md care team section
4. Send intro message to establish chat_id, update routing.json
