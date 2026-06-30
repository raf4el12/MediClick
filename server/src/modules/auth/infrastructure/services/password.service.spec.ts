import { PasswordService } from './password.service.js';

// ─── OWASP A02: Cryptographic Failures ───────────────────────────────────────

describe('PasswordService — OWASP A02', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashea con cost factor 12 (codificado en el prefijo del hash)', async () => {
    const hash = await service.hash('s3cret-passw0rd');

    // Formato bcrypt: $2b$<cost>$<salt+digest>
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('un hash compara verdadero contra su password original', async () => {
    const hash = await service.hash('s3cret-passw0rd');

    await expect(service.compare('s3cret-passw0rd', hash)).resolves.toBe(true);
  });

  it('un hash compara falso contra una password distinta', async () => {
    const hash = await service.hash('s3cret-passw0rd');

    await expect(service.compare('otra-cosa', hash)).resolves.toBe(false);
  });
});
