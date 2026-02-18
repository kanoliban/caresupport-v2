"""
CareSupport Enforcement Layer
==============================
Mechanical enforcement of safety invariants. Code, not prose.

Two components:
  role_filter  — filters family.md context by access level BEFORE the agent sees it,
                 and scans outbound messages for leakage AFTER the agent responds.
  phi_audit    — logs every PHI access event for HIPAA compliance.

These run in the SMS handler pipeline. They are not optional.
"""
