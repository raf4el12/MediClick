import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entrypointUrl = new URL('../dist/src/main.js', import.meta.url);
await access(entrypointUrl);

const port = process.env.SMOKE_PORT ?? '5199';
const child = spawn(process.execPath, [fileURLToPath(entrypointUrl)], {
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? 'test',
    PORT: port,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => {
  output += String(chunk);
});
child.stderr.on('data', (chunk) => {
  output += String(chunk);
});

let exitCode;
child.once('exit', (code) => {
  exitCode = code;
});

const deadline = Date.now() + 30_000;
let healthy = false;

try {
  while (Date.now() < deadline) {
    if (exitCode !== undefined) {
      throw new Error(
        `El proceso de producción terminó antes de readiness (code=${exitCode}).\n${output}`,
      );
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) {
        healthy = true;
        break;
      }
    } catch {
      // El socket todavía no está escuchando; se reintenta hasta el deadline.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!healthy) {
    throw new Error(`El backend no alcanzó readiness en 30s.\n${output}`);
  }

  process.stdout.write(`Production smoke ready on port ${port}\n`);
} finally {
  if (exitCode === undefined) {
    child.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]);
    if (exitCode === undefined) child.kill('SIGKILL');
  }
}
