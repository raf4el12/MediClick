// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   ForbiddenException,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { PERMISSIONS_KEY } from './permissions.decorator';

// /**
//  * Guard que verifica si el usuario tiene los permisos requeridos
//  * Los permisos deben estar en el JWT del usuario (request.user.permissions)
//  */
// @Injectable()
// export class PermissionsGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {

//     const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
//       PERMISSIONS_KEY,
//       [context.getHandler(), context.getClass()],
//     );

//     if (!requiredPermissions || requiredPermissions.length === 0) {
//       return true;
//     }

//     const request = context.switchToHttp().getRequest();
//     const user = request.user;

//     if (!user) {
//       throw new ForbiddenException(
//         'No tienes permisos para acceder a este recurso.',
//       );
//     }

//     const isOwner = user.roles?.some((role) =>
//       role.roleName === 'Owner' || role.roleName === 'owner'
//     );

//     if (isOwner) {
//       return true;
//     }

//     if (!user.permissions || user.permissions.length === 0) {
//       throw new ForbiddenException(
//         'No tienes permisos para acceder a este recurso.',
//       );
//     }
//     const hasPermission = requiredPermissions.some((permission) =>
//       user.permissions.includes(permission),
//     );

//     if (!hasPermission) {
//       throw new ForbiddenException(
//         `Necesitas uno de los siguientes permisos: ${requiredPermissions.join(', ')}`,
//       );
//     }

//     return true;
//   }
// }
