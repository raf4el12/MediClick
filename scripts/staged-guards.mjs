/**
 * Revisiones sobre el contenido que el commit va a guardar.
 *
 * Todas leen el blob del índice (`git show :archivo`), no el archivo en disco:
 * lo que se commitea es el índice, y ambos pueden diferir cuando hay cambios
 * sin agregar.
 */
import { spawnSync } from 'node:child_process';

const TEXT_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|sh|sql|env|prisma|graphql)$/;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const SECRET_PATTERNS = [
  { name: 'clave privada', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'token de MercadoPago', re: /\b(?:APP_USR|TEST)-\d{6,}-\d{6}-[a-f0-9]{32}-\d+\b/ },
  { name: 'clave de AWS', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'token de GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
];

const CONNECTION_URL = /\b(?:postgres|postgresql|mysql|redis|mongodb):\/\/[^\s:@/]+:([^\s:@/]+)@([^\s/:"'`]+)/g;
// Las URLs de ejemplo del repositorio usan interpolacion, contrasenas de
// muestra o apuntan al host local; solo interesa una credencial real.
const SAMPLE_SECRET = /^(?:\$|<|\*|test|pass|example|changeme|secret|demo|user|admin|root|postgres|redis|clave|contrase)/i;
const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal|db|postgres|redis|mysql|mongo)$/i;

function realConnectionCredential(content) {
  for (const match of content.matchAll(CONNECTION_URL)) {
    const [, password, host] = match;
    if (password.length < 8) continue;
    if (SAMPLE_SECRET.test(password)) continue;
    if (LOCAL_HOST.test(host)) continue;
    return true;
  }
  return false;
}

const FOCUSED_TEST = /(?:^|[^.\w])(?:describe|it|test)\.only\s*\(|(?:^|[^.\w])(?:fdescribe|fit)\s*\(/;
const CONFLICT_MARKER = /^(?:<{7}|={7}|>{7})(?:\s|$)/m;
const DEBUGGER = /(?:^|[^.\w])debugger\s*;?\s*$/m;

function gitText(args) {
  const { stdout, status } = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return status === 0 ? stdout : null;
}

function stagedSize(file) {
  const out = gitText(['cat-file', '-s', `:${file}`]);
  return out === null ? 0 : Number(out.trim());
}

function stagedContent(file) {
  if (!TEXT_EXTENSIONS.test(file)) return null;
  if (stagedSize(file) > 1024 * 1024) return null;
  return gitText(['show', `:${file}`]);
}

/**
 * Devuelve { blocking: [], advisory: [] }. Cada entrada es un texto listo para
 * mostrar; el orquestador decide cómo presentarlas.
 */
export function inspectStaged(files) {
  const blocking = [];
  const advisory = [];

  for (const file of files) {
    const size = stagedSize(file);
    if (size > MAX_FILE_BYTES) {
      const mb = (size / 1024 / 1024).toFixed(1);
      blocking.push(`${file}: ${mb} MB en el índice (máximo ${MAX_FILE_BYTES / 1024 / 1024} MB)`);
    }

    if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.example')) {
      blocking.push(`${file}: archivo de entorno en el índice`);
    }

    const content = stagedContent(file);
    if (content === null) continue;

    for (const { name, re } of SECRET_PATTERNS) {
      if (re.test(content)) blocking.push(`${file}: parece contener un secreto (${name})`);
    }

    if (realConnectionCredential(content)) {
      blocking.push(`${file}: parece contener una credencial real en una URL de conexión`);
    }

    if (CONFLICT_MARKER.test(content)) {
      blocking.push(`${file}: marcadores de conflicto sin resolver`);
    }

    if (/\.(ts|tsx|js|jsx|mjs)$/.test(file) && DEBUGGER.test(content)) {
      blocking.push(`${file}: sentencia debugger`);
    }

    if (/\.spec\.ts$/.test(file) && FOCUSED_TEST.test(content)) {
      blocking.push(`${file}: prueba enfocada (.only/fdescribe/fit) — dejaría la suite pasando en falso`);
    }

    if (/^server\/src\/.*\.ts$/.test(file) && !/\.spec\.ts$/.test(file)) {
      const logs = content.match(/console\.log\s*\(/g);
      if (logs) advisory.push(`${file}: ${logs.length} console.log (el proyecto usa Logger de Nest)`);
    }
  }

  const schema = files.includes('server/prisma/schema.prisma');
  const migration = files.some((f) => f.startsWith('server/prisma/migrations/'));
  if (schema && !migration) {
    advisory.push(
      'server/prisma/schema.prisma cambió sin una migración en el índice — Prisma trata como drift cualquier objeto que el schema no declare',
    );
  }

  return { blocking, advisory };
}

/**
 * Archivos del índice cuyo contenido en disco ya no coincide con lo que se va
 * a commitear. El typecheck, el lint y las pruebas leen el disco, así que en
 * esos archivos el resultado no describe exactamente el commit.
 */
export function driftedFromIndex(files) {
  const unstaged = gitText(['diff', '--name-only', '--diff-filter=ACMR']);
  if (!unstaged) return [];
  const dirty = new Set(unstaged.split('\n').filter(Boolean));
  return files.filter((f) => dirty.has(f));
}

/**
 * Líneas que el diff agrega, por archivo. `--unified=0` emite hunks sin
 * contexto, así que cada rango contiene solo líneas nuevas.
 */
export function addedLines(baseRef) {
  const diff = baseRef
    ? gitText(['diff', '--unified=0', '--diff-filter=ACMR', `${baseRef}...HEAD`])
    : gitText(['diff', '--cached', '--unified=0', '--diff-filter=ACMR']);

  const byFile = new Map();
  if (!diff) return byFile;

  let current = null;
  for (const line of diff.split('\n')) {
    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line);
    if (fileMatch) {
      current = fileMatch[1];
      if (!byFile.has(current)) byFile.set(current, new Set());
      continue;
    }

    const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk || current === null) continue;

    const start = Number(hunk[1]);
    // Un hunk sin contador cubre exactamente una línea; contador 0 es un borrado puro.
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const lines = byFile.get(current);
    for (let i = 0; i < count; i += 1) lines.add(start + i);
  }

  return byFile;
}
