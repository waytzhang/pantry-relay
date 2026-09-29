# Pantry Relay

A local household dinner handoff: plan from available food, reserve a chosen meal, remember it across sessions, and record cooking without double-counting inventory. Built with AI assistance as a candidate for the Amazon Developer Hackathon Alexa+ track. **Not submitted, not an awarded project, and not an Amazon-certified integration.**

## Run locally, with no recharge

Prerequisite: Node.js 24 or newer. No paid cloud account, API key, wallet, hardware, or subscription is required for this application.

```sh
npm ci
npm start
```

Open `http://127.0.0.1:8767`. Demo stock is fictional, with date labels relative to the first run. The SQLite file is in `data/pantry.sqlite`. To start a separate fictional household, set `PANTRY_DB` to a different file. `PANTRY_PORT` changes the local port.

## Try the complete handoff

1. Enter “Dinner for 2, vegetarian, under 25 minutes.” and choose **Find dinner**. Stock is unchanged.
2. Review the recipe, quantities and shortages. Choose **Confirm dinner** to reserve available ingredients. Shortages become shopping needs.
3. When that meal was actually cooked, choose **Meal cooked**. Reserved quantities are consumed once. Refresh: the pantry and meal history remain.
4. Plan for eight people to exercise shortages. **Cancel dinner** removes only that meal's reservations and shopping needs. Record real new stock before replanning.

The browser command input uses a small deterministic parser for serving count and minutes. It is **not a hosted LLM or a live Alexa session**. The recipe ranker uses pantry coverage and near-date stock. The real MCP service exposes that workflow to an agent chosen by the user; no hosted AI inference is bundled or charged by this application.

## Agent connection

Connect a client that supports **MCP 2025-11-25 Streamable HTTP** to `http://127.0.0.1:8767/mcp`. The official MCP SDK serves JSON responses without a long-lived session. This is a local development configuration: it listens only on loopback and is not suitable for public deployment without household authentication.

Tools: `pantry_snapshot`, `recommend_dinner`, `confirm_dinner`, `mark_meal_cooked`, `cancel_dinner`, `record_new_stock`. It also provides the `pantry://household/current` resource and `rescue-dinner` prompt. [Reusable agent guidance](skills/pantry-relay/SKILL.md).

```sh
npm run demo
# Only on fictional demo data, to explicitly opt into state changes:
npm run demo -- --confirm-demo
```

The SDK client makes actual HTTP MCP calls. The report lists tool inputs and outputs; it does not pretend to be a live Alexa account. To change the endpoint, set `PANTRY_MCP_URL`.

## Verification

```sh
npm test
```

Nine checks cover unchanged stock during proposals, exact-once cooking, stale proposals from overlapping users, cancellation, shortages, expiry changes, valid restocking, restart persistence, and the official MCP client over real HTTP. The integration test explicitly verifies protocol negotiation returns `2025-11-25`.

Browser evidence is in `evidence/`. The recorded flow confirms a two-person skillet, records it cooked, reloads the app, and verifies the retained inventory. See [verification record](evidence/verification.json).

## Scope and limits

One household, one local computer; no user accounts or external transactions. Original demo recipes are not nutritional advice. Date labels organize stock; they do not establish food safety. Food recorded as received is not automatically substituted into an older plan: cancel and replan. Quantities use grams or whole-item counts. Multi-household hosting, nutritional recommendations, speech recognition, a general language-model agent and certified Alexa deployment are not implemented.

## Review materials

- [Submission draft](docs/SUBMISSION.md)
- [Demo recording script](docs/DEMO.md)
- [Narrated review video](evidence/pantry-relay-review.mp4), about 2 minutes 23 seconds, made from actual browser captures. This is a screen-capture montage for review, not a claimed live Alexa session or an uploaded contest entry.
- [Developer feedback](docs/FEEDBACK.md)
- [Opportunity check](../evidence/amazon-alexa-opportunity.json)

Source code is offered under MIT; Bootstrap retains its own MIT notice in `public/bootstrap-LICENSE.txt`. Dependency licenses stay with their npm packages. No credentials, household database, or `node_modules` are included in the release archive.
