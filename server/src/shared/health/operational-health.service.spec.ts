import { OperationalHealthService } from './operational-health.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('OperationalHealthService (Termómetro del Core de Citas y Waitlist)', () => {
  let service: OperationalHealthService;
  let prisma: {
    appointments: { count: jest.Mock };
    waitlistEntries: { count: jest.Mock };
    waitlistOffers: { count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      appointments: { count: jest.fn() },
      waitlistEntries: { count: jest.fn() },
      waitlistOffers: { count: jest.fn() },
    };

    service = new OperationalHealthService(prisma as unknown as PrismaService);
  });

  it('RED->GREEN: reporta estado "healthy" cuando los signos vitales del sistema están en rangos normales', async () => {
    prisma.appointments.count
      .mockResolvedValueOnce(0) // pendingExpired
      .mockResolvedValueOnce(2); // atRisk
    prisma.waitlistEntries.count.mockResolvedValueOnce(5); // activeWaitlist
    prisma.waitlistOffers.count
      .mockResolvedValueOnce(1) // pendingOffers
      .mockResolvedValueOnce(0); // staleOffers

    const telemetry = await service.getVitalSigns();

    expect(telemetry.status).toBe('healthy');
    expect(telemetry.vitalSigns.appointments.pendingExpired).toBe(0);
    expect(telemetry.vitalSigns.appointments.atRisk).toBe(2);
    expect(telemetry.vitalSigns.waitlist.activeWaitlist).toBe(5);
    expect(telemetry.vitalSigns.waitlist.staleOffers).toBe(0);
    expect(telemetry.alerts).toHaveLength(0);
  });

  it('RED->GREEN: reporta estado "degraded" y genera alerta si hay acumulación de citas pendientes expiradas', async () => {
    prisma.appointments.count
      .mockResolvedValueOnce(60) // pendingExpired (>50)
      .mockResolvedValueOnce(5); // atRisk
    prisma.waitlistEntries.count.mockResolvedValueOnce(10); // activeWaitlist
    prisma.waitlistOffers.count
      .mockResolvedValueOnce(3) // pendingOffers
      .mockResolvedValueOnce(0); // staleOffers

    const telemetry = await service.getVitalSigns();

    expect(telemetry.status).toBe('degraded');
    expect(telemetry.alerts).toContain(
      'Acumulación anormal de citas PENDING vencidas; verificar scheduler de expiración.',
    );
  });

  it('RED->GREEN: reporta estado "degraded" si hay ofertas de waitlist vencidas sin resolver', async () => {
    prisma.appointments.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.waitlistEntries.count.mockResolvedValueOnce(2);
    prisma.waitlistOffers.count
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(25); // staleOffers (>20)

    const telemetry = await service.getVitalSigns();

    expect(telemetry.status).toBe('degraded');
    expect(telemetry.alerts).toContain(
      'Ofertas de waitlist vencidas pendientes de limpieza; verificar job de waitlist.',
    );
  });
});
