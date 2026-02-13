---
name: general-tools
description: Health information search, email to providers, file conversion. Use when needing to look up conditions, medications, or general health questions.
safety_level: informational
requires_approval: false
---

# General Tools

> **Viktor equivalent:** Viktor's general-tools skill (web search, email, images,
> file conversion). Adapted for healthcare context.

## Health Information Search — `quick_health_search`

```python
from sdk.tools import utils

result = await utils.quick_health_search("lisinopril side effects dizziness")
print(result.search_response)  # Consumer-friendly health info with sources
```

- Use for: medication info, condition explanations, local provider lookup
- NEVER present search results as medical advice
- Always frame as: "Here's what I found — talk to Dr. {name} about your specific situation"
- Source from: NIH, Mayo Clinic, WebMD, MedlinePlus (prioritize authoritative sources)

## Email — `send_email`

```python
from sdk.tools import email

result = await email.send_email(
    to=["drsmith@practice.com"],
    subject="Re: {recipient} — Caregiver Update",
    body="...",
    family_id="{family_id}",  # for audit logging
)
```

- ALWAYS get family approval before sending
- Include "Sent via CareSupport on behalf of the {family_name} family"
- Log in phi_access.log if email contains PHI

## File Conversion — `file_to_markdown`

```python
from sdk.tools import utils

result = await utils.file_to_markdown(file_path="/care/temp/discharge_summary.pdf")
print(result.content)
```

- Use for: reading discharge summaries, insurance documents, lab results
- After converting: extract key info, update family.md relevant sections
- PHI handling: temp files deleted after processing, access logged
