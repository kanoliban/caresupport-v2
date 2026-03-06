# Linq Full API Integration

## Corrections to Plan
- `editMessage` (PATCH /v3/messages/{id}) does NOT exist in Linq API V3. Only DELETE exists. Dropping editMessage.
- `sendMessage` effect support: extend existing function signature with optional effect param
- New audit events needed in schema: `reaction_received`, `participant_changed`

## Batch 1: Linq Client Functions (linqClient.ts + tests)
- [x] 1a. `stopTyping(chatId, apiToken)` — DELETE /chats/{chatId}/typing
- [x] 1b. Extend `sendMessage` with optional `effect` param (screen/bubble effect)
- [x] 1c. `sendMediaMessage(chatId, text, mediaUrl, apiToken)` — multi-part message with media
- [x] 1d. `sendVoiceMemo(chatId, audioUrl, fromPhone, apiToken)` — POST /chats/{chatId}/voicememo
- [x] 1e. `sendReaction(messageId, operation, type, apiToken, partIndex?, customEmoji?)` — POST /messages/{id}/reactions
- [x] 1f. `shareContactCard(chatId, apiToken)` — POST /chats/{chatId}/share_contact_card
- [x] 1g. `addParticipant(chatId, handle, apiToken)` — POST /chats/{chatId}/participants
- [x] 1h. `removeParticipant(chatId, handle, apiToken)` — DELETE /chats/{chatId}/participants
- [x] 1i. `updateChat(chatId, opts, apiToken)` — PUT /chats/{chatId}
- [x] 1j. New extraction helpers: `extractReactionData`, `extractParticipantData`
- [x] 1k. Tests for all new functions (63 total, 30+ new)

## Batch 2: Webhook Event Handlers (http.ts)
- [x] 2a. Add `reaction_received` and `participant_changed` to auditEvent union in schema.ts + mutations.ts
- [x] 2b. Handle `reaction.added` — route to handleMessage with synthetic body
- [x] 2c. Handle `reaction.removed` — log only
- [x] 2d. Handle `participant.added` — log audit
- [x] 2e. Handle `participant.removed` — log audit

## Batch 3: Agent Contract Extension
- [x] 3a. Add `ReactionRequest` and `EffectRequest` to types.ts + extend AgentResponse
- [x] 3b. Update RESPONSE_FORMAT in promptBuilder.ts with reactions + effect field guide
- [x] 3c. Update CAPABILITIES_CONTENT in promptContent.ts
- [x] 3d. Update responseParser.ts normalizeResponse for new fields
- [x] 3e. Handler integration: send reactions after response, pass effect to sendMessage

## Batch 4: Onboarding & Group Chat
- [x] 4a. Contact card sharing on first outreach (when createChat is called)
- [x] 4b. Effect support in sendResponse for agent-requested effects

## Verification
- [x] `npx tsc --noEmit` — zero type errors
- [x] `npm test` — 213/213 tests pass (11 test files)
