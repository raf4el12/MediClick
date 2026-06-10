---
name: graphql-citas
description: Use when working with the GraphQL layer for appointments and patient records in server/src/modules/patient-records-graphql/. Covers ObjectType definitions, resolver-to-use-case wiring, and the relationship between GraphQL and the REST backend.
---

# GraphQL de Citas

## Module location

The GraphQL layer lives in a dedicated module at `server/src/modules/patient-records-graphql/`, separate from the REST-based business logic modules. This keeps GraphQL as a thin presentation layer.

## Architecture

```
patient-records-graphql/
└── interfaces/
    └── types/
        └── patient-record.type.ts   ← @ObjectType() definitions
```

Resolvers are defined in the same module using NestJS GraphQL.

## ObjectType naming

- Suffix with `Gql`: `AppointmentGql`, `PatientRecordGql`, `ProfileGql`
- Fields use `@Field()` decorator with explicit types

```typescript
@ObjectType()
export class AppointmentGql {
  @Field(() => Int)
  id: number;

  @Field()
  startTime: Date;

  @Field()
  status: string;

  @Field(() => AppointmentScheduleGql, { nullable: true })
  schedule?: AppointmentScheduleGql;
}
```

## Connecting to business logic

GraphQL resolvers call the same use-cases from the REST modules. They do NOT duplicate business logic. Inject use-cases into resolver constructors:

```typescript
@Resolver(() => PatientRecordGql)
export class PatientRecordResolver {
  constructor(
    private readonly getMyAppointmentsUseCase: GetMyAppointmentsUseCase,
  ) {}
}
```

## Mutations always return full object

Every GraphQL mutation returns the complete updated object, never just a status or ID.

## Queries available

- `patientRecord` / `myPatientRecord` — patient profile + appointments + clinical data
- Appointments embedded as nested `@Field(() => [AppointmentGql])` on `PatientRecordGql`

## Key difference from REST

| Aspect | REST (appointments module) | GraphQL (patient-records-graphql) |
|--------|---------------------------|-----------------------------------|
| Use case | Create, update, cancel | Read patient records + appointments |
| Auth | `@Auth()` + permissions | Same pattern |
| Output | DTOs | `@ObjectType()` classes |
| Client | `@/libs/axios` | `@/libs/graphql` (Apollo) |
