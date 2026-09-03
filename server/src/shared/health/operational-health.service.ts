import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface OperationalVitalSigns {
  status: 'healthy' | 'degraded';
  timestamp: string;
  vitalSigns: {
    appointments: {
      pendingExpired: number;
      atRisk: number;
    };
    waitlist: {
      activeWaitlist: number;
      pendingOffers: number;
      staleOffers: number;
    };
  };
  alerts: string[];
}

@Injectable()
export class OperationalHealthService {
  private readonly logger = new Logger(OperationalHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getVitalSigns(): Promise<OperationalVitalSigns> {
    const now = new Date();

    const [pendingExpired, atRisk, activeWaitlist, pendingOffers, staleOffers] =
      await Promise.all([
        this.prisma.appointments.count({
          where: {
            status: 'PENDING',
            pendingUntil: { lt: now },
            deleted: false,
          },
        }),
        this.prisma.appointments.count({
          where: {
            status: 'CONFIRMED',
            isAtRisk: true,
            deleted: false,
          },
        }),
        this.prisma.waitlistEntries.count({
          where: {
            status: 'ACTIVE',
          },
        }),
        this.prisma.waitlistOffers.count({
          where: {
            status: 'PENDING',
          },
        }),
        this.prisma.waitlistOffers.count({
          where: {
            status: 'PENDING',
            expiresAt: { lt: now },
          },
        }),
      ]);

    const alerts: string[] = [];

    if (pendingExpired > 50) {
      alerts.push(
        'Acumulación anormal de citas PENDING vencidas; verificar scheduler de expiración.',
      );
    }

    if (staleOffers > 20) {
      alerts.push(
        'Ofertas de waitlist vencidas pendientes de limpieza; verificar job de waitlist.',
      );
    }

    const status = alerts.length > 0 ? 'degraded' : 'healthy';

    if (status === 'degraded') {
      this.logger.warn(
        `[HEALTH DEGRADED] Telemetría operativa detectó anomalías: ${alerts.join(' | ')}`,
      );
    }

    return {
      status,
      timestamp: now.toISOString(),
      vitalSigns: {
        appointments: {
          pendingExpired,
          atRisk,
        },
        waitlist: {
          activeWaitlist,
          pendingOffers,
          staleOffers,
        },
      },
      alerts,
    };
  }
}
