# Example Workflows by Industry

Workflow inspiration across industries. Use as starting points—adapt to each company's tools, processes, and pain points.

The best workflows combine Viktor's capabilities: **research + data processing + judgment + action + deliverables**.

---

## Tech & SaaS

### Intelligent Bug Triage
**Trigger:** New issue from customer support

Before an engineer looks at a bug, Viktor:
- Searches codebase for likely affected files/functions
- Pulls recent error logs from Sentry/Axiom
- Checks customer context (plan, recent activity, support history)
- Identifies related commits or PRs
- Posts summary with everything needed to start debugging

**Impact:** Skip 30+ minutes of context-gathering per bug.

**Integrations:** Linear/Jira, GitHub, Sentry/Datadog, CRM

---

### Feature Request Intelligence
**Trigger:** Daily or weekly aggregation

Viktor aggregates feature requests from support tickets, NPS comments, Slack, Intercom, and sales call notes. Groups similar requests, links to existing roadmap items, tracks frequency. If Viktor has repo access, can even add rough complexity estimates.

**Output:** Prioritized list with business impact—who's asking, revenue at stake, and build effort.

**Integrations:** Zendesk/Intercom, Slack, CRM (Salesforce/HubSpot), Linear/Jira

---

### Release Notes & Changelog Automation
**Trigger:** PR merged to main or scheduled release

Viktor pulls merged PRs from GitHub, filters for customer-facing changes, rewrites technical descriptions into user-friendly language, and categorizes by type (feature, improvement, fix).

**Output:** Draft release notes ready for review + optional Slack/email announcements.

**Integrations:** GitHub/GitLab, Linear/Jira

---

### Technical Support Assistant
**Trigger:** On-demand or scheduled

Viktor answers technical questions about your codebase for support staff. Clone relevant repos, build internal documentation, and make it queryable—support can ask "how does X work?" without bothering engineers.

**Output:** Accurate answers with code references, maintained internal docs.

---

### On-Call Morning Digest
**Trigger:** 8:00 AM daily

Viktor summarizes overnight alerts and resolution status, ongoing incidents, key metrics from past 24 hours, and what needs attention today. Posted to #engineering or DM'd to on-call.

---

### Technical Debt Tracker
**Trigger:** Weekly

Viktor scans codebase for TODOs, FIXMEs, deprecated patterns, test coverage gaps, and outdated dependencies. Creates prioritized report with trends over time.

---

### Churn Risk Detection
**Trigger:** Weekly analysis

Viktor develops custom models by analyzing usage metrics for declining trends, support tickets for frustration signals, billing for failed payments, and engagement patterns. Generates risk scores with specific intervention recommendations.

**Key insight:** Viktor doesn't just check boxes—it learns what predicts churn for YOUR product.

**Integrations:** Product analytics (Mixpanel/Amplitude/PostHog), Stripe, Zendesk/Intercom, CRM

---

## E-commerce & Retail

### Inventory Intelligence & Demand Forecasting
**Trigger:** Daily or every few hours

Viktor monitors stock levels vs sales velocity, predicts stockouts before they happen, alerts on slow-moving inventory, drafts reorder emails to suppliers, and suggests quantities based on demand forecasting and your marketing calendar.

**Output:** Morning Slack with "Order Now" / "Monitor" / "Overstocked" by SKU.

**Integrations:** Shopify/WooCommerce, inventory system, Google Calendar (for marketing events)

---

### Competitor Price & Product Monitoring
**Trigger:** Daily or weekly

Viktor tracks competitor pricing via web research and AI search, compares against your catalog, identifies gaps in your product line, and spots pricing opportunities. Alerts on significant price changes with suggested responses.

**Output:** Weekly digest with price adjustment recommendations and new product opportunities.

---

### Customer Review Analysis
**Trigger:** Daily or weekly

Viktor aggregates reviews from Amazon, Google, Trustpilot, your site. Categorizes by sentiment and topic (shipping, quality, service), identifies emerging issues before they become patterns, and flags reviews needing attention.

**Output:** Weekly review digest with trends and urgent issues highlighted.

---

### Return Pattern Analyzer
**Trigger:** Weekly

Viktor analyzes return rates by product/category/source, common return reasons, customers with high return rates, and potential quality issues. Suggests product page improvements or supplier conversations.

