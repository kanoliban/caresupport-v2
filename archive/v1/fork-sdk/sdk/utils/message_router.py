"""
Message Router — Route incoming SMS/iMessage to the correct family and context.

Viktor equivalent: None. Viktor doesn't need routing — Slack resolves identity
via workspace membership and @mentions. Over SMS, a phone number is the only
identity signal.

This is the most critical new utility. It sits between the raw message and the agent:

  Incoming SMS → Message Router → Agent (with family context loaded)

The router:
1. Looks up phone number → family_id + member name + role + access_level
2. Loads that family's family.md Current section
3. Determines message intent (medication? emergency? schedule? general?)
4. Pre-loads relevant protocol
5. Returns a fully-contextualized payload for the agent
"""


class MessageRouter:
    """Route an incoming message to its family context."""

    # Emergency keywords checked BEFORE family lookup (zero-latency path)
    EMERGENCY_KEYWORDS = [
        "911", "emergency", "help", "fall", "fell", "fallen",
        "chest pain", "can't breathe", "choking", "unresponsive",
        "seizure", "bleeding", "stroke", "unconscious",
    ]

    # Intent detection patterns (checked after family context is loaded)
    INTENT_PATTERNS = {
        "medication": ["med", "pill", "taken", "done", "refill", "pharmacy",
                       "prescription", "dose", "missed"],
        "schedule": ["appointment", "schedule", "tomorrow", "today", "this week",
                     "doctor", "visit", "cancel", "reschedule"],
        "wellness": ["sleep", "ate", "meal", "mood", "pain", "weight", "bp",
                     "blood pressure", "temperature"],
        "team": ["add", "remove", "aide", "caregiver", "team", "access"],
        "emergency": EMERGENCY_KEYWORDS,
        "confirmation": ["yes", "y", "no", "n", "confirm", "done", "cancel"],
        "help": ["help", "commands", "what can you do"],
    }

    async def route(self, phone: str, message: str) -> dict:
        """
        Route an incoming message to its family + context.

        Returns:
            {
                "family_id": str,
                "member": {"name": str, "role": str, "access_level": str},
                "family_md_current": str,     # pre-loaded Current section
                "intent": str,                 # detected intent
                "protocol": str,               # recommended protocol to load
                "is_emergency": bool,          # fast-path flag
                "pending_confirmations": [...], # any YES/NO the member owes us
            }
        """
        # Implementation: phone directory lookup → family.md read → intent detection
        raise NotImplementedError("Platform implements this at the gateway level")

    def detect_intent(self, message: str) -> str:
        """Classify message intent from text content."""
        message_lower = message.lower().strip()

        # Emergency check first (speed matters)
        for keyword in self.EMERGENCY_KEYWORDS:
            if keyword in message_lower:
                return "emergency"

        # Check confirmation (short messages like "YES", "DONE")
        if message_lower in ("yes", "y", "yeah", "yep", "confirm", "approved", "ok",
                             "no", "n", "nope", "cancel", "wait", "done"):
            return "confirmation"

        # Check other intents
        for intent, patterns in self.INTENT_PATTERNS.items():
            if intent in ("emergency", "confirmation"):
                continue
            for pattern in patterns:
                if pattern in message_lower:
                    return intent

        return "general"
