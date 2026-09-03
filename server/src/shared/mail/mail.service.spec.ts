import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service.js';
import { TemplateService } from './template.service.js';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let mockTransporter: {
    sendMail: jest.Mock;
    verify: jest.Mock;
  };
  let templateService: TemplateService;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: '<msg-123>' }),
      verify: jest.fn().mockResolvedValue(true),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const configService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) => {
          if (key === 'MAIL_FROM') return 'test@mediclick.com';
          return defaultValue;
        }),
    } as unknown as ConfigService;

    templateService = {
      compile: jest.fn().mockReturnValue('<html>rendered</html>'),
    } as unknown as TemplateService;

    service = new MailService(configService, templateService);
  });

  it('envia email pasando messageId opcional al transporter y retorna true', async () => {
    const result = await service.send({
      to: 'paciente@test.com',
      subject: 'Recordatorio',
      template: 'appointment-reminder',
      context: { name: 'Juan' },
      messageId: '<custom-id@mediclick>',
    });

    expect(result).toBe(true);
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'paciente@test.com',
        subject: 'Recordatorio',
        html: '<html>rendered</html>',
        messageId: '<custom-id@mediclick>',
      }),
    );
  });

  it('retorna false y captura el error sin lanzar excepcion cuando el transporter falla', async () => {
    mockTransporter.sendMail.mockRejectedValue(
      new Error('SMTP connection timed out'),
    );

    const result = await service.send({
      to: 'paciente@test.com',
      subject: 'Falla',
      template: 'test',
      context: {},
    });

    expect(result).toBe(false);
  });
});