---

## Finance & Accounting

### Invoice Processing Pipeline
**Trigger:** Daily inbox monitoring

Forward invoices to Viktor (or monitor an inbox). Viktor extracts vendor, amount, due date, line items. Matches to POs or contracts. Routes for approval based on amount/vendor. No backlog—same-day processing with immediate flags for discrepancies.

**Weekly add-on:** Viktor checks what's still outstanding and sends payment reminders.

**Integrations:** Email/Gmail, QuickBooks/Xero, Google Sheets

---

### Expense Report Summary & Reminders
**Trigger:** Weekly or on-demand

Viktor summarizes pending expense reports by person/department, flags overdue submissions, and sends friendly reminders to submitters. Keeps approvers informed without micro-managing.

**Integrations:** Expensify/Brex/Ramp, Slack

---

### Month-End Financial Summary
**Trigger:** Monthly

Viktor pulls revenue from billing, aggregates expenses by category, compares to budget and previous periods, generates narrative summary with key variances explained.

**Output:** PDF report with charts, KPIs, and executive summary.

**Integrations:** Stripe/billing system, QuickBooks/Xero, Google Sheets (budget)

---

### Daily Revenue Digest
**Trigger:** 8:00 AM daily

Morning briefing: MRR/ARR changes (new, expansion, contraction, churn), notable transactions, failed payments needing attention, comparison to last week/month, unusual patterns flagged.

**Integrations:** Stripe, Baremetrics/ChartMogul, CRM

---

## Marketing & Growth

### Competitive Ad Intelligence
**Trigger:** Bi-weekly

Viktor monitors competitor ads via Meta Ad Library, Google Ads Transparency. Analyzes messaging themes, offers, creative approaches. Compares to your campaigns. Identifies what's working for competitors and opportunities for you.

**Output:** Competitive brief with ad screenshots, messaging analysis, and actionable recommendations.

---

### Content Performance & Optimization
**Trigger:** Monthly

Viktor pulls traffic/engagement data, identifies underperforming content with potential (good impressions, low CTR), analyzes top performers for patterns, generates specific optimization recommendations.

**Output:** Prioritized content audit with title/meta/content update suggestions.

**Integrations:** Google Analytics, Search Console, CMS (Webflow/WordPress)

---

### Campaign Reporting Automation
**Trigger:** Weekly

Viktor pulls data from all ad platforms (Meta, Google, LinkedIn), aggregates spend/impressions/clicks/conversions, calculates unified metrics (CAC, ROAS) across channels.

**Output:** Weekly marketing dashboard + executive summary in Slack.

**Integrations:** Meta Ads, Google Ads, LinkedIn Ads, Google Sheets/Looker

---

### Client Campaign Monitor (for Agencies)
**Trigger:** Daily per client

Viktor monitors each client's campaigns: performance vs benchmarks, budget pacing, anomaly detection (sudden drops/spikes). Posts daily digest to client Slack channel.

---

## Operations

### Meeting Notes & Action Item Tracking
**Trigger:** Meeting transcript received

Viktor extracts key decisions, action items, and owners from transcripts (Zoom, Meet, etc.). Creates tasks in project management tool. Sends summary to participants with their specific action items.

**Output:** Meeting summary in Slack + tasks auto-created in Linear/Asana.

**Integrations:** Zoom/Meet transcripts (Fathom, Fireflies, Otter), Linear/Asana/Notion

---

### Client/Meeting Prep Brief
**Trigger:** 30 minutes before scheduled calls

Viktor lists the day's meetings and for each: pulls relevant documents, summarizes recent communications, lists open action items, identifies key discussion points, posts to your Slack.

---

### Vendor Performance Tracking
**Trigger:** Quarterly

Viktor collects delivery times, defect rates, communication responsiveness. Calculates scores against SLAs. Identifies trends (improving vs declining). Generates renewal/renegotiation recommendations.

**Output:** Vendor scorecard with specific issues and action items.

---

### Knowledge Base Maintenance
**Trigger:** Weekly

Viktor identifies outdated docs, cross-references with Slack questions (are people asking about documented topics?), flags docs contradicting current practice. Prioritizes what to update based on actual usage patterns.

