import { GetSessionsUseCase } from './get-sessions.use-case.js';
import type { IRefreshTokenRepository } from '../../domain/contracts/refresh-token-repository.interface.js';
import type { RefreshTokenData } from '../../domain/interfaces/refresh-token-data.interface.js';

describe('GetSessionsUseCase', () => {
  let useCase: GetSessionsUseCase;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  const mockSessions: RefreshTokenData[] = [
    {
      tokenHash: 'hash1',
      tokenFamily: 'fam1',
      userId: 1,
      deviceId: 'device-a',
      createdAt: 1000,
    },
    {
      tokenHash: 'hash2',
      tokenFamily: 'fam2',
      userId: 1,
      deviceId: 'device-b',
      createdAt: 2000,
    },
    {
      tokenHash: 'hash3',
      tokenFamily: 'fam3',
      userId: 1,
      deviceId: 'device-c',
      createdAt: 3000,
    },
  ];

  beforeEach(() => {
    refreshTokenRepository = {
      save: jest.fn(),
      findByUserDevice: jest.fn(),
      findAllByUser: jest.fn(),
      deleteByUserDevice: jest.fn(),
      deleteAllByUser: jest.fn(),
    };

    useCase = new GetSessionsUseCase(refreshTokenRepository);
  });

  it('should return sessions sorted by createdAt descending', async () => {
    refreshTokenRepository.findAllByUser.mockResolvedValue(mockSessions);

    const result = await useCase.execute(1, 'device-b');

    expect(result).toHaveLength(3);
    expect(result[0].deviceId).toBe('device-c');
    expect(result[1].deviceId).toBe('device-b');
    expect(result[2].deviceId).toBe('device-a');
  });

  it('should mark current device with isCurrent = true', async () => {
    refreshTokenRepository.findAllByUser.mockResolvedValue(mockSessions);

    const result = await useCase.execute(1, 'device-b');

    const current = result.find((s) => s.deviceId === 'device-b');
    const other = result.find((s) => s.deviceId === 'device-a');

    expect(current?.isCurrent).toBe(true);
    expect(other?.isCurrent).toBe(false);
  });

  it('should return empty array if no sessions', async () => {
    refreshTokenRepository.findAllByUser.mockResolvedValue([]);

    const result = await useCase.execute(1, 'device-x');

    expect(result).toEqual([]);
  });
});
