#!/usr/bin/env node
/**
 * Compuerta de calidad de MediClick, ejecutada antes de cada commit.
 *
 * Solo mira lo que está en el índice: valida los paquetes que el commit toca y
 * filtra los hallazgos a los archivos que realmente estás subiendo. El
 * repositorio arrastra deuda previa (lint, y specs con mocks desalineados de
 * los tipos de dominio); un gate que la exija toda de entrada no protege nada,
 * solo enseña a saltarse la verificación.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PACKAGES = [
  { name: 'server', extensions: ['.ts'], runsTests: true },
  { name: 'client', extensions: ['.ts', '.tsx'], runsTests: false },
];

const TS_BUILD_INFO = 'node_modules/.cache/mediclick-precommit.tsbuildinfo';

const paint = (code, s) => `\u001b[${code}m${s}\u001b[0m`;
const bold = (s) => paint('1', s);
const dim = (s) => paint('2', s);
const red = (s) => paint('31', s);
const green = (s) => paint('32', s);
const yellow = (s) => paint('33', s);

function git(args) {
  const { stdout, status } = spawnSync('git', args, { encoding: 'utf8' });
  return status === 0 ? stdout.trim() : '';
}

function stagedFiles() {
  const out = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  return out ? out.split('\n').filter(Boolean) : [];
}

function runIn(dir, bin, args) {
  const started = Date.now();
  const result = spawnSync(path.join('node_modules/.bin', bin), args, {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status ?? 1,
    seconds: ((Date.now() - started) / 1000).toFixed(1),
  };
}

function typecheck(pkg, stagedInPackage) {
  const { stdout, stderr, seconds } = runIn(pkg.name, 'tsc', [
    '--noEmit',
    '--tsBuildInfoFile',
    TS_BUILD_INFO,
  ]);

  const staged = new Set(stagedInPackage);
  const blocking = [];
  let inherited = 0;

  for (const line of `${stdout}${stderr}`.split('\n')) {
    const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS/);
    if (!match) continue;
    const file = path.posix.join(pkg.name, match[1].split(path.sep).join('/'));
    if (staged.has(file)) blocking.push(line.trim());
    else inherited += 1;
  }

  return { blocking, inherited, seconds };
}

function lint(pkg, stagedInPackage) {
  const targets = stagedInPackage.map((f) => path.relative(pkg.name, f));
  const { stdout, seconds } = runIn(pkg.name, 'eslint', [
    '--format',
    'json',
    '--no-error-on-unmatched-pattern',
    ...targets,
  ]);

  let errors = 0;
  let warnings = 0;
  try {
    for (const file of JSON.parse(stdout)) {
      errors += file.errorCount;
      warnings += file.warningCount;
    }
  } catch {
    return { errors: 0, warnings: 0, seconds, unavailable: true };
  }
  return { errors, warnings, seconds };
}

function relatedTests(pkg, stagedInPackage) {
  const targets = stagedInPackage
    .map((f) => path.relative(pkg.name, f))
    .filter((f) => f.startsWith('src/'));

  if (targets.length === 0) return null;

  const { stdout, stderr, code, seconds } = runIn(pkg.name, 'jest', [
    '--findRelatedTests',
    ...targets,
    '--passWithNoTests',
    '--silent',
    '--ci',
  ]);

  const output = `${stdout}${stderr}`;
  const summary = output.match(/Tests:.*/)?.[0] ?? 'sin pruebas relacionadas';
  return { ok: code === 0, summary: summary.trim(), output, seconds };
}

