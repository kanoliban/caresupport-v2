# Family Onboarding — What Happens When a New Family Signs Up

> Viktor equivalent: clone/onboarding/README.md — same document,
> adapted from "install Slack app" to "text START."

## Viktor vs CareSupport Onboarding

| Step | Viktor | CareSupport |
|---|---|---|
| Entry point | Admin installs Slack app | Family texts START to CareSupport number |
| Identity | OAuth → Slack workspace | Phone number → new family record |
| Research | Web search company domain | 3-5 questions via SMS |
| Context file | company/SKILL.md | families/{id}/family.md |
| Team file | team/SKILL.md | Care Team section in family.md |
| First crons | heartbeat, channel_intros, workflow_discovery | check-ins, medication reminders |
| Channel join | Bot joins Slack channels | Agent texts each care team member |
| Ongoing learning | Read Slack history | Read conversation logs |

## Onboarding Sequence

1. **Family texts START** → platform creates family record, assigns family_id
2. **3-5 setup questions** over SMS (see family-onboarding protocol)
3. **family.md created** from template + answers
4. **Primary caregiver confirms** the summary (draft/approval pattern)
5. **Care team onboarded** — each member gets an intro text
6. **Default schedules created** — morning/evening check-ins
7. **Medication reminders set up** if medications were provided
8. **Needs assessment** runs over first week (adaptive discovery)

## Created After Onboarding

```
/care/
├── families/{family_id}/
│   └── family.md                    ← THE FILE
├── conversations/
│   ├── {primary_phone}/2026-02.log  ← onboarding conversation
│   └── {member_phone}/2026-02.log   ← intro message logs
├── schedules/
│   ├── {family_id}-morning-checkin/  ← 8am daily
│   ├── {family_id}-evening-checkin/  ← 8pm daily
│   └── {family_id}-{med}-{time}/    ← per medication
└── logs/
    └── 2026-02-13/
        ├── global.log               ← agent activity
        └── phi_access.log           ← PHI access events
```
