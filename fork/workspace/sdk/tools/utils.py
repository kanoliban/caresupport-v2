"""
Utils — Health information search, file conversion, structured output.

Viktor equivalent: utils_tools.py (quick_ai_search, file_to_markdown,
coworker_text2im, ai_structured_output).

Adapted: web search is specialized for health info. Image generation removed
(not needed for SMS-based care coordination). File conversion kept for
processing medical documents.
"""

from sdk.internal.client import get_client


async def quick_health_search(query: str) -> dict:
    """Search for health information from authoritative sources.

    Viktor equivalent: quick_ai_search() — same web search, but results are
    filtered to prioritize NIH, Mayo Clinic, MedlinePlus, WebMD.

    IMPORTANT: Results are informational only. Agent must ALWAYS add:
    "Talk to Dr. {name} about your specific situation."

    Args:
        query: Natural language health question

    Returns:
        {"search_response": str, "sources": [str]}
    """
    return await get_client().call("quick_health_search", query=query)


async def file_to_markdown(file_path: str) -> dict:
    """Convert a document to readable markdown.

    Viktor equivalent: file_to_markdown() — identical function.

    Use for: discharge summaries, insurance documents, lab results PDFs,
    prescription documents.

    After converting, extract key information and update relevant
    sections of family.md.

    Args:
        file_path: Absolute path to the document

    Returns:
        {"content": str}
    """
    return await get_client().call("file_to_markdown", file_path=file_path)


async def ai_structured_output(text: str, schema: dict) -> dict:
    """Parse unstructured text into structured data.

    Viktor equivalent: ai_structured_output() — identical function.

    Use for: extracting medication lists from discharge summaries,
    parsing appointment details from provider letters, structuring
    insurance benefit explanations.

    Args:
        text: Unstructured text to parse
        schema: JSON schema defining the expected output structure

    Returns:
        Structured data matching the schema
    """
    return await get_client().call("ai_structured_output", text=text, schema=schema)
