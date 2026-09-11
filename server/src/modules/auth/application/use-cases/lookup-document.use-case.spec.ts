import { LookupDocumentUseCase } from './lookup-document.use-case.js';
import type { LookupDocumentDto } from '../dto/lookup-document.dto.js';

// ─── OWASP A10: Server-Side Request Forgery (SSRF) ───────────────────────────
// El host de la API externa (RENIEC) esta hardcodeado en el use-case; el unico
// dato del usuario que llega a la URL (numberDocument) debe validarse ANTES de
// interpolarse, para que no se pueda usar este endpoint como proxy hacia otro
// host ni inyectar segmentos de path/query.

describe('LookupDocumentUseCase — OWASP A10 (SSRF)', () => {
  let useCase: LookupDocumentUseCase;
  let configService: { get: jest.Mock };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  const dni: LookupDocumentDto = {
    typeDocument: 'DNI',
    numberDocument: '12345678',
  };

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue('fake-token') };
    useCase = new LookupDocumentUseCase(configService as never);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('rechaza un numberDocument que no son 8 digitos sin llamar a la API externa', async () => {
    const result = await useCase.execute({
      typeDocument: 'DNI',
      numberDocument: '123',
    });

    expect(result).toEqual({ found: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rechaza un intento de inyectar un host/path distinto vía numberDocument', async () => {
    const result = await useCase.execute({
      typeDocument: 'DNI',
      numberDocument: '12345678.evil.com/steal',
    });

    expect(result).toEqual({ found: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('solo consulta documentos DNI — otros tipos no llegan a la API externa', async () => {
    const result = await useCase.execute({
      typeDocument: 'CE',
      numberDocument: '12345678',
    });

    expect(result).toEqual({ found: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sin RENIEC_API_TOKEN configurado, no llama a la API externa', async () => {
    configService.get.mockReturnValue(undefined);
    useCase = new LookupDocumentUseCase(configService as never);

    const result = await useCase.execute(dni);

    expect(result).toEqual({ found: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('con DNI valido, llama SIEMPRE al mismo host fijo con el numero exacto', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          first_name: 'ana',
          first_last_name: 'perez',
          second_last_name: 'lopez',
          full_name: '',
          document_number: '12345678',
        }),
    } as Response);

    const result = await useCase.execute(dni);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.decolecta.com/v1/reniec/dni?numero=12345678',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer fake-token',
          Accept: 'application/json',
        },
      }),
    );
    expect(result).toEqual({
      found: true,
      name: 'Ana',
      lastName: 'Perez Lopez',
    });
  });

  it('si la API externa responde error o cae, retorna found:false sin lanzar', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);

    await expect(useCase.execute(dni)).resolves.toEqual({ found: false });
  });
});
