import * as crypto from 'crypto';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import configuration from '../config/configuration';

/**
 * Exige o header 'x-sync-key' igual ao ADMIN_SYNC_KEY do servidor.
 * Comparação de tempo constante (timing-safe) para evitar timing attacks.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = String(request.headers['x-sync-key'] ?? '');
    const expected = configuration().adminSyncKey;
    if (!provided || !safeCompare(provided, expected)) {
      throw new UnauthorizedException('Chave de sincronização inválida.');
    }
    return true;
  }
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // compara igualmente para manter o timing estável
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
