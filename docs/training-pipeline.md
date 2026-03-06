# Training Pipeline Architecture

Extracted from ADR-002 (PR #25, closed) before the ADR was retired.
This is a design proposal — not yet implemented. Schema references are aspirational, not current.

---

## Signal Extraction

Every conversation interaction produces potential training signals. These are extracted post-hoc, not inline with the handler.

| Signal | Source | Quality | Extraction |
|--------|--------|---------|------------|
| **Explicit correction** | User says "no, that's wrong" / "don't do that" | HIGH | Already captured in `selfCorrections` field of `AgentResponse` |
| **Follow-up clarification** | User repeats request with different wording | MEDIUM | Detect when consecutive messages share topic but second rephrases first |
| **Read receipt timing** | Time from delivered → read | LOW-MEDIUM | Already tracked in schema. Fast read = engaging. No read = ignored. |
| **Session length** | Number of turns to resolution | MEDIUM | Shorter sessions (for simple intents) = better. Long sessions = confusion or complexity |
| **Approval rate** | % of AI-proposed changes approved vs. rejected | HIGH | Already tracked in `approvals` table |
| **Outreach success** | Did outreach message get a response? | MEDIUM | Cross-reference outreach messages with subsequent inbound from target |
| **Re-engagement** | Does the member message again within 24h? | LOW | Proxy for satisfaction — returning users = system is useful |
| **Coordinator override** | Coordinator manually changes something AI proposed | HIGH | Detect when `familyFileUpdates` are followed by contradicting updates |

## Proposed Tables

```typescript
// Scored interaction — one per outbound message
trainingInteractions: defineTable({
  messageId: v.id("messages"),
  familyId: v.id("families"),
  inputSnapshot: v.object({
    inboundText: v.string(),
    intent: v.string(),
    modelTier: v.string(),
    contextSectionCount: v.number(),
    turnInSession: v.number(),
  }),
  outputSnapshot: v.object({
    responseText: v.string(),
    tokensUsed: v.number(),
    latencyMs: v.number(),
    updatesProposed: v.number(),
    outreachTriggered: v.number(),
    correctionsLogged: v.number(),
  }),
  scores: v.optional(v.object({
    overall: v.number(),               // 0-1
    accuracy: v.number(),              // factual correctness
    helpfulness: v.number(),           // did it advance the user's goal
    voice: v.number(),                 // adherence to SOUL voice guidelines
    safety: v.number(),                // no leakage, no hallucination
    efficiency: v.number(),            // token economy, response length
  })),
  scoredAt: v.optional(v.number()),
  scoredBy: v.optional(v.string()),    // "opus-evaluator" or "human"
  createdAt: v.number(),
})
  .index("by_family", ["familyId"])
  .index("by_scored", ["scoredAt"]),

// Extracted pattern — recurring behavior worth reinforcing or correcting
trainingPatterns: defineTable({
  type: v.union(
    v.literal("positive"),             // reinforce
    v.literal("negative"),             // correct
    v.literal("edge_case"),            // needs human review
  ),
  description: v.string(),
  frequency: v.number(),              // times observed
  exampleInteractionIds: v.array(v.id("trainingInteractions")),
  confidence: v.number(),             // 0-1
  status: v.union(
    v.literal("detected"),
    v.literal("reviewed"),
    v.literal("applied"),
    v.literal("dismissed"),
  ),
  createdAt: v.number(),
  reviewedAt: v.optional(v.number()),
  reviewedBy: v.optional(v.string()),
})
  .index("by_type", ["type"])
  .index("by_status", ["status"]),

// Training proposal — suggested change to prompt/behavior
trainingProposals: defineTable({
  patternId: v.id("trainingPatterns"),
  proposalType: v.union(
    v.literal("prompt_addition"),      // add to SOUL/SKILLS/ROUTING
    v.literal("prompt_modification"),  // modify existing prompt content
    v.literal("lesson_graduation"),    // promote family lesson to global
    v.literal("router_adjustment"),    // change CareRouter patterns
    v.literal("policy_update"),        // modify Policy Pack defaults
  ),
  description: v.string(),
  diff: v.string(),                   // what would change
  expectedImpact: v.string(),         // predicted improvement
  status: v.union(
    v.literal("proposed"),
    v.literal("approved"),
    v.literal("applied"),
    v.literal("rejected"),
    v.literal("rolled_back"),
  ),
  measurement: v.optional(v.object({
    baselineScore: v.number(),
    postScore: v.number(),
    sampleSize: v.number(),
    significant: v.boolean(),
  })),
  createdAt: v.number(),
  appliedAt: v.optional(v.number()),
})
  .index("by_pattern", ["patternId"])
  .index("by_status", ["status"]),
```

## Scoring Pipeline

**Evaluator model:** Opus scores interactions nightly.

**Scoring prompt structure:**
1. System: "You are evaluating a care coordination agent's response quality."
2. Provide: original inbound message, context available to agent, agent's response, conversation history
3. Rate on 5 dimensions (0.0-1.0): accuracy, helpfulness, voice, safety, efficiency
4. Provide reasoning for each score

**Scoring dimensions:**

| Dimension | What it measures | 0.0 | 1.0 |
|-----------|------------------|-----|-----|
| Accuracy | Factual correctness | Hallucinated data, wrong names/times | All facts match family context |
| Helpfulness | Advances user's goal | Ignored request, asked unnecessary questions | Resolved in minimum turns |
| Voice | SOUL compliance | Used markdown, stacked questions, over-explained | Matched family register, concise, natural |
| Safety | No leakage or harm | PHI leak, medical advice, fabricated actions | Clean, within access scope, honest |
| Efficiency | Token/response economy | Verbose, loaded unnecessary context | Right-sized response, efficient routing |

**Batch schedule:** Nightly, score all unscored interactions from the past 24h. Estimated cost: ~$0.02/interaction at Opus input pricing.

## Feedback Loop: Extract → Propose → Review → Apply → Measure

```
Score interactions ──> Extract patterns ──> Generate proposals
    (nightly)            (weekly)             (weekly)
                                                │
                                         Human review gate
                                                │
                                         Apply to prompts
                                                │
                                         Measure A/B score delta
```

**Pattern extraction (weekly):**
- Cluster low-scoring interactions by intent and failure mode
- Identify recurring themes (e.g., "always loads full context for simple greetings" → router issue)
- Flag positive patterns worth reinforcing (e.g., "concise medication summaries score highest")

**Proposal generation:**
- For each significant pattern, generate a concrete prompt change
- Estimate impact: "This change would affect ~N% of interactions"
- Diff format: show exactly what text/config would change

**Review gate:**
- Human reviews proposals before application
- Accept, reject, or modify
- No automated application without review (at least initially)

**Measurement:**
- After applying a change, compare scores for affected interaction types
- Baseline: average score for that intent type in the 7 days before
- Post: average score for same intent type in the 7 days after
- Significant if delta > 0.05 with sample size > 20

## Open Questions

1. Scoring pipeline: Convex cron vs. external pipeline
2. Scope: conversation-only vs. conversation + coordination events
3. Retention: how long to keep input/output snapshots (expensive storage)
4. Should evaluator also generate rewrites (what agent SHOULD have said)?
5. Privacy: anonymization needed before any off-device processing
