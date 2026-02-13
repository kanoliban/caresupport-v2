## Custom API Integration Guide

Use this guide when the user needs a direct HTTP API connection that is not covered by existing integrations.
The flow creates a secure credential form and then generates per-method SDK tools once credentials are saved.
Also read and follow `/work/skills/skill-creation/references/integration-exploration.md` for the standard exploration checklist and documentation format.

### Step 1: Research the API
- Find official API docs and examples
- Identify the base URL and any required version prefix
- Identify all relevant endpoints (do not stop at the first one)
- Decide which HTTP methods you need (GET, POST, PUT, PATCH, DELETE)
- Determine auth requirements (API key, bearer token, basic auth, query parameter)

### Step 2: Validate the Base URL
- Prefer a base URL without trailing slash
- If the API requires a version in the base URL (e.g. `https://api.example.com/v1`), include it
- Ensure the base URL does not include query strings or fragments

### Step 3: Choose Auth Configuration
Never ask the user to paste credentials in chat. Use the secure form returned by the tool.

Supported auth types (snake_case fields):

#### type: `none`
```json
{ "type": "none" }
```

#### type: `bearer`
```json
{
  "type": "bearer",
  "token": {
    "label": "API Token",
    "placeholder": "sk-...",
    "description": "Find this in the provider dashboard",
    "secret": true
  }
}
```

#### type: `header`
```json
{
  "type": "header",
  "header_name": { "label": "Header Name", "value": "X-API-Key" },
  "header_value": { "label": "API Key", "placeholder": "sk-...", "secret": true }
}
```

#### type: `basic`
```json
{
  "type": "basic",
  "username": { "label": "Username", "placeholder": "user@example.com" },
  "password": { "label": "Password", "placeholder": "...", "secret": true }
}
```

#### type: `query-parameter`
```json
{
  "type": "query-parameter",
  "query_parameters": [
    {
      "name": { "value": "api_key" },
      "value": { "label": "API Key", "placeholder": "...", "secret": true }
    }
  ]
}
```

### Step 4: Create the Integration (Tool Call)
Use `create_custom_api_integration` with:
- `name` (human readable)
- `base_url`
- `api_type` (use `rest` for normal HTTP APIs)
- `methods` (list of HTTP verbs you need)
- `auth_config` (from above)
- Optional: `docs_url`, `default_headers`

The tool returns a secure `connect_url`. Send that link to the user and wait for them to complete the form.

### Step 5: Wait for Credentials
Once the user completes the form:
- The thread that initiated the request receives a user message
- The SDK is regenerated
- New per-method tools appear, named like:
  - `custom_api_<slug>_get`
  - `custom_api_<slug>_post`
  - `custom_api_<slug>_put`
  - `custom_api_<slug>_patch`
  - `custom_api_<slug>_delete`

### Step 6: Build Higher-Level Functions
After tools appear, wrap them into higher-level helpers in your project code
using the API docs (e.g., `list_customers()` calling `custom_api_<slug>_get`).