**Output:** Docs hygiene report with specific update assignments.

**Integrations:** Notion/Confluence, Slack

---

### SOP Documentation & Updates
**Trigger:** Quarterly

Viktor monitors Slack for process questions and workarounds, identifies gaps between documented SOPs and actual practice, drafts updates based on observed patterns.

---

## HR & People

### Recruiting Pipeline Report
**Trigger:** Weekly

Viktor summarizes which positions are open, where each is in the hiring process, which roles are hard to fill, and time-in-stage patterns. Simple overview for hiring managers—no fancy dashboards needed to start.

**Output:** Weekly recruiting status with bottleneck flags.

**Integrations:** ATS (Greenhouse/Lever/Ashby), HRIS

---

### Onboarding Journey Tracker
**Trigger:** Daily during onboarding period

Viktor follows new hires' journeys—monitors their questions, tracks completion, identifies common stumbling points. Uses this to improve materials for future hires.

**Output:** Personalized reminders + insights for improving onboarding docs.

---

### Employee Sentiment Summary
**Trigger:** Monthly

Viktor aggregates feedback from surveys, Slack sentiment patterns, 1:1 notes. Identifies trending concerns and positive themes by team/department.

**Output:** Anonymized people health report with recommendations.

---

## Customer Success & Support

### Smart Ticket Enrichment
**Trigger:** New ticket created

Before the support agent opens a ticket, Viktor adds: customer context (plan, MRR, health score), recent support history, known issues affecting them, relevant KB articles, draft response for common issues.

**Integrations:** Zendesk/Intercom/Freshdesk, CRM, product analytics

---

### Issue Pattern Detector
**Trigger:** Hourly scan

Viktor identifies if multiple tickets mention the same problem. Alerts team to potential widespread issues, drafts customer communication if it's an outage, creates consolidated bug report.

---

### Support Ticket Intelligence
**Trigger:** Weekly

Viktor aggregates tickets by topic, identifies spikes in specific issues, correlates with recent releases. Generates recommendations for product/docs teams.

**Output:** Weekly support insights with action items.

---

### QBR Preparation
**Trigger:** Before quarterly business reviews

Viktor pulls usage metrics, support history, billing data. Identifies wins, challenges, opportunities. Generates presentation with customer-specific insights.

**Output:** Draft QBR deck ready for CSM customization.

**Integrations:** Product analytics, CRM, Stripe, support tools

---

## Sales

### Lead Intelligence Researcher
**Trigger:** New lead enters CRM

Within minutes, Viktor researches: company size/industry/funding/tech stack/news, decision maker backgrounds, competitive context (current tools), personalization angles.

**Output:** Briefing doc attached to CRM record.

**Integrations:** Salesforce/HubSpot, LinkedIn, web research

---

### Deal Research & Meeting Prep
**Trigger:** Before important calls

Viktor researches the company (funding, news, competitors), finds relevant case studies, generates talking points and risk factors.

**Output:** Deal brief in CRM + Slack notification.

---

### Pipeline Hygiene Enforcement
**Trigger:** Weekly

Viktor scans for deals without recent activity, missing required fields, unrealistic close dates. Generates cleanup list per rep.

**Output:** Weekly pipeline hygiene report with specific actions.

**Integrations:** Salesforce/HubSpot

---

### Win/Loss Analysis
**Trigger:** Monthly

Viktor analyzes closed deals: patterns in wins vs losses, competitor breakdown, common objections. Suggests battlecard updates and coaching opportunities.

**Integrations:** CRM, Gong/Chorus (call recordings)

---

## Legal & Compliance

### Contract Review Assistant
**Trigger:** Contract received

Viktor compares against standard terms and playbook, flags deviations with risk level, generates summary with recommended negotiation points.

**Output:** Contract review memo with redlines and risk assessment.

**Integrations:** Email, Google Drive/Dropbox, contract management (Ironclad/DocuSign CLM)

---

### Compliance Deadline Tracker
**Trigger:** Weekly

Viktor maintains compliance calendar (certifications, filings, audits), sends reminders at appropriate intervals, tracks completion, escalates overdue items.

**Output:** Weekly compliance status + proactive reminders.

---

### Regulatory Change Monitor
**Trigger:** Daily

