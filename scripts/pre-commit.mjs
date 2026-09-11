#!/usr/bin/env node
/**
 * Compuerta de calidad de MediClick.
 *
 * Evalúa un cambio, no el repositorio: mira los archivos que el commit toca y
 * juzga lo que ese cambio introduce. El repositorio arrastra deuda previa
 * (lint y algunos specs con mocks desalineados); una compuerta que la exija
 * toda de entrada bloquea trabajo legítimo en archivos que nadie tocó, y lo
 * único que enseña es a usar --no-verify.
 *
 *   node scripts/pre-commit.mjs                 lo que está en el índice (hook)
 *   node scripts/pre-commit.mjs --base origin/main   el diff completo de la rama
 *   node scripts/pre-commit.mjs --all           todo el proyecto, sin filtrar
 */
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { spawnSync } from 'node:child_process';
import { addedLines, driftedFromIndex, inspectStaged } from './staged-guards.mjs';

const run = promisify(execFile);

const PACKAGES = [
  { name: 'server', extensions: ['.ts'], runsTests: true },
  { name: 'client', extensions: ['.ts', '.tsx'], runsTests: false },
];

const CACHE_DIR = 'node_modules/.cache';
const TS_BUILD_INFO = `${CACHE_DIR}/mediclick-precommit.tsbuildinfo`;
const TYPE_BASELINE = `${CACHE_DIR}/mediclick-type-baseline.json`;

const TIMEOUTS = { tsc: 300_000, eslint: 180_000, jest: 300_000 };

const paint = (code, s) => `\u001b[${code}m${s}\u001b[0m`;
const bold = (s) => paint('1', s);
const dim = (s) => paint('2', s);
const red = (s) => paint('31', s);
const green = (s) => paint('32', s);
const yellow = (s) => paint('33', s);

function git(args) {
  const { stdout, status } = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return status === 0 ? stdout.trim() : '';
}

async function tool(dir, bin, args, timeout) {
  const started = Date.now();
  try {
    const { stdout, stderr } = await run(path.join('node_modules/.bin', bin), args, {
      cwd: dir,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout,
    });
    return { stdout, stderr, code: 0, seconds: elapsed(started) };
  } catch (error) {
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      code: error.code ?? 1,
      killed: error.killed === true,
      seconds: elapsed(started),
    };
  }
}

const elapsed = (from) => ((Date.now() - from) / 1000).toFixed(1);

function parseTypeErrors(output) {
  const errors = [];
  for (const line of output.split('\n')) {
    const match = line.match(/^(.+?)\((\d+),(\d+)\): (error TS\d+: .*)$/);
    if (!match) continue;
    const file = match[1].split(path.sep).join('/');
    errors.push({
      file,
      detail: match[4],
      // La firma ignora línea y columna: un error que solo se desplazó por una
      // edición cercana sigue siendo el mismo error de siempre.
      signature: `${file}|${match[4]}`,
      text: line.trim(),
    });
  }
  return errors;
}

function readBaseline(pkg) {
  try {
    const raw = readFileSync(path.join(pkg.name, TYPE_BASELINE), 'utf8');
    return new Set(JSON.parse(raw).signatures);
  } catch {
    return null;
  }
}

function writeBaseline(pkg, signatures) {
  try {
    mkdirSync(path.join(pkg.name, CACHE_DIR), { recursive: true });
    writeFileSync(
      path.join(pkg.name, TYPE_BASELINE),
      JSON.stringify({ updated: new Date().toISOString(), signatures }, null, 0),
    );
  } catch {
    // Un caché que no se puede escribir degrada la precisión, no el resultado.
  }
}

async function typecheck(pkg, targets) {
  const result = await tool(
    pkg.name,
    'tsc',
    ['--noEmit', '--tsBuildInfoFile', TS_BUILD_INFO],
    TIMEOUTS.tsc,
  );

  if (result.killed) {
    return { timedOut: true, seconds: result.seconds, blocking: [], known: 0 };
  }

  const errors = parseTypeErrors(`${result.stdout}${result.stderr}`);
  const touched = new Set(targets);
  const baseline = readBaseline(pkg);

  const blocking = [];
  const inherited = [];

  for (const error of errors) {
    const mine = touched.has(path.posix.join(pkg.name, error.file));
    // Un error en un archivo ajeno también es tuyo si antes no existía: suele
    // ser el consumidor que tu cambio de firma acaba de romper.
    const regression = baseline !== null && !baseline.has(error.signature);
    if (mine || regression) blocking.push({ ...error, regression: !mine });
    else inherited.push(error);
  }

  if (blocking.length === 0) {
    writeBaseline(pkg, errors.map((e) => e.signature));
  } else if (baseline === null) {
    writeBaseline(pkg, inherited.map((e) => e.signature));
  }

  return {
    blocking,
    known: inherited.length,
    seconds: result.seconds,
    firstRun: baseline === null,
  };
}

