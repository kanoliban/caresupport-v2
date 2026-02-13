import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import * as path from "node:path";

const client = new Anthropic();

const FAMILIES_DIR = path.resolve("families");
const SYSTEM_PROMPT_TEMPLATE = fs.readFileSync(
  path.resolve("agent/system-prompt.md"),
  "utf-8"
);

interface FamilyMember {
  name: string;
  role: string;
  phone: string;
  familyId: string;
}

// In production: database lookup by phone number
// For prototype: hardcoded registry
const MEMBER_REGISTRY: Record<string, FamilyMember> = {
  "+15550101": {
    name: "Rob Moreno",
    role: "Care Recipient",
    phone: "+15550101",
    familyId: "moreno",
  },
  "+15550102": {
    name: "Marta Moreno",
    role: "Family Caregiver",
    phone: "+15550102",
    familyId: "moreno",
  },
  "+15550201": {
    name: "Sarah Nguyen",
    role: "Professional Caregiver",
    phone: "+15550201",
    familyId: "moreno",
  },
  "+15550202": {
    name: "James Porter",
    role: "Professional Caregiver",
    phone: "+15550202",
    familyId: "moreno",
  },
  "+15550301": {
    name: "Linda Okafor",
    role: "Community Supporter",
    phone: "+15550301",
    familyId: "moreno",
  },
};

function buildSystemPrompt(member: FamilyMember): string {
  return SYSTEM_PROMPT_TEMPLATE.replaceAll("{{family_name}}", "Moreno")
    .replaceAll("{{family_id}}", member.familyId)
    .replaceAll("{{sender_name}}", member.name)
    .replaceAll("{{sender_role}}", member.role);
}

function getFamilyMdPath(familyId: string): string {
  return path.join(FAMILIES_DIR, familyId, "family.md");
}

// Tool implementations — restricted to the family's directory
function toolRead(filePath: string, familyId: string): string {
  const resolved = path.resolve(filePath);
  const allowed = path.resolve(FAMILIES_DIR, familyId);
  if (!resolved.startsWith(allowed)) {
    return `Error: Access denied. Can only read files in ${allowed}`;
  }
  try {
    return fs.readFileSync(resolved, "utf-8");
  } catch {
    return `Error: File not found: ${filePath}`;
  }
}

function toolEdit(
  filePath: string,
  oldString: string,
  newString: string,
  familyId: string
): string {
  const resolved = path.resolve(filePath);
  const allowed = path.resolve(FAMILIES_DIR, familyId);
  if (!resolved.startsWith(allowed)) {
    return `Error: Access denied. Can only edit files in ${allowed}`;
  }
  try {
    const content = fs.readFileSync(resolved, "utf-8");
    if (!content.includes(oldString)) {
      return `Error: old_string not found in file`;
    }
    const occurrences = content.split(oldString).length - 1;
    if (occurrences > 1) {
      return `Error: old_string found ${occurrences} times. Provide more context to make it unique.`;
    }
    fs.writeFileSync(resolved, content.replace(oldString, newString), "utf-8");
    return "OK";
  } catch {
    return `Error: Could not edit file: ${filePath}`;
  }
}

const tools: Anthropic.Messages.Tool[] = [
  {
    name: "read",
    description:
      "Read the contents of a file. Use this to read family.md and understand the care network state.",
    input_schema: {
      type: "object" as const,
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file to read",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "edit",
    description:
      "Edit a file by replacing an exact string with a new string. Use this to update family.md with new information. The old_string must appear exactly once in the file.",
    input_schema: {
      type: "object" as const,
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file to edit",
        },
        old_string: {
          type: "string",
          description: "The exact string to find and replace (must be unique)",
        },
        new_string: {
          type: "string",
          description: "The string to replace it with",
        },
      },
      required: ["file_path", "old_string", "new_string"],
    },
  },
];

// Process a single SMS message through the agent
async function handleSms(
  senderPhone: string,
  messageBody: string
): Promise<string> {
  const member = MEMBER_REGISTRY[senderPhone];
  if (!member) {
    return "Sorry, I don't recognize this number. Please contact your care coordinator to be added to the network.";
  }

  const familyMdPath = getFamilyMdPath(member.familyId);
  if (!fs.existsSync(familyMdPath)) {
    return "This care network hasn't been set up yet. Please contact support.";
  }

  const systemPrompt = buildSystemPrompt(member);

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: messageBody },
  ];

  // Agent loop: process tool calls until the agent produces a final text response
  let response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  });

  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === "tool_use"
    );

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] =
      toolUseBlocks.map((toolUse) => {
        const input = toolUse.input as Record<string, string>;
        let result: string;

        switch (toolUse.name) {
          case "read":
            result = toolRead(input.file_path, member.familyId);
            break;
          case "edit":
            result = toolEdit(
              input.file_path,
              input.old_string,
              input.new_string,
              member.familyId
            );
            break;
          default:
            result = `Error: Unknown tool ${toolUse.name}`;
        }

        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: result,
        };
      });

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === "text"
  );

  return textBlock?.text ?? "I couldn't process that message. Please try again.";
}

// Heartbeat: proactive scan for upcoming issues
async function heartbeat(familyId: string): Promise<string> {
  const familyMdPath = getFamilyMdPath(familyId);
  if (!fs.existsSync(familyMdPath)) {
    return `No family.md found for family ${familyId}`;
  }

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replaceAll(
    "{{family_name}}",
    familyId
  )
    .replaceAll("{{family_id}}", familyId)
    .replaceAll("{{sender_name}}", "System")
    .replaceAll("{{sender_role}}", "Heartbeat");

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content:
        "[HEARTBEAT] Scan family.md for issues in the next 48 hours. Report any uncovered shifts, medications without assigned caregivers, or appointments with missing logistics.",
    },
  ];

  let response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  });

  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === "tool_use"
    );

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] =
      toolUseBlocks.map((toolUse) => {
        const input = toolUse.input as Record<string, string>;
        let result: string;

        switch (toolUse.name) {
          case "read":
            result = toolRead(input.file_path, familyId);
            break;
          case "edit":
            result = toolEdit(
              input.file_path,
              input.old_string,
              input.new_string,
              familyId
            );
            break;
          default:
            result = `Error: Unknown tool ${toolUse.name}`;
        }

        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: result,
        };
      });

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === "text"
  );

  return textBlock?.text ?? "Heartbeat scan completed with no output.";
}

// CLI entry point for testing
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "heartbeat") {
    const familyId = args[1] ?? "moreno";
    console.log(`Running heartbeat for family: ${familyId}`);
    const result = await heartbeat(familyId);
    console.log("\n--- Heartbeat Result ---\n");
    console.log(result);
    return;
  }

  // Default: simulate SMS
  const phone = args[0] ?? "+15550102";
  const message = args.slice(1).join(" ") || "What's Rob's schedule today?";

  const member = MEMBER_REGISTRY[phone];
  console.log(
    `SMS from: ${member?.name ?? phone} (${member?.role ?? "unknown"})`
  );
  console.log(`Message: ${message}\n`);

  const response = await handleSms(phone, message);
  console.log("--- Response ---\n");
  console.log(response);
}

main().catch(console.error);
