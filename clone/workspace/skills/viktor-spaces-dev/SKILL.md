---
name: viktor-spaces-dev
description: Build and deploy full-stack mini apps with database, auth, and hosting. Use when users want a custom web app, dashboard, or interactive tool.
---

## What Are Viktor Spaces?

Viktor Spaces are full-stack web applications you can create for users. Each app includes:
- A real-time database (Convex) with separate dev and prod environments
- User authentication (email/password)
- Frontend hosting (Vercel)
- Custom subdomain (format: `{project}-{id}.viktor.space` where `{id}` is auto-generated). Preview deployments have a `preview-` prefix.

Use them when users need a custom tool, dashboard, internal app, or interactive prototype — anything beyond a simple document or spreadsheet.

## Project Location

All Viktor Spaces apps live in `/work/viktor-spaces/{project_name}/`.

When you call `init_app_project`, it clones the template into this folder, creates both dev and prod Convex deployments, and configures Vercel hosting — ready for development.

Before starting to build a new app ask the user a few questions in one message, if the request is underspecified.

## Environment Separation

Each app has two isolated Convex databases:

| Environment | Convex Database | Vercel Target | Data Persistence |
| ----------- | --------------- | ------------- | ---------------- |
| Preview     | Dev deployment  | preview       | ✓ Persistent     |
| Production  | Prod deployment | production    | ✓ Persistent     |

- **Preview deployments** use the dev Convex database — data persists between preview deploys, so users don't need to re-enter test data
- **Production deployments** use the prod Convex database — completely isolated from dev

## Before Making Changes

**Always read the project README first:**

```bash
cat /work/viktor-spaces/{project_name}/README.md
```

The README contains commands, conventions, auth flows, and the Convex cheatsheet.

## What the Template Includes

When you create a new app, it comes pre-configured with:

- **Convex backend** — Real-time database, queries, mutations, actions
- **Email/password auth** — Sign up with OTP verification, sign in, password reset
- **53 shadcn/ui components** — Button, Card, Dialog, Form, Table, etc.
- **Tailwind CSS v4** — With light/dark theme support
- **Playwright test utilities** — `createPageHelper()` with auto-login test user
- **Bun** — Fast package manager and runtime

## Available Tools

| Tool                 | Purpose                               |
| -------------------- | ------------------------------------- |
| `init_app_project`   | Create a new app with Convex + Vercel |
| `deploy_app`         | Deploy to preview or production       |
| `list_apps`          | List all apps you've created          |
| `get_app_status`     | Get URLs and deployment status        |
| `query_app_database` | Query data from the Convex database   |
| `delete_app_project` | Delete an app and all its resources   |

**long timeouts** `init_app_project` and `deploy_app` can take 2-3 minutes to complete. Always use a timeout of at least 180000ms (3 minutes) when calling these tools via bash.

## Development Workflow (Important)

For every major task or new app you are creating:

1. **Read README** if not already done
2. **Make a todo.md file** with all the things you need to do and also the steps in this list after this one.
3. **Implement feature** (backend in `convex/`, frontend in `src/`)
4. **Write Playwright e2e test** using `createPageHelper()` from `scripts/auth`. Every feature should get if possible and e2e test that just tests it, and that can be run in parallel with other tests.
5. **Sync and build**: `bun run sync:build` (pushes Convex functions + builds frontend)
6. **Run e2e tests**: `bun run test scripts/your-test.ts` (starts preview server, runs test, stops server). Fix things until the app works as expected.
7. **Take screenshots** of the app/feature working. One or more screenshots, depending on what you think is important to show.
8. **Deploy preview**: `deploy_app(project_name, environment="preview")`
9. **Notify user via Slack** with:
   - Screenshot(s) of the new feature
   - **The exact URL from the deploy response** (do NOT construct URLs yourself)
   - Description of what was added or what you think the user should know.
   - Request for permission to deploy to production (use buttons)
10. **Wait for user approval** before deploying to production
11. **Deploy production**: `deploy_app(project_name, environment="production")`

## Getting App URLs

- `deploy_app()` returns `url` - the deployed app's URL
- `list_apps()` returns `preview_url` and `production_url` for each app
- `get_app_status()` returns `preview_url` and `production_url`


## Test User

For Playwright testing, use the pre-configured test user:

| Field    | Value              |
| -------- | ------------------ |
| Email    | `agent@test.local` |
| Password | `TestAgent123!`    |

Use `runTest()` for automatic error handling. The page is **already logged in** as the test user when your test runs:

```typescript
import { runTest } from "./scripts/auth";

runTest("My Feature Test", async helper => {
  const { page } = helper;
  // ✅ Already authenticated - starts on /
  
  await helper.goto("/dashboard");
  
  const hasElement = await page.locator("text=Welcome").isVisible();
  if (!hasElement) {
    throw new Error("Expected Welcome message");
  }
}).catch(() => process.exit(1));
```

On failure, automatically shows: screenshot, page URL/content, browser console logs, and Convex backend logs.

## Querying Data

Use `query_app_database` to query either environment:

```python
# Query dev database (preview)
await app_tools.query_app_database(
    project_name="my-app",
    function_name="users:list",
    environment="dev"
)

# Query prod database (production)
await app_tools.query_app_database(
    project_name="my-app",
    function_name="users:list",
    environment="prod"
)
```

## Calling Viktor's Tool Gateway from Convex

Your app can call any coworker SDK function directly from Convex actions. This lets your app access AI-powered searches, image generation, and all other tools available in the SDK.

### How It Works

The template includes `convex/viktorTools.ts` with a `callTool()` helper. This function can invoke any SDK tool by passing the tool's `role` and `arguments`.

### Example: AI Search

The template includes a `quickAiSearch` action as an example:

```typescript
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function SearchComponent() {
  const search = useAction(api.viktorTools.quickAiSearch);

  const handleSearch = async (query: string) => {
    const result = await search({ query });
    console.log("Search result:", result); // Returns the AI summary directly as a string
  };
}
```

### Adding More Tools

To add a new tool, first test it to see the response shape, then create a typed wrapper in `convex/viktorTools.ts`:

```typescript
export const generateImage = action({
  args: { prompt: v.string() },
  returns: v.object({ response_text: v.string(), local_path: v.optional(v.string()) }),
  handler: async (_ctx, { prompt }) => {
    const result = await callTool<{ response_text: string; local_path?: string }>("coworker_text2im", { prompt });
    return { response_text: result.response_text, local_path: result.local_path };
  },
});
```

The `role` parameter is the SDK tool's role identifier, and the second argument contains the tool's parameters.

The `project_secret` is automatically configured during `init_app_project` and stored as a Convex environment variable.

## Debugging

```bash
cd /work/viktor-spaces/{project_name}
bun run logs:fetch    # Backend logs
bun run check         # Lint errors
```

In tests, use `helper.printConsoleLogs()` and `helper.printDebugInfo()` for browser console output.
<!-- ══════════════════════════════════════════════════════════════════════════
