# Integration Exploration

When a new integration is connected, explore it using read-only tools and document your findings
in the integration's skill file at `/work/skills/integrations/{integration-name}/SKILL.md`.

## What to Document

### Account Structure
Document the high-level structure of the account. Things that are relatively stable.

### Key IDs and References  
IDs that future agents will need repeatedly (account IDs, workspace IDs, etc.).

### Important Functions
Document key functions with working examples - both read and write operations.

## Integration-Specific Notes

### Google Drive
- Key folders are often: Shared drives, team folders, project folders
- Folder IDs are stable and useful for direct access

### Meta Ads  
- Ad account IDs are needed for most API calls
- Structure: Ad Accounts → Campaigns → Ad Sets → Ads
- Campaigns change frequently, account structure is stable

### HubSpot
- Deal pipelines have stages with specific IDs
- Custom properties are common and important to document

## Important Notes

- Use READ-ONLY tools during exploration
- IDs and structure can change over time - note when info was last verified
- Focus on things that will help future agents avoid re-querying
- For Pipedream integrations with sparse actions, use `pd_<app>_proxy_get` first to discover API resources
- Use `pd_<app>_proxy_post|put|patch|delete` only when you need write operations
- For these pipedream integrations if they dont have any tools or hardly any useful ones: Write, test and save some simple helper functions and reference them in the skill file so following agents can use them. (You can start exploring the API by `resolve_library_id` → `query_library_docs` see general-tools skill)
