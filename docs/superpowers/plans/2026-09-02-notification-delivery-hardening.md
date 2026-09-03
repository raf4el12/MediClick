# Notification Delivery Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist one notification per successful dispatch, fail closed when production channel credentials are missing, remove message PII from logs, and support approved WhatsApp templates.

**Architecture:** `NotificationDispatcherService` performs I/O only and returns the actual delivery result. `CreateNotificationUseCase` is the sole persistence owner and records one row with the requested business type plus actual channel/fallback metadata. Channel adapters simulate only outside production; proactive WhatsApp uses a typed template payload.

**Tech Stack:** NestJS 11, Prisma 7, Twilio REST, Meta WhatsApp Cloud API, Nodemailer, Jest 30

**Spec:** `docs/SDD-hardening-integridad-seguridad-operacion.md` section 6.5.2

## Global Constraints

- Never report `delivered=true` in production without a provider success response.
- Never log full phone numbers, email addresses, message bodies, or template parameters.
- Persist exactly one `Notifications` row for one successful external dispatch.
- Failed external delivery must not create an unread user notification pretending delivery occurred.
- Proactive WhatsApp messages require an approved template; free text is allowed only when the caller explicitly identifies an active customer-service session.
- Preserve unrelated worktree changes.

---

### Task 1: Give notification persistence a single owner

**Files:**
- Modify: `server/src/modules/notifications/application/services/notification-dispatcher.service.ts`
- Modify: `server/src/modules/notifications/application/services/notification-dispatcher.service.spec.ts`
- Modify: `server/src/modules/notifications/application/use-cases/create-notification.use-case.ts`
- Modify: `server/src/modules/notifications/application/use-cases/create-notification.use-case.spec.ts`
- Modify: `server/src/modules/notifications/application/notifications.module.ts`

**Interfaces:**
- Preserves: `dispatch(options): Promise<DispatchNotificationResult>`
- Produces: `CreateNotificationUseCase` persists with `result.channel`, `messageId`, and `fallbackUsed`

- [x] **Step 1: Add tests that count repository writes**

```ts
dispatcher.dispatch.mockResolvedValue({
  channel: 'SMS', delivered: true, messageId: 'sms-1', fallbackUsed: true,
});
await useCase.execute(whatsAppDto);
expect(notificationRepository.create).toHaveBeenCalledTimes(1);
expect(notificationRepository.create).toHaveBeenCalledWith(
  expect.objectContaining({
    type: 'APPOINTMENT_REMINDER',
    channel: 'SMS',
    metadata: expect.objectContaining({ messageId: 'sms-1', fallbackFrom: 'WHATSAPP' }),
  }),
);
```

Also assert `dispatcher.dispatch` causes zero repository calls and `delivered=false` causes the use case to throw `ServiceUnavailableException` with zero persisted rows.

- [x] **Step 2: Run notification tests and observe duplicate ownership**

```bash
cd server && pnpm test -- notification-dispatcher.service.spec.ts create-notification.use-case.spec.ts --runInBand
```

- [x] **Step 3: Remove repository persistence from the dispatcher**

Remove `INotificationRepository` from its constructor and delete `persistNotificationLog`. For `IN_APP`, return a successful logical result without I/O; the use case persists it. For email, return `delivered: mailSent` and do not persist when `mailSent` is false.

- [x] **Step 4: Persist exactly once after successful dispatch**

For external channels, call dispatcher and reject `!delivered`. Persist with the actual result channel and merge bounded provider metadata:

```ts
metadata: {
  ...(dto.metadata ?? {}),
  ...(result.messageId && { messageId: result.messageId }),
  ...(result.fallbackUsed && { fallbackFrom: channel }),
},
```

For `IN_APP`, persist directly once. Keep `dto.type` instead of replacing it with `GENERAL`; preserve `clinicId`.

- [x] **Step 5: Run tests and build**

```bash
cd server && pnpm test -- notification-dispatcher.service.spec.ts create-notification.use-case.spec.ts --runInBand
cd server && pnpm build
```

- [x] **Step 6: Commit**

```bash
git add server/src/modules/notifications
git commit -m "fix(notifications): persist each delivery once"
```

### Task 2: Fail closed without production credentials and redact logs

**Files:**
- Modify: `server/src/modules/notifications/infrastructure/channels/sms.service.ts`
- Modify: `server/src/modules/notifications/infrastructure/channels/sms.service.spec.ts`
- Modify: `server/src/modules/notifications/infrastructure/channels/whatsapp.service.ts`
- Modify: `server/src/modules/notifications/infrastructure/channels/whatsapp.service.spec.ts`
- Modify: `server/.env.example`

