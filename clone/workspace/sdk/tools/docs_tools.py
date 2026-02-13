"""Auto-generated tool module for docs_tools."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from sdk.internal.client import get_client

async def resolve_library_id(library_name: str, query: str) -> ResolveLibraryIdResponse:
    """Resolve a library/API/framework name to a Context7-compatible ID.

    Use this tool first to find the correct ID before fetching documentation.
    The ID is required for the query_library_docs tool.

    Works with many types of documentation sources:
    - Libraries and packages (react, pandas, lodash)
    - Frameworks (next.js, fastapi, django)
    - APIs and services (stripe, twilio, openai)
    - Databases (postgresql, mongodb, redis)
    - Tools and CLIs (docker, kubernetes, git)

    Returns matching results ranked by relevance to your query.

    Args:
        library_name: The name of the library, framework, API, or service to search for (e.g., 'react', 'stripe api', 'postgresql', 'kubernetes')
        query: Your question or task - used to rank results by relevance (e.g., 'authentication with JWT', 'how to create a payment intent')

    Returns:
        ResolveLibraryIdResponse: Response from library ID resolution.
    """
    return ResolveLibraryIdResponse.model_validate(await get_client().call("resolve_library_id", library_name=library_name, query=query))

class ResolveLibraryIdResponse(BaseModel):
    """Response from library ID resolution."""

    library_id: str | None = None  # The resolved Context7-compatible library ID (e.g., '/vercel/next.js'). Use this with query_library_docs.
    library_name: str | None = None  # The display name of the resolved library
    description: str | None = None  # Description of the library
    alternatives: list[dict] | None = None  # Alternative matching libraries if multiple were found
    error: str | None = None  # Error message if resolution failed


async def query_library_docs(library_id: str, query: str) -> QueryLibraryDocsResponse:
    """Fetch documentation using a Context7 library ID.

    Use resolve_library_id first to get the library_id, then use this tool
    to fetch relevant documentation and code examples.

    You can also use a library ID directly if you already know it
    (e.g., '/vercel/next.js', '/stripe/stripe-node').

    Args:
        library_id: The Context7-compatible ID (e.g., '/vercel/next.js', '/stripe/stripe-node'). Get this from resolve_library_id.
        query: What you want to know. Be specific - e.g., 'How to use useEffect cleanup functions' or 'How to create a payment intent'

    Returns:
        QueryLibraryDocsResponse: Response from documentation query.
    """
    return QueryLibraryDocsResponse.model_validate(await get_client().call("query_library_docs", library_id=library_id, query=query))

class QueryLibraryDocsResponse(BaseModel):
    """Response from documentation query."""

    library_id: str | None = None  # The library ID that was queried
    documentation: str | None = None  # The fetched documentation content with code examples
    error: str | None = None  # Error message if the query failed