async function lint(pkg, targets, added) {
  const relative = targets.map((f) => path.relative(pkg.name, f));
  const result = await tool(
    pkg.name,
    'eslint',
    ['--format', 'json', '--no-error-on-unmatched-pattern', ...relative],
    TIMEOUTS.eslint,
  );

  if (result.killed) return { timedOut: true, seconds: result.seconds };

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return { unavailable: true, seconds: result.seconds, detail: result.stderr.trim() };
  }

  const introduced = [];
  let carried = 0;

  for (const file of report) {
    const repoPath = path.posix.join(
      pkg.name,
      path.relative(path.resolve(pkg.name), file.filePath).split(path.sep).join('/'),
    );
    const lines = added.get(repoPath);

    for (const message of file.messages) {
      // Sin línea significa fallo de parseo o de configuración: eso no es deuda
      // heredada, es el archivo que no compila para ESLint.
      const isNew = lines === undefined || message.line === undefined || lines.has(message.line);
      if (!isNew) {
        carried += 1;
        continue;
      }
      introduced.push({
        file: repoPath,
        line: message.line ?? 0,
        severity: message.severity,
        rule: message.ruleId ?? 'parse',
        text: message.message,
      });
    }
  }

  return {
    errors: introduced.filter((m) => m.severity === 2),
    warnings: introduced.filter((m) => m.severity === 1),
    carried,
    seconds: result.seconds,
  };
}

async function relatedTests(pkg, targets) {
  const relative = targets
    .map((f) => path.relative(pkg.name, f))
    .filter((f) => f.startsWith('src/'));

  if (relative.length === 0) return null;

  const result = await tool(
    pkg.name,
    'jest',
    ['--findRelatedTests', ...relative, '--passWithNoTests', '--silent', '--ci'],
    TIMEOUTS.jest,
  );

  if (result.killed) return { timedOut: true, seconds: result.seconds };

  const output = `${result.stdout}${result.stderr}`;
  return {
    ok: result.code === 0,
    summary: (output.match(/Tests:.*/)?.[0] ?? 'sin pruebas relacionadas').trim(),
    output,
    seconds: result.seconds,
  };
}

async function checkPackage(pkg, targets, added) {
  const [types, style, tests] = await Promise.all([
    typecheck(pkg, targets),
    lint(pkg, targets, added),
    pkg.runsTests ? relatedTests(pkg, targets) : Promise.resolve(null),
  ]);
  return { pkg, targets, types, style, tests };
}

function reportPackage(result, problems, notes, lintBlocks) {
  const { pkg, types, style, tests } = result;
  console.log(bold(`${pkg.name} ${dim(`- ${result.targets.length} archivo(s)`)}`));

  if (types.timedOut) {
    problems.push(`${pkg.name}: el chequeo de tipos excedió el tiempo límite`);
    console.log(`  ${red('x')} tipos      sin respuesta ${dim(`(${types.seconds}s)`)}`);
  } else if (types.blocking.length > 0) {
    problems.push(`${pkg.name}: ${types.blocking.length} error(es) de tipos`);
    console.log(
      `  ${red('x')} tipos      ${types.blocking.length} error(es) ${dim(`(${types.seconds}s)`)}`,
    );
    for (const error of types.blocking.slice(0, 12)) {
      const tag = error.regression ? yellow(' [regresión] ') : ' ';
      console.log(`      ${red(error.text)}${tag}`);
    }
  } else {
    console.log(`  ${green('v')} tipos      limpio ${dim(`(${types.seconds}s)`)}`);
  }
  if (types.known > 0) {
    console.log(dim(`      ${types.known} error(es) previo(s) del repositorio, sin tocar`));
  }

  if (style.timedOut) {
    notes.push(`${pkg.name}: el lint excedió el tiempo límite`);
    console.log(`  ${yellow('-')} estilo     sin respuesta ${dim(`(${style.seconds}s)`)}`);
  } else if (style.unavailable) {
    notes.push(`${pkg.name}: no se pudo evaluar el estilo`);
    console.log(`  ${yellow('-')} estilo     no se pudo evaluar ${dim(`(${style.seconds}s)`)}`);
  } else if (style.errors.length > 0) {
    const sink = lintBlocks ? problems : notes;
    sink.push(`${pkg.name}: ${style.errors.length} error(es) de estilo`);
    console.log(
      `  ${red('x')} estilo     ${style.errors.length} error(es) en líneas nuevas ${dim(`(${style.seconds}s)`)}`,
    );
    for (const message of style.errors.slice(0, 12)) {
      console.log(`      ${red(`${message.file}:${message.line}`)} ${message.text} ${dim(message.rule)}`);
    }
  } else {
    console.log(`  ${green('v')} estilo     limpio en líneas nuevas ${dim(`(${style.seconds}s)`)}`);
  }
  if (!style.timedOut && !style.unavailable) {
    if (style.warnings.length > 0) {
      notes.push(`${pkg.name}: ${style.warnings.length} aviso(s) de estilo en líneas nuevas`);
    }
    if (style.carried > 0) {
      console.log(dim(`      ${style.carried} hallazgo(s) previo(s) en esos archivos, sin tocar`));
    }
  }

  if (tests === null) {
    if (pkg.runsTests) console.log(`  ${dim('-')} pruebas    nada que ejecutar`);
  } else if (tests.timedOut) {
    problems.push(`${pkg.name}: las pruebas excedieron el tiempo límite`);
    console.log(`  ${red('x')} pruebas    sin respuesta ${dim(`(${tests.seconds}s)`)}`);
  } else if (tests.ok) {
    console.log(`  ${green('v')} pruebas    ${tests.summary} ${dim(`(${tests.seconds}s)`)}`);
  } else {
    problems.push(`${pkg.name}: pruebas relacionadas en rojo`);
    console.log(`  ${red('x')} pruebas    ${tests.summary} ${dim(`(${tests.seconds}s)`)}`);
    console.log(dim(tests.output.split('\n').slice(-20).join('\n')));
  }

  console.log('');
}

