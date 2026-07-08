# Módulos del Core de Negocio - MediClick

Este documento describe la arquitectura, la estructura del código, las buenas prácticas y la estrategia de pruebas unitarias implementadas en los módulos principales del backend de MediClick.

## 1. Módulos Principales (Core Modules)

Los módulos del core representan el dominio de la aplicación de gestión médica y residen en la ruta `server/src/modules/`. Algunos de los más importantes son:

- **Appointments (Citas)**: Orquestación y gestión del ciclo de vida de las citas médicas (creación, cancelación, check-in, reprogramación, overbooking, etc.).
- **Patients (Pacientes)**: Gestión de información personal, expedientes y registros de los pacientes.
- **Doctors (Doctores)**: Gestión de la información de los profesionales médicos, perfiles y especialidades (`specialties`).
- **Clinics (Clínicas)**: Administración de las sucursales o establecimientos médicos.
- **Schedules & Availability (Horarios y Disponibilidad)**: Lógica para manejar bloques de horarios (`schedule-blocks`), agendas y disponibilidad de los doctores.
- **Clinical Records**: Incluye módulos como historial médico (`medical-history`), notas clínicas (`clinical-notes`) y recetas médicas (`prescriptions`).
- **Payments**: Integración y procesamiento del pago de consultas.

---

## 2. Arquitectura de los Módulos

El proyecto sigue los principios de **Arquitectura Hexagonal (Puertos y Adaptadores)** y **Domain-Driven Design (DDD)** estructurado dentro del framework NestJS.

Cada módulo suele dividirse en las siguientes capas de separación de responsabilidades:

* **`domain/` (Capa de Dominio)**: 
  Contiene la lógica de negocio pura y es totalmente independiente de frameworks externos o de infraestructura.
  * `entities/`: Modelos y agregados del dominio (ej. `appointment.entity.ts`).
  * `interfaces/`: Puertos (interfaces) requeridos por el dominio, como contratos que deben cumplir los repositorios de bases de datos.
  * `constants/`: Constantes y enumeradores propios del negocio.

* **`application/` (Capa de Aplicación)**: 
  Contiene los flujos de orquestación (casos de uso) del negocio.
  * `use-cases/`: Archivos dedicados a un único caso de uso del sistema (ej. `create-appointment.use-case.ts`). 
  * `dto/`: Objetos de Transferencia de Datos (Data Transfer Objects) para las entradas y salidas de la aplicación.
  * `services/` & `listeners/`: Servicios de aplicación para operaciones compartidas y manejadores de eventos.

* **`infrastructure/` (Capa de Infraestructura)**: 
  Contiene los detalles técnicos (los adaptadores externos).
  * `persistence/`: Implementación concreta de los repositorios de dominio, interactuando con la base de datos generalmente usando Prisma ORM.

* **`interfaces/` (Capa de Presentación/Delivery)**: 
  Contiene los puntos de entrada para la interacción con los clientes del API.
  * `controllers/`: Controladores HTTP REST o Resolvers GraphQL.

---

## 3. Código y Buenas Prácticas

- **Single Responsibility Principle (SRP)**: Cada caso de uso (Use Case) está separado en su propio archivo. Esto mejora la legibilidad y mantenibilidad del código (por ejemplo, `cancel-appointment.use-case.ts` hace exclusivamente la cancelación de una cita).
- **Inversión de Dependencias**: Los casos de uso nunca interactúan directamente con Prisma o un motor de base de datos específico. Interactúan únicamente con las interfaces de repositorios definidas en la capa de `domain`.
- **Inyección de Dependencias**: Se aprovecha el contenedor IoC (Inversion of Control) de NestJS. Los casos de uso y repositorios se registran en los módulos (`.module.ts`) y se inyectan a través del constructor.
- **Validación Fuerte**: Se hace uso extensivo de clases DTO con validadores y tipado estricto (TypeScript) para asegurar que la información que llega a la capa de aplicación sea correcta.
- **Nombres Descriptivos y Estándares**: Los archivos usan el patrón `[nombre].[tipo].ts` (ej. `appointment.entity.ts`, `create-appointment.use-case.ts`), facilitando la navegación en el proyecto.

---

## 4. Pruebas Unitarias (Unit Tests)

La estrategia de pruebas unitarias de MediClick está orientada a verificar exhaustivamente la capa de negocio.

- **Co-localización de Tests**: Las pruebas unitarias acompañan a la implementación. Los archivos de prueba (`.spec.ts`) residen en la misma carpeta que el archivo que prueban. Por ejemplo: `create-patient-appointment.use-case.spec.ts` se ubica junto a su caso de uso correspondiente en `application/use-cases/`.
- **Enfoque en los Casos de Uso**: La capa de `application` es donde reside el comportamiento de la aplicación; por lo tanto, es la parte con más densidad de pruebas unitarias.
- **Uso de Mocks y Stubs**: Para garantizar que las pruebas sean **verdaderas pruebas unitarias** y se ejecuten rápido, todas las dependencias externas y bases de datos son emuladas usando Mocks. Los casos de uso se prueban pasando implementaciones en memoria o funciones simuladas (stubs) de los repositorios de dominio.
- **Framework**: Se utiliza **Jest** como runner de pruebas y librería de *assertions*, el cual es el estándar proveído por NestJS. Las pruebas se pueden correr con comandos como `pnpm run test`.
