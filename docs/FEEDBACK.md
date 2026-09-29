# Product feedback

This feedback describes actual local MCP and browser work. It does not claim a live Alexa+ device test.

## Tools used

The official MCP TypeScript SDK 1.31.0 provides six typed tools, a pantry resource, a prompt and a stateless Streamable HTTP endpoint. Its client runs the recorded demonstration and the real HTTP integration test, which negotiated protocol 2025-11-25. Express 5.2.1 serves the local application; Zod 4.6.5 validates tool inputs; Node.js 24 and SQLite persist pantry stock, reservations and meal history. sql.js 1.14.2 runs the same pantry operations with WebAssembly SQLite in the public browser sample. Bootstrap supplies basic UI styling, and GitHub Pages hosts the static demo. Codex assisted with implementation, checks and written materials; Python and FFmpeg produced the caption-only review video. This is feedback from the local MCP prototype and browser sample. A live Alexa+ session has not been tested.

## What worked

The MCP SDK server and client could exercise the complete pantry handoff without a cloud account or paid model. Typed tool registration and the resource/prompt interfaces kept the agent-facing operations small and testable. Express and Zod made the HTTP routes and input checks straightforward. Node SQLite retained the household state across restarts. sql.js let the browser sample reuse the same SQL operations without an application server; its export function made persistence possible. Bootstrap and GitHub Pages were enough to make the prototype available to reviewers without installation. The twelve passing checks include the real SDK client over HTTP, repeated cooking, stale plans, competing browser sessions and failed storage writes. Codex helped iterate on those checks, and the Python/FFmpeg pipeline produced a verifiable 2:23 captioned demo from actual captures.

## What needs work

The main integration work was representing confirmation and stale state in the application. MCP tool annotations alone cannot establish that a person agreed to reserve food; the server still needs a confirmation check and stock-version guard. Node SQLite and browser sql.js expose different statement APIs, so a small adapter was needed to keep one pantry implementation. Browser storage can fail or contain invalid data; failed writes must not leave a partial reservation. Web Locks coordinate tabs where supported, with a one-tab fallback elsewhere. A download-event waiter in the Codex browser timed out even though the file had been saved; the workaround was to read the new download and compare its contents. Devpost gallery controls did not open a chooser in this automation environment, so the story uses supported Markdown images. These are observed application, compatibility and tooling limits, not evidence of a failure in an Amazon service. No conclusion about Alexa+ device reliability is possible from this prototype.

## Onboarding

The first verified connection was a local MCP server and the official SDK client over Streamable HTTP. That gave a small, reproducible path from reading stock to recommending dinner, confirming it and recording cooking. Express, Zod and Node SQLite kept this first version local and avoided cloud credentials. The browser-only version required a separate sql.js adapter and storage/locking checks; after that, GitHub Pages could serve the sample without a backend. Bootstrap did not require a build system. Codex helped with setup and iteration, but generated changes were checked through tests and the running browser. The video workflow was changed to captions after checking the license of the initial system voice. Onboarding was completed for the local MCP and browser workflows; device/account onboarding into a live Alexa+ client remains untested.

## Would use again

Yes for the MCP SDK and this local/browser stack: they let the same pantry operations serve both an interactive household interface and a testable agent connection. I would continue using typed inputs, explicit confirmation and persistent state for shared-data tools. The next step for Alexa+ would be validating those operations in an actual client; I have not yet tested the device experience. Fire TV, Ring, Bee and AWS were not used, so I cannot give a first-hand assessment of their onboarding or reliability.
