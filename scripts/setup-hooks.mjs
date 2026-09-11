#!/usr/bin/env node
/**
 * Apunta git a .githooks. Lo invoca el script `prepare` de cada paquete, asi
 * que un `pnpm install` en server/ o client/ deja la compuerta activa sin
 * pasos manuales. Nunca falla: una instalacion fuera del repositorio (o sin
 * git) debe seguir funcionando.
 */
import { spawnSync } from 'node:child_process';

const HOOKS_PATH = '.githooks';

const run = (args) =>
  spawnSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

const inRepo = run(['rev-parse', '--is-inside-work-tree']).stdout?.trim() === 'true';
if (!inRepo) process.exit(0);

const current = run(['config', '--get', 'core.hooksPath']).stdout?.trim();
if (current === HOOKS_PATH) process.exit(0);

const result = run(['config', 'core.hooksPath', HOOKS_PATH]);
if (result.status === 0) {
  console.log(`Verificacion previa al commit activada (core.hooksPath=${HOOKS_PATH}).`);
}
