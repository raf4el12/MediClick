/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ServiceUnavailableException } from '@nestjs/common';
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

  it('persiste notificación IN_APP en base de datos una sola vez con tipo y sede', async () => {
    const result = await useCase.execute({
      userId: 10,
      type: 'APPOINTMENT_REMINDER',
      title: 'Aviso',
      message: 'Notificación del sistema',
      channel: 'IN_APP',
      clinicId: 7,
    });

    expect(result.id).toBe(1);
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        type: 'APPOINTMENT_REMINDER',
        channel: 'IN_APP',
        clinicId: 7,
      }),
    );
  });

  it('RED->GREEN: persiste exactamente una vez con metadatos de fallback si WHATSAPP cayó a SMS', async () => {
    dispatcher.dispatch.mockResolvedValue({
      channel: 'SMS',
      delivered: true,
      messageId: 'sms-1',
      fallbackUsed: true,
    });

    await useCase.execute({
      userId: 10,
      type: 'APPOINTMENT_REMINDER',
      title: 'Recordatorio',
      message: 'Cita en 2 horas',
      channel: 'WHATSAPP',
      recipientPhone: '+51999888777',
      whatsAppTemplateName: 'appointment_reminder',
      whatsAppTemplateLanguage: 'es_PE',
      whatsAppBodyParameters: ['Carlos', '10:00'],
      metadata: { appointmentId: 45 },
    });

    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsAppContent: {
          kind: 'TEMPLATE',
          name: 'appointment_reminder',
          languageCode: 'es_PE',
          bodyParameters: ['Carlos', '10:00'],
        },
      }),
    );
    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'APPOINTMENT_REMINDER',
        channel: 'SMS',
        metadata: expect.objectContaining({
          appointmentId: 45,
          messageId: 'sms-1',
          fallbackFrom: 'WHATSAPP',
        }),
      }),
    );
  });

  it('RED->GREEN: rechaza con BadRequestException si WHATSAPP no especifica plantilla ni sesión libre', async () => {
    await expect(
      useCase.execute({
        userId: 10,
        type: 'APPOINTMENT_REMINDER',
        title: 'Recordatorio',
        message: 'Cita en 2 horas',
        channel: 'WHATSAPP',
        recipientPhone: '+51999888777',
      }),
    ).rejects.toThrow('plantilla aprobada');

    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  it('RED->GREEN: no persiste nada y lanza ServiceUnavailableException si el despacho externo falla', async () => {
    dispatcher.dispatch.mockResolvedValue({
      channel: 'WHATSAPP',
      delivered: false,
      error: 'Provider down',
    });

    await expect(
      useCase.execute({
        userId: 10,
        type: 'APPOINTMENT_REMINDER',
        title: 'Recordatorio',
        message: 'Cita en 2 horas',
        channel: 'WHATSAPP',
        recipientPhone: '+51999888777',
        whatsAppSessionText: true,
      }),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});
