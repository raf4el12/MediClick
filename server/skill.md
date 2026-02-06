AQUITECTURA DDD a seguir:


src/modules/{module_name}/
├── application/           # Capa de Aplicación
│   ├── {module}.module.ts
│   ├── dto/
│   │   └── *.dto.ts
│   └── use-cases/
│       └── *.use-case.ts
├── domain/                # Capa de Dominio
│   ├── entities/
│   │   └── *.entity.ts
│   ├── repositories/
│   │   └── *.repository.ts  (Interface)
│   ├── services/
│   │   └── *.service.ts     (Domain Services)
│   └── enums/
│       └── *.enum.ts
├── infrastructure/        # Capa de Infraestructura
│   └── persistence/
│       └── prisma-*.repository.ts
└── interfaces/            # Capa de Interfaces
    └── controllers/
        └── *.controller.ts



Los modulos compartidos van en src/shared 
src/shared/
├── auth/
├── guards/
├── decorators/
├── constants/
├── exceptions/
└── utils/





Crear RolesGuard
src/shared/guards/roles.guard.ts

Implementar un guard que:

Lea los roles requeridos del decorador @Roles()
Extraiga el user.role del JWT (disponible en request.user después de JwtAuthGuard)
Permita acceso si el usuario tiene uno de los roles requeridos
Lance ForbiddenException si no tiene permisos
1.4 Crear Decorador Combinado
src/shared/decorators/auth.decorator.ts

Crear un decorador combinado que aplique:

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...roles)


Estructura del modulo AUTH

src/modules/auth/
├── application/
│   ├── auth.module.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   ├── register-staff.dto.ts
│   │   └── auth-response.dto.ts
│   └── use-cases/
│       ├── login.use-case.ts
│       ├── refresh-token.use-case.ts
│       └── logout.use-case.ts
├── domain/
│   ├── entities/
│   │   └── auth-tokens.entity.ts
│   ├── services/
│   │   ├── password.service.ts
│   │   └── token.service.ts
│   └── interfaces/
│       └── jwt-payload.interface.ts
├── infrastructure/
│   └── strategies/
│       └── jwt.strategy.ts
└── interfaces/
    └── controllers/
        └── auth.controller.ts


El JWT Strategy debe:

Extraer el token de cookies (accessToken) O del header Authorization: Bearer <token>
Validar y decodificar el payload
Retornar el usuario con su rol para que esté disponible en request.user

1.9 Login Use Case
src/modules/auth/application/use-cases/login.use-case.ts

Implementar:

Buscar usuario por email
Verificar que el usuario esté ACTIVO
Verificar contraseña con bcrypt
Generar par de tokens (access + refresh)
Guardar refresh token en BD
Retornar tokens + datos básicos del usuario


Criterios de Aceptación
Auth Module ✅
 Login funciona correctamente para usuarios STAFF
 JWT incluye el rol del usuario en el payload
 Refresh token se guarda en BD
 Logout invalida el refresh token
Guards y Decoradores ✅
 @Roles() decorador funciona correctamente
 RolesGuard valida roles del JWT
 @Auth() combina JwtAuthGuard + RolesGuard
 @CurrentUser() extrae el usuario del request
Endpoint POST /users/internal ✅
 Solo accesible por ADMIN
 Valida que el ADMIN pueda crear el rol solicitado
 No permite crear PATIENTS por este endpoint
 Crea User + Profile en transacción
 Retorna usuario sin contraseña
 Maneja duplicados de email y DNI
Seguridad ✅
 Contraseñas hasheadas con bcrypt
 Tokens con expiración correcta
 Roles validados en cada request protegido


 Notas Importantes
Inyección de Dependencias: Usa @Inject('UserRepository') para inyectar la interfaz del repositorio
Decoradores en orden: @Auth() debe aplicar primero 
JwtAuthGuard
 y luego RolesGuard
Transacciones Prisma: Usa $transaction con callback para operaciones multi-tabla
Swagger: Documenta todos los endpoints con @ApiTags, @ApiOperation, @ApiResponse
Validación: Usa class-validator en todos los DTOs