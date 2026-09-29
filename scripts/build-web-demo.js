import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'docs');
mkdirSync(resolve(target, 'vendor'), { recursive: true });
for (const file of ['app.js', 'app.css', 'bootstrap.min.css', 'bootstrap-LICENSE.txt', 'proof.html', 'proof.js', 'proof.json']) {
  let content = readFileSync(resolve(root, 'public', file), 'utf8');
  if (file.endsWith('.html')) content = content.replaceAll('href="/', 'href="./').replaceAll('src="/', 'src="./');
  if (file === 'proof.js') content = content.replace("fetch('/proof.json')", "fetch('./proof.json')");
  writeFileSync(resolve(target, file), content);
}
for (const file of ['pantry-core.js', 'browser-database.js', 'browser-session.js']) copyFileSync(resolve(root, 'src', file), resolve(target, file));
copyFileSync(resolve(root, 'scripts/browser-data-source.js'), resolve(target, 'data-source.js'));
for (const file of ['sql-wasm.js', 'sql-wasm.wasm']) copyFileSync(resolve(root, 'node_modules/sql.js/dist', file), resolve(target, 'vendor', file));
copyFileSync(resolve(root, 'node_modules/sql.js/LICENSE'), resolve(target, 'vendor/sql-js-LICENSE.txt'));
writeFileSync(resolve(target, '.nojekyll'), '');
let html = readFileSync(resolve(root, 'public/index.html'), 'utf8')
  .replaceAll('href="/', 'href="./').replaceAll('src="/', 'src="./')
  .replace('Fictional household demo', 'Sample kitchen · saved in this browser')
  .replace('id="plan-button"', 'id="plan-button" disabled')
  .replace('Made for everyday kitchens.', 'Try it with fictional food. <button class="text-button" type="button" id="reset-demo">Reset sample pantry</button> · <a href="https://github.com/waytzhang/pantry-relay">Source</a> ·')
  .replace('<script type="module"', '<script src="./vendor/sql-wasm.js"></script>\n<script type="module"');
writeFileSync(resolve(target, 'index.html'), html);
writeFileSync(resolve(target, 'about.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>About Pantry Relay</title><link rel="stylesheet" href="./bootstrap.min.css"><link rel="stylesheet" href="./app.css"></head><body><main class="container app-shell"><a href="./">Back to the kitchen</a><section class="panel mt-4"><h1>A sample kitchen you can try</h1><p>Plan dinner, reserve its ingredients, record it cooked, or cancel it. The demo starts with fictional food. Changes are saved in this browser and are not shared with another computer. Reset sample pantry starts a fresh kitchen.</p><p>The planner uses simple serving and time rules, with five original vegetarian recipes. It does not call a paid model or send pantry entries to an application server. Web Locks coordinate changes between tabs in supported browsers; otherwise use one tab at a time.</p><p>This page uses the same pantry operations as the local Node.js and MCP prototype, with SQLite compiled to WebAssembly through sql.js. The MCP service runs separately on the local computer; this website is not an Alexa+ device session or a public MCP endpoint.</p><p>Built with Codex assistance as an Amazon Developer Hackathon candidate. No contest submission, certification, user adoption or prize is claimed.</p><p><a href="./proof.html">Recorded official-SDK MCP calls</a> · <a href="https://www.youtube.com/watch?v=DOhFGAurOiY">2:23 review video</a> · <a href="https://devpost.com/software/pantry-relay-e4pyuh">Project story</a></p><p>Recipes are demonstration content, not dietary advice. Date labels help organize food and do not establish food safety. Bootstrap and sql.js retain their MIT notices; SQLite is public domain.</p></section></main></body></html>`);
console.log('Browser demo built in docs/ with the shared pantry operations and local SQLite persistence.');
