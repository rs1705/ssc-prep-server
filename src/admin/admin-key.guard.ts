import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

export const ADMIN_KEY_HEADER = 'x-admin-key';

/**
 * Admin routes (paper ingestion) need the ADMIN_KEY secret in the
 * `x-admin-key` header. With no ADMIN_KEY configured the routes are closed.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_KEY;
    if (!expected) throw new ForbiddenException('Admin routes are disabled.');

    const request = context.switchToHttp().getRequest();
    const given = request.headers[ADMIN_KEY_HEADER];
    if (typeof given !== 'string' || !sameSecret(given, expected)) {
      throw new UnauthorizedException('Missing or wrong admin key.');
    }
    return true;
  }
}

/** Constant-time comparison so the key can't be guessed from response timing. */
function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
