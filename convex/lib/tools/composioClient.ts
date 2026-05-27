"use node";

import { Composio } from "@composio/core";
import type {
  ConnectedAccountListResponse,
  ConnectedAccountRetrieveResponse,
  ConnectionRequest,
} from "@composio/core";

const DEFAULT_WAIT_TIMEOUT_MS = 60_000;

export type Toolkit =
  | "googlecalendar"
  | "gmail";

export interface ComposioToolDefinition {
  slug: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolExecution {
  successful: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
}

export function createComposioClient(apiKey: string): Composio {
  return new Composio({ apiKey });
}

// Kicks off OAuth. `redirectUrl` is the Connect Link we send Rob over iMessage —
// Composio hosts the consent page and handles the redirect. The returned id is
// stable; persist it so we can poll status later if waitForConnection isn't viable
// from a Convex action (e.g. 60s sync wait exceeds action limits).
export async function startConnection(
  client: Composio,
  userId: string,
  toolkit: Toolkit,
): Promise<ConnectionRequest> {
  return client.toolkits.authorize(userId, toolkit);
}

export async function waitForConnection(
  request: ConnectionRequest,
  timeoutMs: number = DEFAULT_WAIT_TIMEOUT_MS,
): Promise<ConnectedAccountRetrieveResponse> {
  return request.waitForConnection(timeoutMs);
}

export async function listConnectedAccounts(
  client: Composio,
  userId: string,
): Promise<ConnectedAccountListResponse> {
  return client.connectedAccounts.list({ userIds: [userId] });
}

// Each tool's argument shape lives in `inputSchema` (JSON Schema). We feed this
// into Anthropic's `tools` parameter; the model emits matching tool_use blocks.
export async function getToolDefinition(
  client: Composio,
  userId: string,
  slug: string,
): Promise<ComposioToolDefinition> {
  const tools = await client.tools.get(userId, slug);
  const tool = Array.isArray(tools) ? tools[0] : tools;
  if (!tool) {
    throw new Error(`Composio tool not found: ${slug}`);
  }
  const raw = tool as unknown as {
    slug?: string;
    name?: string;
    description?: string;
    inputParameters?: Record<string, unknown>;
    input_parameters?: Record<string, unknown>;
  };
  return {
    slug: raw.slug ?? slug,
    name: raw.name ?? slug,
    description: raw.description ?? "",
    inputSchema: raw.inputParameters ?? raw.input_parameters ?? {},
  };
}

// Maps a Composio tool to Anthropic's tool block format. Used when assembling
// the `tools` param for callAnthropic. Anthropic expects `input_schema` (JSON
// Schema object) not `inputParameters`.
export function toAnthropicTool(def: ComposioToolDefinition): {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
} {
  return {
    name: def.slug,
    description: def.description,
    input_schema: def.inputSchema,
  };
}

export async function executeTool(
  client: Composio,
  userId: string,
  slug: string,
  args: Record<string, unknown>,
): Promise<ToolExecution> {
  const result = await client.tools.execute(slug, {
    userId,
    arguments: args,
  });
  const r = result as unknown as {
    successful?: boolean;
    successfull?: boolean;
    data?: Record<string, unknown> | null;
    error?: string | null;
  };
  return {
    successful: r.successful ?? r.successfull ?? false,
    data: r.data ?? null,
    error: r.error ?? null,
  };
}