function main() {
  const root = git(['rev-parse', '--show-toplevel']);
  if (!root) process.exit(0);
  process.chdir(root);

  const staged = stagedFiles();
  if (staged.length === 0) process.exit(0);

  console.log(bold('\nMediClick - verificacion previa al commit'));
  console.log(dim(`${staged.length} archivo(s) en el indice\n`));

  const problems = [];
  const notes = [];

  const secrets = staged.filter(
    (f) => /(^|\/)\.env($|\.)/.test(f) && !f.endsWith('.example'),
  );
  if (secrets.length > 0) {
    problems.push(`archivo de entorno en el indice: ${secrets.join(', ')}`);
    console.log(`${red('x')} entorno    ${secrets.join(', ')}`);
  }

  for (const pkg of PACKAGES) {
    if (!existsSync(path.join(pkg.name, 'node_modules'))) continue;

    const mine = staged.filter(
      (f) =>
        f.startsWith(`${pkg.name}/`) && pkg.extensions.includes(path.extname(f)),
    );
    if (mine.length === 0) continue;

    console.log(bold(`${pkg.name} ${dim(`- ${mine.length} archivo(s)`)}`));

    const types = typecheck(pkg, mine);
    if (types.blocking.length > 0) {
      problems.push(`${pkg.name}: ${types.blocking.length} error(es) de tipos`);
      console.log(
        `  ${red('x')} tipos      ${types.blocking.length} error(es) en tus archivos ${dim(`(${types.seconds}s)`)}`,
      );
      for (const line of types.blocking) console.log(`      ${red(line)}`);
    } else {
      console.log(
        `  ${green('v')} tipos      sin errores en tus archivos ${dim(`(${types.seconds}s)`)}`,
      );
    }
    if (types.inherited > 0) {
      console.log(
        dim(
          `      ${types.inherited} error(es) preexistente(s) en otros archivos, ignorados`,
        ),
      );
    }

    const style = lint(pkg, mine);
    if (style.unavailable) {
      console.log(`  ${yellow('-')} estilo     no se pudo evaluar`);
    } else if (style.errors > 0 || style.warnings > 0) {
      notes.push(`${pkg.name}: ${style.errors} error(es) de lint`);
      console.log(
        `  ${yellow('-')} estilo     ${style.errors} error(es), ${style.warnings} aviso(s) ${dim(`(${style.seconds}s, informativo)`)}`,
      );
    } else {
      console.log(
        `  ${green('v')} estilo     limpio ${dim(`(${style.seconds}s)`)}`,
      );
    }

    if (pkg.runsTests) {
      const tests = relatedTests(pkg, mine);
      if (tests === null) {
        console.log(`  ${dim('-')} pruebas    nada que ejecutar`);
      } else if (tests.ok) {
        console.log(
          `  ${green('v')} pruebas    ${tests.summary} ${dim(`(${tests.seconds}s)`)}`,
        );
      } else {
        problems.push(`${pkg.name}: pruebas relacionadas en rojo`);
        console.log(
          `  ${red('x')} pruebas    ${tests.summary} ${dim(`(${tests.seconds}s)`)}`,
        );
        console.log(dim(tests.output.split('\n').slice(-25).join('\n')));
      }
    }

    console.log('');
  }

  const schema = staged.includes('server/prisma/schema.prisma');
  const migration = staged.some((f) =>
    f.startsWith('server/prisma/migrations/'),
  );
  if (schema && !migration) {
    notes.push('schema.prisma cambio sin una migracion acompanante');
    console.log(
      `${yellow('-')} prisma     schema.prisma sin migracion en el indice ${dim('(informativo)')}`,
    );
    console.log(
      dim(
        '      Prisma trata como drift cualquier objeto de base de datos que el schema no declare.\n',
      ),
    );
  }

  if (notes.length > 0) {
    console.log(yellow('Para revisar cuando puedas:'));
    for (const note of notes) console.log(yellow(`  - ${note}`));
    console.log('');
  }

  if (problems.length > 0) {
    console.log(red(bold('Commit detenido:')));
    for (const problem of problems) console.log(red(`  x ${problem}`));
    console.log(
      dim(
        '\nCorrige y reintenta, o usa MEDICLICK_SKIP_HOOKS=1 git commit ... si necesitas pasar igual.\n',
      ),
    );
    process.exit(1);
  }

  console.log(green('Todo en orden.\n'));
}

main();
