import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stage = resolve(root, '.build/mcpb');
const output = resolve(root, 'dist/pantry-relay.mcpb');

rmSync(stage, { recursive: true, force: true });
mkdirSync(resolve(stage, 'src'), { recursive: true });
mkdirSync(dirname(output), { recursive: true });
for (const file of ['package.json', 'package-lock.json', 'LICENSE', 'README-MCPB.md']) {
  cpSync(resolve(root, file), resolve(stage, file));
}
for (const file of ['stdio.js', 'mcp.js', 'store.js', 'pantry-core.js']) {
  cpSync(resolve(root, 'src', file), resolve(stage, 'src', file));
}
cpSync(resolve(root, 'mcpb/manifest.json'), resolve(stage, 'manifest.json'));

execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
  cwd: stage,
  stdio: 'inherit',
});
execFileSync('npx', ['--yes', '@anthropic-ai/mcpb@2.1.2', 'validate', resolve(stage, 'manifest.json')], {
  cwd: root,
  stdio: 'inherit',
});
execFileSync('npx', ['--yes', '@anthropic-ai/mcpb@2.1.2', 'pack', stage, output], {
  cwd: root,
  stdio: 'inherit',
});
console.log(`MCP bundle built at ${output}`);
