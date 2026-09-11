#!/usr/bin/env node
/**
 * Valida el mensaje del commit contra la convención que el repositorio ya usa:
 * `tipo(alcance): descripción`, en minúscula y sin punto final.
 *
 * Los tipos salen del historial real del proyecto, no de una lista genérica.
 */
import { readFileSync } from 'node:fs';

const TYPES = [
  'feat',
  'fix',
  'docs',
  'test',
  'refactor',
  'perf',
  'style',
  'build',
  'ci',
  'chore',
  'revert',
];

const SUBJECT = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9/_.-]+)\))?(?<breaking>!)?: (?<description>.+)$/;
const GENERATED = /^(?:Merge |Revert "|fixup!|squash!|amend!)/;

const red = (s) => `\u001b[31m${s}\u001b[0m`;
const yellow = (s) => `\u001b[33m${s}\u001b[0m`;
const dim = (s) => `\u001b[2m${s}\u001b[0m`;

function closest(word) {
  let best = null;
  let bestScore = Infinity;
  for (const type of TYPES) {
    const score = distance(word, type);
    if (score < bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return bestScore <= 2 ? best : null;
}

function distance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
    }
  }
  return rows[a.length][b.length];
}

function main() {
  const file = process.argv[2];
  if (!file) process.exit(0);

  const raw = readFileSync(file, 'utf8');
  const lines = raw.split('\n').filter((line) => !line.startsWith('#'));
  const subject = (lines[0] ?? '').trim();

  if (subject === '' || GENERATED.test(subject)) process.exit(0);

  const problems = [];
  const notes = [];
  const match = SUBJECT.exec(subject);

  if (!match) {
    problems.push('el asunto no sigue el formato tipo(alcance): descripción');
    const word = subject.split(/[\s(:]/)[0];
    const suggestion = closest(word.toLowerCase());
    if (suggestion) problems.push(`¿querías escribir "${suggestion}" en lugar de "${word}"?`);
  } else {
    const { type, description } = match.groups;

    if (!TYPES.includes(type)) {
      const suggestion = closest(type);
      problems.push(
        `tipo "${type}" desconocido${suggestion ? ` — ¿"${suggestion}"?` : ''}`,
      );
    }
    if (description.trim().length < 6) {
      problems.push('la descripción es demasiado corta para explicar el cambio');
    }
    if (description.endsWith('.')) {
      problems.push('la descripción no lleva punto final');
    }
    if (/^[A-Z][a-z]/.test(description)) {
      notes.push('la descripción suele ir en minúscula');
    }
    if (subject.length > 100) {
      notes.push(`el asunto tiene ${subject.length} caracteres; por debajo de 72 se lee mejor`);
    }
  }

  if (lines.length > 1 && lines[1].trim() !== '') {
    problems.push('falta una línea en blanco entre el asunto y el cuerpo');
  }

  for (const note of notes) console.log(yellow(`  - ${note}`));

  if (problems.length > 0) {
    console.log(red('\nMensaje de commit rechazado:'));
    for (const problem of problems) console.log(red(`  x ${problem}`));
    console.log(dim(`\n  Recibido: ${subject}`));
    console.log(dim(`  Esperado: ${TYPES.slice(0, 4).join('|')}(alcance): descripción en minúscula\n`));
    process.exit(1);
  }
}

main();
