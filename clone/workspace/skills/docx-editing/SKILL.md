---
name: docx-editing
description: Edit and modify Word documents. Use when working with .docx files.
---

When editing an existing docx, use python-docx, always first re-read the document structure to identify text split across multiple runs, then use run-aware replacement that preserves formatting instead of replacing entire paragraph text, and verify results by re-reading the saved document.
<!-- ══════════════════════════════════════════════════════════════════════════
