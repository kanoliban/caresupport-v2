# CareSupport SDK Tools
#
# Viktor equivalent: sdk/tools/__init__.py
# Same pattern: each module wraps gateway calls for a specific domain.
#
# Core modules (always present):
#   messaging      — Send/receive iMessage/SMS (was: default_tools / Slack)
#   family_admin   — Manage care team members (was: slack_admin_tools)
#   care_schedules — Recurring reminders and check-ins (was: scheduled_crons)
#   email          — Provider/insurance email (was: email_tools)
#   utils          — Health search, file conversion (was: utils_tools)
#   emergency      — Urgent alerts and escalation (NEW)
#
# Healthcare integration modules (present when connected):
#   pharmacy       — Medication lookup, refills (via Surescripts)
#   calendar       — Appointment management (via Google/Apple Calendar)
#   insurance      — Coverage and claims (via payer APIs)
#   health_records — Lab results, visit summaries (via Epic/Cerner/FHIR)
