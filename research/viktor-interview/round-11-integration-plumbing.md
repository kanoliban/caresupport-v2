# Round 11: Integration Plumbing

## Question

> When you pull data from Linear or search Slack history — what's actually happening? Are you calling APIs directly, or is there a layer between you and those services? I'm curious about the plumbing.

## Answer

**There's a layer.** Viktor read its own source code to answer this.

### Architecture Diagram

```
 Agent (Claude in sandbox)      Tool Gateway              Third Party
 ┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
 │                  │     │                     │     │                  │
 │  await linear_   │────>│  POST /call          │────>│  Linear GraphQL  │
 │  list_issues()   │     │  {role, arguments}   │     │  API             │
 │                  │<────│                     │<────│                  │
 │  get JSON back   │     │  handles auth,       │     │                  │
 │                  │     │  tokens, MCP proxy   │     │                  │
 └──────────────────┘     └─────────────────────┘     └──────────────────┘
       Sandbox                 Platform infra              External
```

### The Call Chain (from source code)

1. Python function in `sdk/tools/mcp_linear.py` — thin auto-generated wrapper, no business logic
2. Calls `get_client().call("mcp_linear_list_issues", team="CareSupport")`
3. Client makes HTTP POST to Tool Gateway (`api.jace.ai/v1/tools/call`) with bearer token
4. Gateway handles OAuth tokens, API authentication, proxies to Linear's actual API
5. Response returns as JSON into sandbox

**Viktor never sees or handles OAuth tokens.** The gateway manages all authentication.

### Two Data Access Patterns

| Pattern | Used For | How It Works |
|---|---|---|
| **API through gateway** | Linear, GitHub, Google Ads | Real-time HTTP call through tool gateway. Gateway holds OAuth tokens. |
| **Local file search** | Slack history | Platform syncs messages to flat files. Viktor runs `grep` on local filesystem. No API, no latency, no rate limits. |

Slack files:
```
slack/Liban Kano/2026-02.log
slack/all-caresupport/2026-02.log
slack/pitchdeck/2026-02.log
```

### Why This Architecture

- **Security** — Agent can't leak API tokens because it doesn't have them. Gateway is the trust boundary.
- **Simplicity** — Agent calls Python functions. No auth flows, token refreshes, or API versioning.
- **Extensibility** — New integration = new MCP module in gateway. Agent gets new Python functions. Same pattern every time.

**MCP** = Model Context Protocol. Tool modules are named `mcp_linear`, `mcp_google_ads` — that's the standard the gateway speaks.

## Analysis

**Direct mapping to CareSupport:**

```
 Family member (SMS/WhatsApp)    Our Gateway               External Services
 ┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
 │                  │     │                     │     │                  │
 │  "Mom's appt     │────>│  Route to agent      │────>│  Pharmacy API    │
 │   moved to Thu"  │     │  Load family.md      │     │  Calendar API    │
 │                  │<────│  Apply updates        │<────│  Insurance API   │
 │  "Got it, updated│     │  Send response        │     │                  │
 │   the schedule"  │     │                     │     │                  │
 └──────────────────┘     └─────────────────────┘     └──────────────────┘
    SMS/WhatsApp              Our platform                 Healthcare
```

**Key patterns to steal:**
1. **Gateway as trust boundary** — agent never touches API keys for pharmacy, insurance, etc. Critical for HIPAA.
2. **Two data patterns** — real-time API for external services, local file for family context. Our family.md is the "local file" equivalent.
3. **MCP as the integration standard** — worth adopting for our own tool modules as the ecosystem grows.

**HIPAA implication:** The gateway pattern means PHI never touches the tool credential store. Auth tokens and health data flow through different layers. This is architecturally sound for compliance.