function targetFiles(mode) {
  if (mode.kind === 'all') {
    return git(['ls-files']).split('\n').filter(Boolean);
  }
  if (mode.kind === 'base') {
    const out = git(['diff', '--name-only', '--diff-filter=ACMR', `${mode.base}...HEAD`]);
    return out ? out.split('\n').filter(Boolean) : [];
  }
  const out = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  return out ? out.split('\n').filter(Boolean) : [];
}

function parseMode(argv) {
  if (argv.includes('--all')) return { kind: 'all' };
  const index = argv.indexOf('--base');
  if (index !== -1 && argv[index + 1]) return { kind: 'base', base: argv[index + 1] };
  return { kind: 'staged' };
}

async function main() {
  const root = git(['rev-parse', '--show-toplevel']);
  if (!root) process.exit(0);
  process.chdir(root);

  const mode = parseMode(process.argv.slice(2));
  const files = targetFiles(mode);
  if (files.length === 0) {
    if (mode.kind === 'staged') process.exit(0);
    console.log('No hay archivos que revisar.');
    process.exit(0);
  }

  const title =
    mode.kind === 'staged'
      ? 'verificacion previa al commit'
      : mode.kind === 'base'
        ? `revision del diff contra ${mode.base}`
        : 'revision completa del proyecto';
  console.log(bold(`\nMediClick - ${title}`));
  console.log(dim(`${files.length} archivo(s)\n`));

  const problems = [];
  const notes = [];

  if (mode.kind === 'staged') {
    const guards = inspectStaged(files);
    for (const finding of guards.blocking) {
      problems.push(finding);
      console.log(`${red('x')} contenido  ${finding}`);
    }
    for (const finding of guards.advisory) notes.push(finding);
    if (guards.blocking.length > 0) console.log('');

    const drifted = driftedFromIndex(files);
    if (drifted.length > 0) {
      notes.push(
        `${drifted.length} archivo(s) tienen cambios sin agregar: tipos, estilo y pruebas leyeron el disco, no el índice`,
      );
    }
  }

  const added = mode.kind === 'all' ? new Map() : addedLines(mode.kind === 'base' ? mode.base : null);

  const applicable = PACKAGES.map((pkg) => ({
    pkg,
    targets: files.filter(
      (f) => f.startsWith(`${pkg.name}/`) && pkg.extensions.includes(path.extname(f)),
    ),
  })).filter(({ pkg, targets }) => targets.length > 0 && existsSync(path.join(pkg.name, 'node_modules')));

  const results = await Promise.all(
    applicable.map(({ pkg, targets }) => checkPackage(pkg, targets, added)),
  );

  for (const result of results) reportPackage(result, problems, notes, mode.kind !== 'all');

  if (notes.length > 0) {
    console.log(yellow('Para revisar cuando puedas:'));
    for (const note of notes) console.log(yellow(`  - ${note}`));
    console.log('');
  }

  if (problems.length > 0) {
    console.log(red(bold(mode.kind === 'staged' ? 'Commit detenido:' : 'Revisión en rojo:')));
    for (const problem of problems) console.log(red(`  x ${problem}`));
    if (mode.kind === 'staged') {
      console.log(
        dim('\nCorrige y reintenta, o usa MEDICLICK_SKIP_HOOKS=1 git commit ... si necesitas pasar igual.\n'),
      );
    } else {
      console.log('');
    }
    process.exit(1);
  }

  console.log(green('Todo en orden.\n'));
}

main().catch((error) => {
  console.error(`La verificación falló de forma inesperada: ${error.message}`);
  process.exit(1);
});
