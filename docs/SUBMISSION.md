# Pantry Relay

## Tagline

Plan dinner from the pantry. Reserve it when chosen. Update stock when cooked.

## Inspiration

Choosing dinner and cooking dinner are two different events. A shared pantry needs to remember both. Otherwise, two people can plan meals around the same ingredients, or a suggested recipe can look like food that has already been used.

Pantry Relay keeps that handoff visible: suggest a meal, confirm it, then record that it was cooked.

## What it does

Ask for dinner for two in under 30 minutes. Pantry Relay checks the cupboard, scales five vegetarian recipes, and ranks the options by ingredient coverage and stock approaching its recorded date.

Browsing options leaves the pantry alone. Confirming a meal reserves its ingredients and adds any shortages to the shopping list. Marking the meal cooked deducts the reserved stock once, even if the request is repeated. Cancelling releases that meal's reservations and shopping needs.

If someone changes the stock after a recommendation, the old proposal is blocked and must be refreshed. Items on the shopping list become inventory only when they are recorded as received. Plans and stock survive an app restart.

## How it was built

The app uses Node.js, SQLite, Express, Zod and the official MCP TypeScript SDK. The browser and the MCP tools share the same pantry operations. The self-hosted endpoint supports Streamable HTTP with protocol 2025-11-25, six tools, a pantry resource and a dinner-planning prompt. A bundled skill explains when an agent should ask for confirmation and how to recover from a stale proposal.

The browser demo uses a deterministic command parser. The MCP path was tested with the official SDK client; a live Alexa+ device session has not been tested. Everything runs locally without a paid model endpoint or cloud account.

Codex assisted with the design, code, testing and written materials. The recipes are original demo examples and the household records are fictional.

## Challenges

The difficult part was keeping three quantities straight: what is in the pantry, what another meal has reserved, and what is still missing. A retry must not use food twice. Cancelling one meal must not erase another meal's shopping needs. Checking these transitions made the handoff reliable.

## Accomplishments

The complete propose-confirm-cook flow works through both the browser and MCP. Nine automated checks cover repeated cooking requests, stale proposals, shortages, cancellation, restarts and real HTTP protocol negotiation. The 2 minute 23 second review video uses captures of the running app and its recorded MCP calls.

## What was learned

A tool's description is not proof that the user approved a change. Confirmation needs to be represented in the application, and the agent needs clear instructions about which actions require it.

## What's next

Test the same workflow in an Alexa+ client, add more recipes and units, and try it with more than one household member before adding remote hosting.

## Entry details (not part of the public story)

- Source: https://github.com/waytzhang/pantry-relay (public, MIT licensed).
- Built with: JavaScript, Node.js, SQLite, Express, MCP, Zod, Bootstrap, HTML, CSS.
- Intended primary track: Alexa+.
- No AWS or optional Open Source prize claim is included.
- Product feedback: see FEEDBACK.md.
- Video: evidence/pantry-relay-review.mp4; a public YouTube or Vimeo URL is still needed.
- Devpost project story and technology tags are saved at https://devpost.com/software/pantry-relay-e4pyuh. Contest registration is waiting for the entrant's eligibility and rules acceptance. No contest entry has been submitted.
