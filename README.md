# Pantry Relay

A local household dinner handoff: plan from available food, reserve a chosen meal, remember it across sessions, and record cooking without double-counting inventory. Built with AI assistance as a candidate for the Amazon Developer Hackathon Alexa+ track. **Not submitted, not an awarded project, and not an Amazon-certified integration.**

## Try in your browser

[Open the sample kitchen](https://waytzhang.github.io/pantry-relay/). No installation, login, paid model or cloud account is needed. This static demo uses the same pantry operations with SQLite compiled to WebAssembly through sql.js. Its fictional stock and meal plans stay in this browser's site storage; they are not synchronized between computers. Supported browsers coordinate tabs with Web Locks. Otherwise, use one tab at a time.

[Download the browser release and offline preview](https://github.com/waytzhang/pantry-relay/releases/tag/v0.1.0-web). The standalone offline file is a preview; direct file opening has not been browser-verified. The hosted sample above is the tested version.

If you try the sample kitchen, [share a bug or missing-use-case note on GitHub](https://github.com/waytzhang/pantry-relay/issues/new). Posting requires a GitHub account. No household data is collected by the demo for feedback.

The public site demonstrates the pantry workflow. The real MCP endpoint runs separately in the local application below; the website does not provide a live Alexa session. To rebuild the static files from source, run `npm run build:web` after installing dependencies. GitHub Pages serves `docs/`.

## Install as a local MCP bundle

[Download the MCP bundle](https://github.com/waytzhang/pantry-relay/releases/tag/v0.1.0-mcpb) for a client that supports `.mcpb` files and Node.js 24 or newer. It runs the same six tools over stdio and stores its own SQLite database in your home directory, separately from the browser sample. The [bundle guide](README-MCPB.md) describes the location and limits. It includes the runtime dependencies, but no household data or account credentials.

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

Thirteen checks cover unchanged stock during proposals, exact-once cooking, stale proposals from overlapping users, cancellation, shortages, expiry changes, valid restocking, and official MCP clients over real HTTP and stdio. The HTTP integration test explicitly verifies protocol negotiation returns `2025-11-25`. Browser-adapter checks use actual WebAssembly SQLite to verify persisted state, competing tabs, and failed storage writes without partial reservations. `npm run build:mcpb` creates the installable archive; `npm run verify:mcpb` checks the unpacked bundle with a real MCP client.

Browser evidence is in `evidence/`. The recorded flow confirms a two-person skillet, records it cooked, reloads the app, and verifies the retained inventory. See [verification record](evidence/verification.json).

## Scope and limits

One household, one local computer; no user accounts or external transactions. Original demo recipes are not nutritional advice. Date labels organize stock; they do not establish food safety. Food recorded as received is not automatically substituted into an older plan: cancel and replan. Quantities use grams or whole-item counts. Multi-household hosting, nutritional recommendations, speech recognition, a general language-model agent and certified Alexa deployment are not implemented.

## Review materials

- [Submission draft](docs/SUBMISSION.md)
- [Demo recording script](docs/DEMO.md)
- [Public review video](https://www.youtube.com/watch?v=DOhFGAurOiY), 2 minutes 23 seconds, captioned with no audio. It uses actual browser captures and recorded MCP calls. A live Alexa session has not been tested. [Local MP4](evidence/pantry-relay-review.mp4).
- [Developer feedback](docs/FEEDBACK.md)
- [Opportunity check](evidence/amazon-alexa-opportunity.json)

Source code is offered under MIT; Bootstrap retains its own MIT notice in `public/bootstrap-LICENSE.txt`. Dependency licenses stay with their npm packages. The source review archive excludes credentials, household data and dependencies. The installable MCP bundle includes only the server files and their runtime dependencies, with no credentials or household database.
