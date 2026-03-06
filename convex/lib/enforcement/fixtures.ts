import type { Id } from "../../_generated/dataModel";

export const FAMILY_NAME = "Moreno";

export function testFamilyId(s = "moreno-test"): Id<"families"> {
  return s as unknown as Id<"families">;
}

export const PHONES = {
  ROB: "+1-555-0101",
  MARTA: "+1-555-0102",
  SARAH: "+1-555-0201",
  LINDA: "+1-555-0301",
} as const;

export const TEST_MEMBERS = [
  {
    phone: PHONES.ROB,
    name: "Rob",
    role: "care_recipient" as const,
    accessLevel: "full" as const,
    relationship: "care_recipient",
  },
  {
    phone: PHONES.MARTA,
    name: "Marta",
    role: "family_caregiver" as const,
    accessLevel: "full" as const,
    relationship: "daughter",
  },
  {
    phone: PHONES.SARAH,
    name: "Sarah",
    role: "professional_caregiver" as const,
    accessLevel: "schedule+meds" as const,
    relationship: "professional_caregiver",
  },
  {
    phone: PHONES.LINDA,
    name: "Linda",
    role: "community_supporter" as const,
    accessLevel: "limited" as const,
    relationship: "community_supporter",
  },
];

export const TEST_FAMILY_ARGS = {
  name: FAMILY_NAME,
  status: "active" as const,
  timezone: "America/Los_Angeles",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const FAMILY_MD = `# Moreno Care Network

Coordinator: Rob Moreno (Care Recipient)
Backup Coordinator: Marta Moreno (Family Caregiver)
Coverage Window: 07:00–22:00
Created: 2026-01-15
Last Updated: 2026-02-18 09:15

## Members

### Rob Moreno
- Role: Care Recipient
- Phone: +1-555-0101
- Coordinator: yes
- Capabilities: []
- Notes: Coordinates his own care. Cognitively intact.

### Marta Moreno
- Role: Family Caregiver
- Phone: +1-555-0102
- Coordinator: backup
- Capabilities: [mobility_assist, med_admin, driving, cooking]

### Sarah Nguyen
- Role: Professional Caregiver
- Phone: +1-555-0201
- Coordinator: no
- Capabilities: [mobility_assist, med_admin, PT_exercises]
- Notes: Reliable. Handles afternoon routine.

### Linda Okafor
- Role: Community Supporter
- Phone: +1-555-0301
- Coordinator: no
- Capabilities: [driving, cooking, errands]
- Notes: No Sundays. No medical tasks.

## Care Recipient

Name: Rob Moreno
Conditions: Type 2 diabetes, hypertension, limited mobility (uses walker)
Mobility: Walker indoors, wheelchair for longer distances
Emergency Contact: Marta Moreno (+1-555-0102)

## Schedule

\`\`\`yaml
shifts:
  - date: 2026-02-18
    window: "14:00-18:00"
    assigned: Sarah
    type: afternoon_care
    status: confirmed

  - date: 2026-02-19
    window: "07:00-12:00"
    assigned: null
    type: morning_routine
    status: uncovered
\`\`\`

## Medications

\`\`\`yaml
active:
  - name: Lisinopril
    dose: "10mg"
    frequency: daily
    time: "08:00"
    prescriber: Dr. Chen
    last_confirmed: 2026-02-17

  - name: Metformin
    dose: "500mg"
    frequency: "twice daily"
    time: "08:00, 20:00"
    prescriber: Dr. Chen
    last_confirmed: 2026-02-17
\`\`\`

## Appointments

- **Feb 20, 10:00 AM** — Dr. Chen (cardiology), Mercy Medical
  - Transport: needed (wheelchair van)
  - Escort: Marta (confirmed)

## Availability

\`\`\`yaml
availability:
  - member: Sarah
    regular: "Tue, Thu 14:00-18:00"
  - member: Linda
    regular: "Mon-Sat, flexible"
    constraints: "No Sundays, no medical tasks"
\`\`\`

## Active Issues

- [ ] Feb 19 morning shift uncovered — seeking replacement
- [ ] Dr. Chen appointment needs wheelchair van booking

## Recent Events

- **2026-02-18 09:00** — Morning meds confirmed: Lisinopril 10mg, Metformin 500mg
- **2026-02-17 20:00** — Evening Metformin confirmed by Marta
- **2026-02-17 14:30** — Sarah completed afternoon shift. PT exercises done.

## Patterns

- Sarah is consistently reliable for afternoon shifts
- Rob is most alert in the morning; energy dips around 3pm
- Marta steps in quickly for gaps; prefers text
`;
