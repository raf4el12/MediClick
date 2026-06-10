---
name: frontend-patterns
description: Use when creating or modifying frontend code in client/src/. Covers Next.js App Router by role, MUI v5 patterns, @core components, Redux Toolkit slices, React Query hooks, Zod validation, and axios setup.
---

# Frontend patterns

## Route structure (App Router)

```
client/src/app/
├── patient/       ← patient-facing pages
├── doctor/        ← doctor dashboard
├── admin/         ← admin / clinic management
├── login/
├── Register/
└── layout.tsx
```

Each route has its own `layout.tsx` wrapping the role-specific layout from `@layouts/`.

## Core components

Located in `client/src/@core/components/`:

- `PageHeader` — page title + breadcrumbs + actions
- `SuccessSnackbar` — toast for success feedback
- Custom MUI theme in `@core/theme/`
- Layouts: `BlankLayout`, `VerticalLayout` from `@layouts/`

## API calls

Use React Query (`@tanstack/react-query`) with the axios instance:

```typescript
import { api } from '@/libs/axios';
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['appointments', filters],
  queryFn: () => api.get('/appointments', { params: filters }).then(r => r.data),
});
```

The axios instance at `@/libs/axios.ts` handles:
- Token refresh on 401 (with request queuing)
- Redirect to `/login` on refresh failure
- `baseURL` from `NEXT_PUBLIC_API_URL`

## State management

- **Server state:** React Query — caching, refetching, optimistic updates
- **Client state:** Redux Toolkit — only for global UI state (auth, sidebar, notifications)
- **Persistence:** `redux-persist` for auth slice via localStorage key `persist:auth`
- Redux slices in `redux-store/`

## Form patterns

- React Hook Form + Zod for validation
- Zod schemas defined co-located with the form component
- MUI form components wrapped with RHF `Controller`

## Icons

Remix icon set with `ri-` prefix:
- `ri-calendar-line` — appointments
- `ri-user-line` — patients
- `ri-time-line` — schedules
- `ri-check-line` — confirmation
- `ri-close-line` — cancellation

## Folder naming

Views mirror backend module names:
- `views/appointments/` ↔ `server/modules/appointments/`
- `views/waitlist/` ↔ `server/modules/waitlist/`
- `views/holidays/` ↔ `server/modules/holidays/`
