import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../domain/enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  function createMockContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = createMockContext({ role: UserRole.PATIENT });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when empty roles array', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const ctx = createMockContext({ role: UserRole.PATIENT });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow ADMIN when ADMIN is in required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
      UserRole.DOCTOR,
    ]);
    const ctx = createMockContext({ role: UserRole.ADMIN });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny PATIENT when only DOCTOR is required', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.DOCTOR]);
    const ctx = createMockContext({ role: UserRole.PATIENT });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should deny RECEPTIONIST when only ADMIN is required', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = createMockContext({ role: UserRole.RECEPTIONIST });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw if no user on request', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = createMockContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
