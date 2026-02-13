---
name: insurance-benefits
description: Handle insurance coverage questions, claims, prior authorizations, and benefits tracking. Use when messages mention insurance, coverage, cost, copay, deductible, authorization, or claims.
safety_level: standard
requires_approval: true  # before submitting anything to insurance
---

# Insurance & Benefits

> **Viktor equivalent:** No direct equivalent. Closest is Viktor's Google Ads
> integration — querying a complex external system on behalf of the user.

## Workflows

### Coverage Question
1. Family asks: "Is physical therapy covered?"
2. Read family.md → Insurance & Coverage section
3. If answer is in file → respond immediately
4. If not → "Let me check your plan details. One moment..."
5. Call `insurance.check_coverage()` if integration available
6. If no integration → "I don't have direct access to your plan. Here's the number on your card: {number}. Want me to add what you find out?"

### Prior Authorization
1. Provider says a service needs prior auth
2. Read family.md → prior auth required list
3. If `insurance.py` integration exists: initiate request
4. If not: guide family through the process, track status
5. Follow up on pending auths weekly

### Deductible Tracking
- Update deductible status when family reports costs
- Alert when close to deductible: "You're ${amount} from meeting your deductible — after that, {benefit change}"
