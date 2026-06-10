---
name: testing-conventions
description: Use when writing or running Jest tests for server modules. Covers file naming, test structure, mock patterns for repositories, and test data factories.
---

# Testing conventions

## Test runner

Jest configured at the server level. Run tests:
```bash
cd server
pnpm test              # all tests
pnpm test -- --watch   # watch mode
pnpm test <pattern>    # specific file/pattern
```

## File naming

Test files are co-located with the source file using `.spec.ts` suffix:

```
application/use-cases/
├── cancel-appointment.use-case.ts
├── cancel-appointment.use-case.spec.ts
├── create-patient-appointment.use-case.ts
├── create-patient-appointment.use-case.spec.ts
```

## Test structure

Use `describe` / `it` blocks:

```typescript
describe('CancelAppointmentUseCase', () => {
  describe('execute', () => {
    it('should cancel a PENDING appointment', async () => { ... });
    it('should throw NotFoundException when appointment does not exist', async () => { ... });
    it('should not allow cancelling a COMPLETED appointment', async () => { ... });
  });
});
```

## Repository mocking

Use manual mocks — inject via the module testing utilities or instantiate the use-case directly:

```typescript
const mockRepo = {
  findById: jest.fn(),
  update: jest.fn(),
};

const useCase = new CancelAppointmentUseCase(
  mockRepo as any,
  mockSpecialtyRepo as any,
  mockTransactionRepo as any,
  mockTimezoneResolver as any,
  mockEventEmitter as any,
);
```

## What to test

- **Happy path:** successful creation, update, state transition
- **Validations:** invalid inputs, missing entities, past dates
- **Business rules:** timezone constraints, cancellation windows, overbook limits
- **Edge cases:** clinic scope boundary, super-admin bypass, soft-deleted records

## What NOT to test

- Prisma query details (test the repository interface contract, not SQL)
- Internal helper methods (test via the public `execute()`)
- Third-party integrations (mock them)
