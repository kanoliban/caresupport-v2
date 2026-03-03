export type AccessLevel = "full" | "limited";

export interface ActorContext {
  familyId: string;
  memberId: string;
  memberName: string;
  role: string;
  accessLevel: AccessLevel;
  phone: string;
  chatId?: string;
}

export interface FamilyContext {
  familyId: string;
  familyName: string;
  careRecipient: string;
  markdown: string;
  memberMarkdown?: string;
  recentConversation: string;
}

export interface ProcessingInput {
  actor: ActorContext;
  text: string;
  service: string;
  messageId: string;
  receivedAt: string;
}
