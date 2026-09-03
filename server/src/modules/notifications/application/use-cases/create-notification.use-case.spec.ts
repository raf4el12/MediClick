import { CreateNotificationUseCase } from './create-notification.use-case.js';
import type { INotificationRepository } from '../../domain/repositories/notification.repository.js';
import type { NotificationDispatcherService } from '../services/notification-dispatcher.service.js';

describe('CreateNotificationUseCase (Multicanal)', () => {
  let useCase: CreateNotificationUseCase;
  let notificationRepository: jest.Mocked<
    Pick<INotificationRepository, 'create'>
  >;
  let dispatcher: jest.Mocked<Pick<NotificationDispatcherService, 'dispatch'>>;

  beforeEach(() => {
    notificationRepository = {
      create: jest.fn().mockResolvedValue({
        id: 1,
        userId: 10,
        type: 'APPOINTMENT_REMINDER',
        channel: 'IN_APP',
        title: 'Recordatorio',
        message: 'Tu cita es mañana',
        isRead: false,
        metadata: null,
        sentAt: new Date(),
        deleted: false,
        createdAt: new Date(),
      }),
    };

    dispatcher = {
      dispatch: jest.fn().mockResolvedValue({
        channel: 'WHATSAPP',
        delivered: true,
        messageId: 'wpp_123',
      }),
    };

    useCase = new CreateNotificationUseCase(
      notificationRepository as unknown as INotificationRepository,
      dispatcher as unknown as NotificationDispatcherService,
    );
  });

  it('RED->GREEN: persiste notificación IN_APP en base de datos', async () => {
    const result = await useCase.execute({
      userId: 10,
      type: 'GENERAL',
      title: 'Aviso',
      message: 'Notificación del sistema',
      channel: 'IN_APP',
    });

    expect(result.id).toBe(1);
    expect(notificationRepository.create).toHaveBeenCalled();
  });

  it('RED->GREEN: despacha mediante NotificationDispatcherService cuando el canal es externo (WHATSAPP o SMS)', async () => {
    const result = await useCase.execute({
      userId: 10,
      type: 'APPOINTMENT_REMINDER',
      title: 'Recordatorio',
      message: 'Cita en 2 horas',
      channel: 'WHATSAPP',
      recipientPhone: '+51999888777',
    });

    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'WHATSAPP',
        recipientPhone: '+51999888777',
      }),
    );
    expect(result).toBeDefined();
  });
});
