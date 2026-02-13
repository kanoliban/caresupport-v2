"""Auto-generated tool module for utils_tools."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from sdk.internal.client import get_client

async def file_to_markdown(file_path: str) -> FileToMarkdownResponse:
    """Convert a file to markdown format.

    Supported formats: .pdf, .docx, .xlsx, .xls, .pptx, .ppt, .rtf, .odt, .ods, .odp

    Args:
        file_path: The absolute path to the file to convert

    Returns:
        FileToMarkdownResponse: Response from file to markdown conversion.
    """
    return FileToMarkdownResponse.model_validate(await get_client().call("file_to_markdown", file_path=file_path))

class FileToMarkdownResponse(BaseModel):
    """Response from file to markdown conversion."""

    content: str  # Markdown content or error message
    error: str | None = None  # Error message if conversion failed


async def ai_structured_output(prompt: str, output_schema: dict, input_text: str | None = None, intelligence_level: Literal['fast', 'balanced', 'smart'] = "fast") -> AiStructuredOutputResponse:
    """Call an AI model and get a structured JSON response matching your schema.

    Use this tool when you need to:
    - Extract structured data from text (e.g., parse entities, extract fields)
    - Generate content in a specific format (e.g., JSON with required fields)
    - Classify or categorize content into predefined categories
    - Transform unstructured text into structured data
    - Generate AI summaries with specific fields (e.g., title, key_points, action_items)
    - Analyze or score content (e.g., sentiment, priority, relevance)

    The output_schema should be a JSON Schema that defines the expected structure.

    Args:
        prompt: The prompt/instructions for the AI. Be specific about what you want extracted or generated.
        output_schema: JSON Schema defining the expected output structure. Example: {'type': 'object', 'properties': {'name': {'type': 'string'}, 'age': {'type': 'integer'}}, 'required': ['name']}
        input_text: Optional input text to process. If provided, the AI will analyze this text according to your prompt.
        intelligence_level: The intelligence/capability level of the model to use. 'fast' (default): Gemini Flash Lite - very fast and cheap, no thinking, good for simple extraction. 'balanced': Gemini Flash 3 - fast with good capability, good for most tasks. 'smart': Gemini Flash 3 with thinking - best for complex reasoning and nuanced extraction.

    Returns:
        AiStructuredOutputResponse: Response from AI structured output call.
    """
    return AiStructuredOutputResponse.model_validate(await get_client().call("ai_structured_output", prompt=prompt, output_schema=output_schema, input_text=input_text, intelligence_level=intelligence_level))

class AiStructuredOutputResponse(BaseModel):
    """Response from AI structured output call."""

    result: dict | None = None  # The structured output matching the schema
    error: str | None = None  # Error message if the call failed


async def coworker_text2im(prompt: str, image_paths: list[str] | None = None, aspect_ratio: Literal['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] | None = None) -> CoworkerText2ImResponse:
    """Generates an artistic illustration from prompt (not for charts/diagrams).

    Can also edit images if image_paths are provided. The generated image is saved
    locally to the sandbox volume and also available via URL.

    Args:
        prompt: The prompt describing the image to generate.
        image_paths: Optional list of local file paths to images to edit. If provided, the prompt will be used to edit these images instead of generating a new one.
        aspect_ratio: Aspect ratio for the generated image. Choose based on the use case: 1:1 for square/social, 16:9 for landscape/widescreen, 9:16 for portrait/mobile, 4:3 for standard photos, 3:2 for classic photos, 21:9 for ultrawide/cinematic.

    Returns:
        CoworkerText2ImResponse: Response from coworker text2im generation.
    """
    return CoworkerText2ImResponse.model_validate(await get_client().call("coworker_text2im", prompt=prompt, image_paths=image_paths, aspect_ratio=aspect_ratio))

class CoworkerText2ImResponse(BaseModel):
    """Response from coworker text2im generation."""

    response_text: str  # Status message about the generation
    image_url: str | None = None  # Public URL to view/download the generated image
    file_uri: str | None = None  # Unified URI for the image (for use with other tools)
    local_path: str | None = None  # Local path where the image is saved on the sandbox volume
    error: str | None = None  # Error message if generation failed


async def create_custom_api_integration(name: str, base_url: str, auth_config: CustomApiAuthNone | CustomApiAuthBearer | CustomApiAuthHeader | CustomApiAuthBasic | CustomApiAuthQueryParameter, api_type: Literal['rest'] = "rest", methods: list[Literal['GET', 'POST', 'PUT', 'PATCH', 'DELETE']] = None, default_headers: dict[str, str] | None = None, docs_url: str | None = None, slug: str | None = None) -> CreateCustomApiIntegrationResponse:
    """Create a custom API integration and return a secure credential form link.

    Args:
        name: Human-friendly integration name
        base_url: Base URL for the API (no query/fragment, no trailing slash preferred)
        auth_config: Credential form configuration
        api_type: API type
        methods: HTTP methods to enable for this integration
        default_headers: Headers applied to every request
        docs_url: Link to API documentation
        slug: Optional slug override (otherwise derived from name)

    Returns:
        CreateCustomApiIntegrationResponse: Response for create_custom_api_integration.
    """
    return CreateCustomApiIntegrationResponse.model_validate(await get_client().call("create_custom_api_integration", name=name, base_url=base_url, api_type=api_type, methods=methods, auth_config=auth_config, default_headers=default_headers, docs_url=docs_url, slug=slug))

class CreateCustomApiIntegrationResponse(BaseModel):
    """Response for create_custom_api_integration."""

    integration_id: str | None = None
    service_name: str | None = None
    connect_url: str | None = None
    status: str | None = None
    expires_at: str | None = None
    error: str | None = None


async def quick_ai_search(search_question: str) -> QuickAiSearchResponse:
    """One Google search; read top ~3 results; present answer as bullets or a table with links.

    Args:
        search_question

    Returns:
        QuickAiSearchResponse: 
    """
    return QuickAiSearchResponse.model_validate(await get_client().call("quick_ai_search", search_question=search_question))

class QuickAiSearchResponse(BaseModel):
    search_response: str
