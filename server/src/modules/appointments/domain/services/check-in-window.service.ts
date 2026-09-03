import { localDateAndTimeToInstant } from '../../../../shared/utils/date-time.utils.js';

export const CHECK_IN_EARLY_MINUTES = 30;
export const CHECK_IN_LATE_MINUTES = 15;

export interface CheckInWindowInput {
  scheduleDate: Date;
  startTime: Date;
  timezone: string;
}

export interface CheckInWindow {
  opensAt: Date;
  startsAt: Date;
  closesAt: Date;
}

export class CheckInWindowService {
  getWindow(input: CheckInWindowInput): CheckInWindow {
    const startsAt = localDateAndTimeToInstant(
      input.scheduleDate,
      input.startTime,
      input.timezone,
    );

    const opensAt = new Date(
      startsAt.getTime() - CHECK_IN_EARLY_MINUTES * 60 * 1000,
    );
    const closesAt = new Date(
      startsAt.getTime() + CHECK_IN_LATE_MINUTES * 60 * 1000,
    );

    return {
      opensAt,
      startsAt,
      closesAt,
    };
  }

  isOpen(input: CheckInWindowInput, now: Date): boolean {
    const { opensAt, closesAt } = this.getWindow(input);
    const nowTime = now.getTime();
    return nowTime >= opensAt.getTime() && nowTime <= closesAt.getTime();
  }
}
