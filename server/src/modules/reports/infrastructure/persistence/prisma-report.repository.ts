import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IReportRepository } from '../../domain/interfaces/report-repository.interface.js';
import {
  WeeklyAppointmentReport,
  RevenueReport,
  TopDoctorReport,
  AppointmentsSummaryReport,
  ScheduleOccupancyReport,
} from '../../domain/interfaces/report-data.interface.js';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

@Injectable()
export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyAppointments(): Promise<WeeklyAppointmentReport[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // Lunes de esta semana
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    // Domingo de esta semana
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);

    const results: WeeklyAppointmentReport[] = [];

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(monday);
      dayStart.setDate(monday.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const count = await this.prisma.appointments.count({
        where: {
          deleted: false,
          schedule: {
            scheduleDate: { gte: dayStart, lt: dayEnd },
          },
        },
      });

      results.push({
        dayOfWeek: DAY_NAMES[dayStart.getDay()],
        date: dayStart.toISOString().split('T')[0],
        count,
      });
    }

    return results;
  }

  async getRevenue(month: number, year: number): Promise<RevenueReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Ingresos proyectados: sum appointment.amount donde no están canceladas
    const projectedResult = await this.prisma.appointments.aggregate({
      _sum: { amount: true },
      where: {
        deleted: false,
        status: { notIn: ['CANCELLED'] },
        schedule: {
          scheduleDate: { gte: startDate, lt: endDate },
        },
      },
    });

    // Ingresos reales: sum transactions.amount donde status = PAID
    const actualResult = await this.prisma.transactions.aggregate({
      _sum: { amount: true },
      where: {
        status: 'PAID',
        appointment: {
          schedule: {
            scheduleDate: { gte: startDate, lt: endDate },
          },
        },
      },
    });

    return {
      projectedRevenue: projectedResult._sum.amount
        ? Number(projectedResult._sum.amount)
        : 0,
      actualRevenue: actualResult._sum.amount
        ? Number(actualResult._sum.amount)
        : 0,
      currency: 'PEN',
    };
  }

  async getTopDoctors(
    month: number,
    year: number,
    limit: number,
  ): Promise<TopDoctorReport[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Group appointments by doctorId (via schedule), filter COMPLETED
    const completedAppointments = await this.prisma.appointments.findMany({
      where: {
        deleted: false,
        status: 'COMPLETED',
        schedule: {
          scheduleDate: { gte: startDate, lt: endDate },
        },
      },
      select: {
        schedule: {
          select: {
            doctorId: true,
            doctor: {
              select: {
                id: true,
                profile: { select: { name: true, lastName: true } },
                specialties: {
                  where: { deleted: false },
                  select: {
                    specialty: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Aggregate by doctor
    const doctorMap = new Map<
      number,
      {
        name: string;
        lastName: string;
        specialties: Set<string>;
        count: number;
      }
    >();

    for (const appt of completedAppointments) {
      const doc = appt.schedule.doctor;
      const existing = doctorMap.get(doc.id);

      if (existing) {
        existing.count++;
        doc.specialties.forEach((s) =>
          existing.specialties.add(s.specialty.name),
        );
      } else {
        const specSet = new Set<string>();
        doc.specialties.forEach((s) => specSet.add(s.specialty.name));
        doctorMap.set(doc.id, {
          name: doc.profile.name,
          lastName: doc.profile.lastName,
          specialties: specSet,
          count: 1,
        });
      }
    }

    // Sort by count desc and limit
    const sorted = [...doctorMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit);

    return sorted.map(([doctorId, data]) => ({
      doctorId,
      doctorName: `${data.name} ${data.lastName}`,
      specialties: [...data.specialties],
      completedAppointments: data.count,
    }));
  }

  async getAppointmentsSummary(
    month: number,
    year: number,
  ): Promise<AppointmentsSummaryReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Agrupar por status
    const grouped = await this.prisma.appointments.groupBy({
      by: ['status'],
      _count: { id: true },
      where: {
        deleted: false,
        schedule: {
          scheduleDate: { gte: startDate, lt: endDate },
        },
      },
    });

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of grouped) {
      byStatus[row.status] = row._count.id;
      total += row._count.id;
    }

    // Citas por día del mes
    const appointments = await this.prisma.appointments.findMany({
      where: {
        deleted: false,
        schedule: {
          scheduleDate: { gte: startDate, lt: endDate },
        },
      },
      select: {
        schedule: {
          select: { scheduleDate: true },
        },
      },
    });

    const dailyMap = new Map<string, number>();
    for (const appt of appointments) {
      const dateKey = appt.schedule.scheduleDate
        .toISOString()
        .split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + 1);
    }

    const daily = [...dailyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    return { total, byStatus, daily };
  }

  async getScheduleOccupancy(
    month: number,
    year: number,
  ): Promise<ScheduleOccupancyReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const totalSlots = await this.prisma.schedules.count({
      where: {
        scheduleDate: { gte: startDate, lt: endDate },
      },
    });

    const bookedSlots = await this.prisma.schedules.count({
      where: {
        scheduleDate: { gte: startDate, lt: endDate },
        appointments: {
          some: {
            deleted: false,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
        },
      },
    });

    const availableSlots = totalSlots - bookedSlots;
    const occupancyRate =
      totalSlots > 0
        ? Math.round((bookedSlots / totalSlots) * 1000) / 10
        : 0;

    return { totalSlots, bookedSlots, availableSlots, occupancyRate };
  }
}
