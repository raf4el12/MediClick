import type { Page, Route } from '@playwright/test';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5100';

export type ApiRequest = {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
};
export type Fixture = unknown;
export type ApiRoutes = Record<string, Fixture>;

const REPLY = Symbol('reply');
type Reply = { [REPLY]: true; status: number; body: unknown };

/** Respuesta con un status distinto de 200, p. ej. `reply(404, { message: '…' })`. */
export function reply(status: number, body?: unknown): Reply {
  return { [REPLY]: true, status, body };
}

const isReply = (value: unknown): value is Reply =>
  typeof value === 'object' && value !== null && REPLY in value;

function corsHeaders(appOrigin: string, requestedHeaders?: string): Record<string, string> {
  return {
    'access-control-allow-origin': appOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': requestedHeaders ?? 'content-type,authorization',
  };
}

function parseBody(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// `libs/graphql.ts` no envía operationName: la operación se identifica por el
// primer campo raíz de la consulta.
function graphqlOperation(body: unknown): string {
  const { operationName, query } = (body ?? {}) as { operationName?: string; query?: string };
  if (operationName) return operationName;
  return /\{\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(query ?? '')?.[1] ?? '(desconocida)';
}

function matches(pattern: string, key: string): boolean {
  if (pattern === key) return true;
  const [patternMethod, patternPath] = pattern.split(' ');
  const [keyMethod, keyPath] = key.split(' ');
  if (patternMethod !== keyMethod || !patternPath || !keyPath) return false;
  const expected = patternPath.split('/');
  const actual = keyPath.split('/');
  return (
    expected.length === actual.length &&
    expected.every((segment, i) => segment.startsWith(':') || segment === actual[i])
  );
}

/**
 * Simula la API REST/GraphQL del backend sobre `page.route`. Cada test declara
 * las respuestas que le importan con `on`; el resto sale de los valores por
 * defecto del actor. Una llamada sin respuesta se aborta y queda en
 * `unmatched`, que el fixture exige vacío al terminar: ningún test depende de
 * un backend real.
 */
export class ApiMock {
  readonly unmatched: string[] = [];
  private readonly routes: ApiRoutes = {};

  constructor(
    private readonly defaults: ApiRoutes,
    private readonly appOrigin: string,
  ) {}

  on(key: string, fixture: Fixture | ((request: ApiRequest) => unknown)): void {
    this.routes[key] = fixture;
  }

  async install(page: Page): Promise<void> {
    await page.route(`${API_URL}/**`, (route) => this.handle(route));
  }

  private find(key: string): Fixture | undefined {
    for (const table of [this.routes, this.defaults]) {
      if (key in table) return table[key];
    }
    for (const table of [this.routes, this.defaults]) {
      const pattern = Object.keys(table).find((candidate) => matches(candidate, key));
      if (pattern) return table[pattern];
    }
    return undefined;
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: corsHeaders(this.appOrigin, request.headers()['access-control-request-headers']),
      });
      return;
    }

    const url = new URL(request.url());
    const path = url.pathname.slice(new URL(API_URL).pathname.replace(/\/$/, '').length) || '/';
    const body = parseBody(request.postData());
    const key =
      method === 'POST' && path === '/graphql' ? `GQL ${graphqlOperation(body)}` : `${method} ${path}`;

    const fixture = this.find(key);
    if (fixture === undefined) {
      this.unmatched.push(
        key.startsWith('GQL ') ? `GraphQL sin fixture: ${key.slice(4)}` : `REST sin fixture: ${key}`,
      );
      await route.abort('failed');
      return;
    }

    const result =
      typeof fixture === 'function'
        ? await (fixture as (request: ApiRequest) => unknown)({ method, path, query: url.searchParams, body })
        : fixture;
    const { status, payload } = isReply(result)
      ? { status: result.status, payload: result.body }
      : { status: 200, payload: result };

    await route.fulfill({
      status,
      headers: corsHeaders(this.appOrigin),
      contentType: 'application/json',
      body: JSON.stringify(payload ?? null),
    });
  }
}