Viktor tracks relevant regulatory feeds, summarizes changes affecting your business, drafts alerts, links changes to affected areas.

---

### Privacy Request Processing
**Trigger:** Request received

Viktor categorizes GDPR/CCPA requests, identifies systems containing user data, tracks completion across systems.

**Output:** Request status tracking + compliance documentation.

---

## Professional Services & Consulting

### Due Diligence Researcher
**Trigger:** On request

For M&A or investment analysis: company background, financial analysis from public data, news/legal history scan, competitive landscape, key risk identification.

**Output:** Structured due diligence report.

---

### Utilization & Billing Tracker
**Trigger:** Weekly

Viktor analyzes unbilled time across team, budget vs actual by engagement, utilization rates. Flags issues for partners.

**Integrations:** Time tracking (Harvest/Toggl), billing system

---

### Automated Client Reporting
**Trigger:** Weekly or monthly per client

Viktor pulls data from all relevant platforms, creates branded report with insights, highlights wins and opportunities, compares to goals. Queues for review or auto-sends.

---

## Non-Profit & NGO

### Donor Intelligence
**Trigger:** New donor or before meetings

Viktor researches donor background, giving capacity, connections to board/staff, interests alignment. Creates cultivation strategy.

---

### Grant Deadline Tracker
**Trigger:** Weekly

Viktor monitors grant calendars, requirements, eligibility. Tracks submission status. Alerts on approaching deadlines.

---

### Impact Report Generator
**Trigger:** Monthly/Quarterly

Viktor compiles program data, outcomes, impact metrics, success stories. Creates donor-ready reports.

---

## Cross-Industry Workflows

These work for almost any business:

### Weekly Team Digest
**Trigger:** Friday afternoon

Viktor summarizes week's accomplishments, goal progress, wins to celebrate, next week preview.

**Output:** Friday Slack post with company/team highlights.

---

### Competitive Intelligence Hub
**Trigger:** Weekly

Viktor aggregates competitor product changes, pricing updates, hiring signals (reveals what they're building), marketing campaigns, job postings.

**Output:** Comprehensive competitive briefing.

---

### Cross-Functional Handoff Automation
**Trigger:** Handoff event (deal closed, bug confirmed, etc.)

Viktor detects triggers, gathers all relevant context from source team, creates structured handoff document, notifies receiving team.

**Output:** Complete handoff with no manual copy-pasting.

---

## Industry-Specific Ideas

### Real Estate
- **Market Intelligence Brief:** Weekly analysis of new listings, price movements, investment opportunities
- **Property Research Package:** Comparable sales, neighborhood data, school ratings for each listing

### Healthcare
- **Patient Follow-Up Coordinator:** Identifies patients needing post-procedure follow-up, prescription refills, appointment reminders
- **Compliance Documentation Monitor:** Audits required documentation, expiring certifications, regulatory updates

### Manufacturing
- **Supply Chain Risk Monitor:** Watches supplier news, logistics disruptions, weather/geopolitical risks
- **Production Quality Monitor:** Tracks defect rates, statistical anomalies, suggests root cause investigation

### Education
- **Student Engagement Monitor:** Identifies students falling behind, engagement drops, suggests interventions
- **Content Performance Analyzer:** Which lessons work best, where students struggle, suggests improvements

### Media & Content
- **Content Calendar Manager:** Pipeline status, upcoming deadlines, coverage gaps, trending topics to cover
- **Competitor Content Monitor:** New articles, engagement metrics, trending pieces, response suggestions

---

## The Viktor Mindset

Don't think of Viktor as a tool to answer questions. Think of Viktor as:

- **Your researcher** who digs deep before meetings
- **Your monitor** who watches everything and alerts you to what matters
- **Your analyst** who turns data into insights
- **Your coordinator** who keeps things moving
- **Your scribe** who documents and follows up

The question isn't "can Viktor do X?" It's "what would a tireless, intelligent teammate do if they had access to all your systems and could work around the clock?"

---

## Getting Started

1. **Start with pain:** What takes the most time? What do they complain about?
2. **Start small:** Pick one workflow that would make a real difference
3. **Iterate:** Viktor learns from feedback—refine over time
4. **Scale:** Once one works, add more

Viktor is most powerful when handling the work you wish you had time for.