**Interfaces:**
- Preserves: `ISmsProvider.sendSms` and `IWhatsAppProvider.sendWhatsApp`
- Produces: missing production configuration returns `{ success: false, error: 'PROVIDER_NOT_CONFIGURED' }`

- [ ] **Step 1: Add environment-matrix tests**

```ts
config.get.mockImplementation((key: string) => key === 'NODE_ENV' ? 'production' : undefined);
await expect(service.sendSms('+51999888777', 'secret body')).resolves.toEqual({
  success: false,
  error: 'PROVIDER_NOT_CONFIGURED',
});
```

Repeat for WhatsApp. In `development` and `test`, missing credentials may return simulated success. Spy on `Logger.prototype.log/error/warn` and assert no call string contains the phone or message body.

- [ ] **Step 2: Run channel specs and observe simulated production success**

```bash
cd server && pnpm test -- sms.service.spec.ts whatsapp.service.spec.ts --runInBand
```

- [ ] **Step 3: Gate simulation by environment**

Read `NODE_ENV` through `ConfigService`. If credentials are incomplete and environment is `production`, log only provider/channel plus `PROVIDER_NOT_CONFIGURED`, then return failure. Non-production simulator logs only the generated ID and channel. Provider exceptions and non-2xx responses log status/provider IDs but not recipient or content.

- [ ] **Step 4: Document exact variables**

Add these names to `.env.example`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_REMINDER_TEMPLATE`, and `WHATSAPP_TEMPLATE_LANGUAGE`.

- [ ] **Step 5: Pass channel tests and lint**

```bash
cd server && pnpm test -- sms.service.spec.ts whatsapp.service.spec.ts --runInBand
cd server && pnpm exec eslint src/modules/notifications/infrastructure/channels/sms.service.ts src/modules/notifications/infrastructure/channels/whatsapp.service.ts
```

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/notifications/infrastructure/channels server/.env.example
git commit -m "fix(notifications): fail closed for unconfigured providers"
```

### Task 3: Send proactive WhatsApp notifications with approved templates

**Files:**
- Modify: `server/src/modules/notifications/domain/interfaces/notification-channel.interface.ts`
- Modify: `server/src/modules/notifications/infrastructure/channels/whatsapp.service.ts`
- Modify: `server/src/modules/notifications/infrastructure/channels/whatsapp.service.spec.ts`
- Modify: `server/src/modules/notifications/application/services/notification-dispatcher.service.ts`
- Modify: `server/src/modules/notifications/application/services/notification-dispatcher.service.spec.ts`
- Modify: `server/src/modules/notifications/application/dto/create-notification.dto.ts`

**Interfaces:**
- Produces: `WhatsAppContent = { kind: 'TEMPLATE'; name: string; languageCode: string; bodyParameters: string[] } | { kind: 'SESSION_TEXT'; body: string }`
- Produces: `sendWhatsApp(to: string, content: WhatsAppContent): Promise<SendWhatsAppResult>`

- [ ] **Step 1: Add exact Meta payload tests**

Mock `fetch` and assert proactive content produces:

```ts
expect(JSON.parse(fetchInit.body as string)).toEqual({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: '51999888777',
  type: 'template',
  template: {
    name: 'appointment_reminder',
    language: { code: 'es_PE' },
    components: [{
      type: 'body',
      parameters: [{ type: 'text', text: 'Carlos' }, { type: 'text', text: '10:00' }],
    }],
  },
});
```

Add a separate `SESSION_TEXT` test that preserves the existing text payload. Reject a WhatsApp dispatch lacking either a template or the explicit `SESSION_TEXT` discriminator.

- [ ] **Step 2: Run WhatsApp/dispatcher tests and observe text-only API**

```bash
cd server && pnpm test -- whatsapp.service.spec.ts notification-dispatcher.service.spec.ts --runInBand
```

- [ ] **Step 3: Implement the discriminated content type**

Map `TEMPLATE` to Meta’s `type: 'template'` payload and `SESSION_TEXT` to `type: 'text'`. The dispatcher must accept `whatsAppContent` and pass it unchanged to the provider. For `APPOINTMENT_REMINDER`, callers must supply the configured approved template name/language and ordered non-sensitive template values.

- [ ] **Step 4: Validate DTO input**

Expose explicit optional fields `whatsAppTemplateName`, `whatsAppTemplateLanguage`, and `whatsAppBodyParameters`; require them together when channel is `WHATSAPP` unless `whatsAppSessionText=true`. Do not infer session eligibility from current time.

- [ ] **Step 5: Run focused tests and build**

```bash
cd server && pnpm test -- notifications --runInBand
cd server && pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/notifications
git commit -m "fix(notifications): use WhatsApp templates proactively"
```
