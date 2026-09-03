import { NotificationDispatcherService } from './notification-dispatcher.service.js';
import type { MailService } from '../../../../shared/mail/mail.service.js';

describe('NotificationDispatcherService (Enrutador Multicanal Inteligente)', () => {
  let dispatcher: NotificationDispatcherService;
  let smsService: { sendSms: jest.Mock };
  let whatsAppService: { sendWhatsApp: jest.Mock };
  let mailService: { send: jest.Mock };

  beforeEach(() => {
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
      smsService,
      whatsAppService,
      mailService as unknown as MailService,
    );
  });

  it('RED->GREEN: despacha por IN_APP retornando resultado lógico sin I/O ni persistencia', async () => {
    const result = await dispatcher.dispatch({
      userId: 10,
      channel: 'IN_APP',
      title: 'Recordatorio',
      message: 'Cita médica mañana',
    });

    expect(result.delivered).toBe(true);
    expect(result.channel).toBe('IN_APP');
  });

  it('RED->GREEN: despacha por WHATSAPP exitosamente sin persistir', async () => {
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
    expect(result.messageId).toBe('sms_123');
  });

  it('RED->GREEN: no hace fallback si está deshabilitado', async () => {
    whatsAppService.sendWhatsApp.mockResolvedValueOnce({
      success: false,
      error: 'Rate limit exceeded',
    });

    const result = await dispatcher.dispatch({
      userId: 10,
      recipientPhone: '+51999888777',
      channel: 'WHATSAPP',
      title: 'Recordatorio',
      message: 'Tu cita con el Dr. es mañana a las 10:00',
      enableFallbackToSms: false,
    });

    expect(result.delivered).toBe(false);
    expect(result.channel).toBe('WHATSAPP');
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });

  it('RED->GREEN: despacha por EMAIL y refleja si el correo fue enviado', async () => {
    const result = await dispatcher.dispatch({
      userId: 10,
      recipientEmail: 'paciente@test.com',
      channel: 'EMAIL',
      title: 'Confirmación de Cita',
      message: 'Detalle de la cita',
    });

    expect(result.delivered).toBe(true);
    expect(result.channel).toBe('EMAIL');
    expect(mailService.send).toHaveBeenCalled();
  });

  it('RED->GREEN: reporta delivered: false si mailService falla', async () => {
    mailService.send.mockResolvedValueOnce(false);

    const result = await dispatcher.dispatch({
      userId: 10,
      recipientEmail: 'paciente@test.com',
      channel: 'EMAIL',
      title: 'Confirmación de Cita',
      message: 'Detalle de la cita',
    });

    expect(result.delivered).toBe(false);
    expect(result.channel).toBe('EMAIL');
  });
});
