# 🏥 MediClick

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Redux](https://img.shields.io/badge/Redux-593D88?style=for-the-badge&logo=redux&logoColor=white)

MediClick es un **Sistema de Gestión de Citas Médicas** de nivel empresarial (*Enterprise-grade*) diseñado con una arquitectura robusta, multi-inquilino (multi-tenant) y con control de acceso basado en roles (RBAC).

Este proyecto no es un CRUD tradicional; está construido aplicando buenas prácticas de Ingeniería de Software como **Domain-Driven Design (DDD)**, manejo universal de zonas horarias y gestión avanzada de estado en el cliente.

> 🌐 **Live Demo:** [Enlace a tu Demo aquí] | 📖 **Documentación API:** `/api/docs` (Swagger)

---

## ✨ Características Principales (Retos Técnicos Resueltos)

### 🏢 Arquitectura Multi-Tenant (Multi-inquilino)
El sistema soporta múltiples clínicas operando de forma aislada en la misma base de datos.
- Los Doctores y Recepcionistas están vinculados a un `clinicId` específico.
- Los Pacientes son entidades *cross-tenant*, permitiéndoles interactuar con múltiples sedes sin duplicar cuentas.
- Protegido a nivel de API mediante un `TenantGuard` personalizado en la cadena de seguridad de NestJS.

### 🏗️ Domain-Driven Design (DDD) en el Servidor
El backend (NestJS 11) no usa un diseño acoplado. Está dividido en 17 módulos independientes que siguen estrictamente 4 capas:
1. **Application:** DTOs y Casos de Uso (`execute()`).
2. **Domain:** Entidades puras, Interfaces de Repositorios, Servicios de Dominio.
3. **Infrastructure:** Implementación concreta de Repositorios (Prisma).
4. **Interfaces:** Controladores HTTP.

### 🌍 Manejo Universal de Fechas y Zonas Horarias
Trabajar con citas médicas requiere precisión absoluta de tiempo real (*wall-clock time*), independientemente de dónde se encuentre el servidor o el usuario.
- **Almacenamiento (PostgreSQL):** Las fechas se guardan a medianoche UTC y las horas se guardan relativas al "Epoch" (1970-01-01 UTC).
- **Transporte API:** Formatos deterministas HTTP (`HH:mm` y `YYYY-MM-DD`).
- **Lógica de Dominio:** La API de `Intl.DateTimeFormat` se usa en cliente y servidor para calcular zonas horarias dinámicamente según la Sede de la Clínica (`Clinic.timezone`, ej. `America/Lima`). ¡Nunca se usa `new Date()` desnudo!

### 🔐 Seguridad y Escalabilidad
- **Autenticación en 2 capas:** Access Tokens vía cookies/headers protegidos por Guards (JWT + Roles + Tenant).
- **Rotación de Sesiones:** Refresh Tokens manejados a través de **Redis**, rastreando los Device IDs para invalidación segura.
- **Rate Limiting:** Estrategia de moderación de peticiones (Throttler) en tres niveles (short, medium, long) para evadir ataques DDoS y fuerza bruta.

### 🚀 Frontend Optimizado
- Desarrollado en **Next.js 16 (App Router)** y **React 19**.
- Manejo de estado híbrido avanzado: **Redux Toolkit** (con persistencia para Auth y UI) + **TanStack React Query** (para caché de datos asíncronos y dropdowns relacionales complejos).
- Formularios altamente tipados con **React Hook Form + Zod**.

---

## 💻 Tech Stack

| Capa | Tecnologías |
|------|-------------|
| **Backend** | NestJS 11, TypeScript, Express, Swagger, Class-Validator |
| **Frontend** | Next.js 16 (App Router), React 19, Material-UI (MUI 7), Framer Motion |
| **Base de Datos** | PostgreSQL 17, Prisma 7 ORM |
| **Caché & Sesiones** | Redis (ioredis) |
| **Estado Cliente** | Redux Toolkit, Redux Persist, React Query |
| **Testing & Herramientas**| Jest, ESLint, Prettier, pdfmake (Reportes PDF) |

---

## 🚀 Empezar (Desarrollo Local)

### 1. Requisitos Previos
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Docker & Docker Compose](https://www.docker.com/)

### 2. Levantar la Infraestructura
Inicia la base de datos PostgreSQL (puerto 5436) y Redis (puerto 6379):
```bash
cd server
docker compose up -d
```

### 3. Configurar el Backend
```bash
cd server
pnpm install
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run start:dev
```
*El servidor estará corriendo en `http://localhost:5100` y Swagger en `/api/docs`.*

### 4. Configurar el Frontend
Abre otra terminal:
```bash
cd client
pnpm install
pnpm run dev
```
*La aplicación estará disponible en `http://localhost:3000`.*

---

## 📂 Estructura del Repositorio

```text
MediClick/
├── client/                 # Aplicación Next.js (Frontend)
│   ├── src/app/            # App Router (Layouts & Pages)
│   ├── src/views/          # Lógica de vistas y controladores (Hooks)
│   └── src/redux-store/    # Estado global del cliente
└── server/                 # Aplicación NestJS (Backend)
    ├── prisma/             # Esquemas de Base de Datos y Seeders
    └── src/modules/        # Módulos de dominio (Auth, Pacientes, Citas...)
```

---
*Hecho por un desarrollador Full Stack con pasión por la Arquitectura de Software y las buenas prácticas.*
