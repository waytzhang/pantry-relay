# Pantry Relay: dinner planning that remembers what actually happened

**Local draft for owner review. No external submission or contest registration has occurred.**

## Inspiration

One person decides dinner; someone else cooks it. A shopping list grows, but the pantry does not know what was used. Pantry Relay keeps those actions separate and remembers the handoff, so an assistant can coordinate a meal without quietly inventing stock or double-counting ingredients.

## What it does

Pantry Relay reads a shared pantry, ranks original vegetarian recipes by available ingredients and near-date stock, and presents dinner options within a serving count and time limit. A chosen meal reserves stock only after confirmation. Cooking deducts that stock exactly once. Cancellation releases the plan and its shopping needs. Pantry state and meal history survive restarts.

Conflicting requests are handled explicitly: another change to stock makes a proposal stale and requires a new recommendation. Shortages appear on the shopping list but never become inventory until food is actually recorded as received.

## How we built it

Node.js, SQLite, Express, the official MCP TypeScript SDK, Zod, Bootstrap and native browser code. The self-hosted MCP endpoint uses protocol 2025-11-25 over Streamable HTTP. Six tools, one pantry resource and one reusable prompt support a multi-step agent workflow. A reusable SKILL.md documents confirmation and recovery behavior.

All design, code and written materials were produced with Codex assistance for the owner's review. Demo recipes are original examples. Seeded household records are fictional.

## What the demo proves

The browser interface and MCP tools share the same persistent pantry logic. Automated checks exercise real SDK client-to-server calls and protocol negotiation. The browser flow demonstrates proposal, confirmation, reservation, cooking and persistence.

The browser text box uses a deterministic parser and planner, not a paid language-model service. This submission candidate is a working self-hosted MCP integration; it is not presented as a live Alexa+ account session or a certified Alexa skill.

## Challenges and lessons

An assistant can propose a meal without implying it has been cooked. We built explicit state transitions and idempotent retries because dinner planning spans several people and several moments. Date-label changes and restocking also invalidate assumptions. These details matter more than another recipe chatbot.

## What's next

Test the MCP workflow with a user-selected agent client, extend recipes and ingredient units, and add authenticated multi-household hosting only after a deployment budget and privacy requirements are agreed.

## Submission fields still requiring owner action

- Legal entrant, real residence, adult eligibility and contest rules acceptance.
- GitHub repository URL under the owner's account, with the included MIT license.
- Public YouTube or Vimeo demo URL, under three minutes.
- Primary track: Alexa+. Optional Open Source mini-challenge only after a separate qualifying public contribution is verified.
- Product feedback: see FEEDBACK.md.

No AWS mini-challenge is claimed: no AWS service was used. No prize, revenue, user adoption, customer endorsement or Alexa certification is claimed.
