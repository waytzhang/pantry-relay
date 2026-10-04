# Pantry Relay local MCP bundle

The `.mcpb` download contains the Pantry Relay local MCP server and its runtime dependencies. Install it in a client that supports MCP bundles and Node.js 24 or newer. It provides the same six pantry tools as the source repository, over stdio. The browser sample is separate and remains free at https://waytzhang.github.io/pantry-relay/ .

The bundle needs no account, paid API or network connection for pantry operations. On first run it creates a SQLite database at `~/.pantry-relay/pantry.sqlite` (or the equivalent home directory on Windows). This is not shared with the browser sample or synced to another device. A launcher can set `PANTRY_DB` to a different local database path before starting the server. Back up or delete the file yourself as needed.

Start with fictional food. The tools require explicit confirmation before reserving, cancelling or recording a meal as cooked. Date labels help organize stock; they are not food-safety advice. No shopping service, purchase action or external message tool is included.

The source is MIT licensed and public. A contribution does not buy exclusive access or future features. The bundle is built from the same source using `npm run build:mcpb`; no source secrets, household data or Git history belong in the archive. Report problems through https://github.com/waytzhang/pantry-relay/issues .
