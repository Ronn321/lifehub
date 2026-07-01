import { SignJWT, jwtVerify, importPKCS8, importSPKI, type KeyLike } from 'jose';
import { createHash, randomBytes } from 'node:crypto';

export interface JwtPayload {
  sub: string;          // userId
  email: string;
  roles: string[];      // ['admin', 'family', ...]
  iat?: number;
  exp?: number;
  jti?: string;
}

const ALG = 'RS256';
const ACCESS_TTL = '15m';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

async function getPrivateKey(): Promise<KeyLike> {
  const b64 = process.env.JWT_PRIVATE_KEY_BASE64;
  if (!b64) throw new Error('JWT_PRIVATE_KEY_BASE64 not set');
  const pem = Buffer.from(b64, 'base64').toString('utf8');
  return (await importPKCS8(pem, ALG)) as KeyLike;
}

async function getPublicKey(): Promise<KeyLike> {
  const b64 = process.env.JWT_PUBLIC_KEY_BASE64;
  if (!b64) throw new Error('JWT_PUBLIC_KEY_BASE64 not set');
  const pem = Buffer.from(b64, 'base64').toString('utf8');
  return (await importSPKI(pem, ALG)) as KeyLike;
}

// ../../shared/auth/src/jwt.ts(38,11): signAccessToken uses await getPrivateKey
export async function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>): Promise<string> {
  const jti = randomBytes(16).toString('hex');
  const key = await getPrivateKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG, typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .setJti(jti)
    .sign(key);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, { algorithms: [ALG] });
  return payload as unknown as JwtPayload;
}

export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const REFRESH_TTL = REFRESH_TTL_SECONDS;
