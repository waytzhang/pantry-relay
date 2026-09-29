# Observed integration friction

These observations come from the actual prototype workflow on 2026-09-29. They are not claims about live Alexa+ device behavior.

## Browser compatibility for a local SQLite workflow

- Task: make the local pantry handoff available as an install-free browser sample.
- Steps: reuse the pantry operations from the Node.js SQLite application in a static site.
- Expected: keep the same SQL operations and reservation/cooking semantics.
- Observed: Node built-ins do not run in a static browser page; sql.js has a different statement interface, and browser storage and competing tabs require separate handling.
- Severity: Important for distributing this sample; a platform compatibility constraint, not an SDK defect.
- Workaround: extract one pantry core, add a small sql.js database adapter, save only successful operations, and use Web Locks with a one-tab fallback. Three meaningful browser-adapter checks exercise persistence, contention and storage failures.
- Suggestion: a small dual-runtime stateful-tool reference would help developers maintain one implementation.

## Download observation in the Codex in-app browser

- Task: verify the shopping-list export from the sample.
- Steps: start the documented download-event waiter, then activate Export.
- Expected: the event returns the downloaded file path.
- Observed: the waiter timed out; a new text file was nevertheless saved in Downloads. Its four quantities matched the displayed shopping needs.
- Severity: Minor automation limitation; download itself worked.
- Workaround: independently inspect the new file and its contents. The final export is an ordinary download link generated from the current pantry snapshot.
- Suggestion: ensure the download observer reports the native in-app browser's completed downloads.

## Devpost image chooser in this automation environment

- Task: add actual prototype screenshots to the project page.
- Steps: activate the visible gallery/thumbnail control using the documented browser flow and await a file chooser.
- Expected: a picker for the selected PNG files.
- Observed: no chooser became available. Native control of the protected Codex app was denied, so that route was not pursued. This does not establish a Devpost-wide defect.
- Severity: Minor; the project story still displays the real screenshots.
- Workaround: use the platform-supported Markdown image syntax with the public project's screenshots. The saved page contains five loaded images.
- Suggestion: make gallery controls available through the supported browser file-chooser interface.
