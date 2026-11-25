import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { AuthUser } from '@/types';

export const COOKIE_NAME = 'nirmal_session';
export const JWT_ISSUER = 'nirmal-calculus';
export const JWT_AUDIENCE = 'nirmal-users';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'JWT_SECRET environment variable must be set to a strong secret (16+ chars).'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(user: AuthUser): Promise<string> {
  const jti = crypto.randomUUID();
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const id = typeof payload.sub === 'string' ? payload.sub : payload.id;
    if (
      typeof id === 'string' &&
      typeof payload.name === 'string' &&
      typeof payload.email === 'string'
    ) {
      return {
        id,
        name: payload.name,
        email: payload.email,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getUser(req?: Request): Promise<AuthUser | null> {
  // 1. Check Authorization: Bearer <token> header if Request is provided
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken) {
        return verifyToken(bearerToken);
      }
    }
  }

  // 2. Fallback to HTTP-only session cookie
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  return verifyToken(token);
}
