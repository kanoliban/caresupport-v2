---
name: general-tools
description: Search the web, send emails, generate images, convert files to markdown, and look up library docs. Use when a task needs one of these general-purpose tools.
---

These tools are only available via Python scripts (`from sdk.tools import ...`). They are *not* in your native tool list, so actively remember they exist.

## 1. Web Search — `quick_ai_search`

Search the web for current information. Use whenever asked about real-time data (weather, news, prices, events), factual lookups, or anything your training data might not cover.

```python
from sdk.tools import utils_tools

result = await utils_tools.quick_ai_search("weather in Amsterdam this weekend")
print(result.search_response)  # Bullets/table with links
```

- **Input**: `search_question` (str) — a natural language question
- **Output**: `search_response` (str) — formatted answer with sources
- **When to use**: Weather, current events, fact-checking, product comparisons, "what is X", looking up people/companies, any question where your knowledge might be outdated
- **Don't forget**: If you're about to say "I don't have access to live data" — stop and use this tool instead

## 2. Send Email — `coworker_send_email`

Send emails from Viktor's address (`zeta-labs@staging.viktor-mail.com`). Supports attachments, CC/BCC, and reply threading.

```python
from sdk.tools import email_tools

result = await email_tools.coworker_send_email(
    to=["recipient@example.com"],
    subject="Monthly Report",
    body="Hi,\n\nPlease find the report attached.\n\nBest,\nViktor",
    cc=["manager@example.com"],         # optional
    bcc=["archive@example.com"],        # optional
    attachments=["/work/report.pdf"],   # optional, local file paths
    reply_to_email_id="abc123",         # optional, for threading
)
print(result.success, result.email_id)
```

- **Input**: `to` (list[str]), `subject` (str), `body` (str, markdown format), optional `cc`, `bcc`, `attachments`, `reply_to_email_id`
- **Output**: `success` (bool), `email_id` (str)
- **Sent copies**: Saved to `/work/emails/sent/`
- **Incoming emails**: Arrive in `/work/emails/inbox/` as `.md` files
- **Attachments on received emails**: Use `coworker_get_attachment(internal_url=..., filename=...)` — do NOT download `_internal_url` directly

## 3. Image Generation — `coworker_text2im`

Generate artistic illustrations or edit existing images. Not for charts/diagrams (use matplotlib/plotly for those).

```python
from sdk.tools import utils_tools

# Generate new image
result = await utils_tools.coworker_text2im(
    prompt="A modern minimalist logo for a productivity app, blue and white",
    aspect_ratio="1:1",  # optional
)
print(result.local_path)   # Local file path
print(result.image_url)    # Public URL

# Edit existing image
result = await utils_tools.coworker_text2im(
    prompt="Make the background sunset orange",
    image_paths=["/work/input.png"],
)
```

- **Input**: `prompt` (str), optional `image_paths` (list[str]) for editing, optional `aspect_ratio` (`1:1`, `16:9`, `9:16`, `4:3`, `3:2`, `2:3`, `3:4`, `4:5`, `5:4`, `21:9`)
- **Output**: `local_path` (str), `image_url` (str), `file_uri` (str)
- **When to use**: Social media graphics, mockups, illustrations, profile pictures, thumbnails, concept art
- **Not for**: Data visualizations, charts, diagrams, screenshots — use code-based tools for those

## 4. File to Markdown — `file_to_markdown`

Convert documents to readable markdown. Essential for understanding uploaded files.

```python
from sdk.tools import utils_tools

result = await utils_tools.file_to_markdown(file_path="/work/document.pdf")
print(result.content)  # Markdown text
```

- **Input**: `file_path` (str) — absolute path
- **Supported formats**: `.pdf`, `.docx`, `.xlsx`, `.xls`, `.pptx`, `.ppt`, `.rtf`, `.odt`, `.ods`, `.odp`
- **Output**: `content` (str) — markdown text
- **When to use**: Any time you receive a document file and need to read its contents. Always prefer this over trying to parse files manually.

## 5. Library Documentation — `docs_tools`

Look up current documentation for any library, framework, API, or tool. Two-step process: resolve the library ID first, then query.

```python
from sdk.tools import docs_tools

# Step 1: Find the library
lib = await docs_tools.resolve_library_id(
    library_name="react",
    query="how to use useEffect cleanup"
)
print(lib.library_id)  # e.g. '/facebook/react'

# Step 2: Query its docs
docs = await docs_tools.query_library_docs(
    library_id=lib.library_id,
    query="useEffect cleanup functions"
)
print(docs.documentation)
```

- **Step 1** `resolve_library_id(library_name, query)` → returns `library_id`, `alternatives`
- **Step 2** `query_library_docs(library_id, query)` → returns `documentation` with code examples
- **Works for**: Libraries (react, pandas), frameworks (next.js, django), APIs (stripe, twilio), databases (postgresql, redis), CLIs (docker, git)
- **When to use**: Before writing code that depends on a specific library's API. Ensures you use current, correct APIs instead of relying on potentially outdated training data.
- **Skip step 1** if you already know the Context7 ID (e.g. `/vercel/next.js`, `/stripe/stripe-node`)

## Quick Reference

| Need                 | Tool                                        | Module        |
| -------------------- | ------------------------------------------- | ------------- |
| Search the web       | `quick_ai_search(question)`                 | `utils_tools` |
| Send an email        | `coworker_send_email(to, subject, body)`    | `email_tools` |
| Generate/edit image  | `coworker_text2im(prompt)`                  | `utils_tools` |
| Read a PDF/DOCX/XLSX | `file_to_markdown(file_path)`               | `utils_tools` |
| Look up library docs | `resolve_library_id` → `query_library_docs` | `docs_tools`  |

All tools are async. Run scripts with `uv run python script.py`.
<!-- ══════════════════════════════════════════════════════════════════════════
