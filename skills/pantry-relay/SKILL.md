---
name: pantry-relay
description: Plan household dinners with the Pantry Relay MCP service, reserve available ingredients after a meal choice, record cooked meals, and maintain a shared shopping list. Use for this connected pantry, not general dietary or nutrition questions.
---

# Pantry Relay

Use the connected Pantry Relay tools to coordinate dinner from actual household stock. The server exposes Streamable HTTP at `http://127.0.0.1:8767/mcp` for a local demo. Read the project's README for startup and connection instructions if the service is unavailable.

Read `pantry_snapshot` first. Distinguish quantities on hand, quantities reserved by another plan, and food past its date label. The household state survives restarts. Do not treat shopping-list entries as received stock or date labels as a freshness guarantee.

For a dinner request, call `recommend_dinner` with the requested serving count and time limit. Demo recipes are vegetarian. Defaults of two people and 25 minutes are suitable if the user gives no constraints; state the assumptions with the recommendations.

Present the recipe, serving count, preparation time, soon-to-use items, and any shopping needs. A recommendation creates a proposal only. When the user chooses and explicitly confirms it, call `confirm_dinner` using its plan ID and `confirmation: "Confirm dinner"`.

`STALE_PLAN` means the pantry changed after the proposal. Read the current stock and recommend again; obtain a choice for the updated plan. Do not keep retrying the stale ID. An identical confirmation retry is idempotent.

Call `mark_meal_cooked` with `confirmation: "Meal cooked"` only when the user says the meal was actually cooked. That consumes the reserved quantities once. A plan with shopping needs cannot be marked cooked: explain that the user must cancel it, record actual received food with `record_new_stock`, and replan. After an explicit cancellation, call `cancel_dinner` with `confirmation: "Cancel dinner"`.

Return a concise household handoff: what's planned or cooked, what's still available, and what is needed. This workflow has no purchase, payment, outbound message, or background action tools.

Example requests:

- “Dinner for two in 25 minutes. Use things close to their date labels.” → Read stock and present ranked options without reducing inventory.
- “Confirm the chickpea skillet.” → Reserve that chosen proposal and record shortages, if any.
- “We made that meal.” → Mark the reserved plan cooked and show the updated pantry.
- “Cancel tonight's dinner.” → Release that plan's reservations and shopping needs without consuming food.
