import { NotificationDispatcherService } from './notification-dispatcher.service.js';
import type { INotificationRepository } from '../../domain/repositories/notification.repository.js';
import type { MailService } from '../../../../shared/mail/mail.service.js';

describe('NotificationDispatcherService (Enrutador Multicanal Inteligente)', () => {
  let dispatcher: NotificationDispatcherService;
  let notificationRepository: { create: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let whatsAppService: { sendWhatsApp: jest.Mock };
  let mailService: { send: jest.Mock };

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

    smsService = {
      sendSms: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'sms_123' }),
    };

    whatsAppService = {
      sendWhatsApp: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'wpp_123' }),
    };

    mailService = {
      send: jest.fn().mockResolvedValue(true),
    };

    dispatcher = new NotificationDispatcherService(
      notificationRepository as unknown as INotificationRepository,
      smsService,
      whatsAppService,
      mailService as unknown as MailService,
    );
  });

  it('RED->GREEN: despacha por IN_APP creando el registro en base de datos', async () => {
    const result = await dispatcher.dispatch({
      userId: 10,
      channel: 'IN_APP',
      title: 'Recordatorio',
      message: 'Cita médica mañana',
    });

    expect(result.delivered).toBe(true);
    expect(result.channel).toBe('IN_APP');
    expect(notificationRepository.create).toHaveBeenCalled();
  });

  it('RED->GREEN: despacha por WHATSAPP exitosamente', async () => {
    const result = await dispatcher.dispatch({
      userId: 10,
      recipientPhone: '+51999888777',
      channel: 'WHATSAPP',
      title: 'Recordatorio',
      message: 'Tu cita con el Dr. es mañana a las 10:00',
    });

    expect(result.delivered).toBe(true);
    expect(result.channel).toBe('WHATSAPP');
    expect(result.messageId).toBe('wpp_123');
    expect(whatsAppService.sendWhatsApp).toHaveBeenCalledWith(
      '+51999888777',
      'Tu cita con el Dr. es mañana a las 10:00',
    );
  });

  it('RED->GREEN: hace fallback automático a SMS si WHATSAPP falla y fallback está habilitado', async () => {
    whatsAppService.sendWhatsApp.mockResolvedValueOnce({
      success: false,
      error: 'User not on WhatsApp',
    });

    const result = await dispatcher.dispatch({
      userId: 10,
      recipientPhone: '+51999888777',
      channel: 'WHATSAPP',
      title: 'Recordatorio',
      message: 'Tu cita con el Dr. es mañana a las 10:00',
      enableFallbackToSms: true,
    });

    expect(result.delivered).toBe(true);
    expect(result.channel).toBe('SMS');
    expect(result.fallbackUsed).toBe(true);
    expect(smsService.sendSms).toHaveBeenCalledWith(
      '+51999888777',
      'Tu cita con el Dr. es mañana a las 10:00',
    );
  });

  it('RED->GREEN: despacha por SMS directamente cuando el canal solicitado es SMS', async () => {
    const result = await dispatcher.dispatch({
      userId: 10,
      recipientPhone: '+51999888777',
      channel: 'SMS',
      title: 'Código de confirmación',
      message: 'Tu código es 123456',
    });

    expect(result.delivered).toBe(true);
    expect(result.channel).toBe('SMS');
    expect(smsService.sendSms).toHaveBeenCalledWith(
      '+51999888777',
      'Tu código es 123456',
    );
  });
});
