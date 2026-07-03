import { SignJWT, jwtVerify, importPKCS8, importSPKI, type KeyLike } from 'jose';
import { createHash, randomBytes, generateKeyPairSync } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

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

const KEYS_DIR = process.env.LIFEHUB_DATA_PATH
  ? join(process.env.LIFEHUB_DATA_PATH, 'keys')
  : join(process.cwd(), 'data', 'keys');

const PRIVATE_KEY_PATH = join(KEYS_DIR, 'jwt_private.pem');
const PUBLIC_KEY_PATH = join(KEYS_DIR, 'jwt_public.pem');

function generateAndPersistKeys(): { privateBase64: string; publicBase64: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

  mkdirSync(KEYS_DIR, { recursive: true });
  writeFileSync(PRIVATE_KEY_PATH, privateKey);
  writeFileSync(PUBLIC_KEY_PATH, publicKey);

  const privateBase64 = Buffer.from(privateKey).toString('base64');
  const publicBase64 = Buffer.from(publicKey).toString('base64');

  console.log(`🔐 JWT Keys generated and saved to ${KEYS_DIR}`);
  return { privateBase64, publicBase64 };
}

function loadExistingKeys(): { privateBase64: string; publicBase64: string } | null {
  if (!existsSync(PRIVATE_KEY_PATH) || !existsSync(PUBLIC_KEY_PATH)) {
    return null;
  }
  try {
    const privatePem = readFileSync(PRIVATE_KEY_PATH, 'utf8');
    const publicPem = readFileSync(PUBLIC_KEY_PATH, 'utf8');
    return {
      privateBase64: Buffer.from(privatePem).toString('base64'),
      publicBase64: Buffer.from(publicPem).toString('base64'),
    };
  } catch {
    return null;
  }
}

function getOrGenerateKeys(): { privateBase64: string; publicBase64: string } {
  // 1. Aus ENV
  const envPrivate = process.env.JWT_PRIVATE_KEY_BASE64;
  const envPublic = process.env.JWT_PUBLIC_KEY_BASE64;
  if (envPrivate && envPublic) {
    return { privateBase64: envPrivate, publicBase64: envPublic };
  }

  // 2. Aus Datei (persistiert)
  const existing = loadExistingKeys();
  if (existing) {
    console.log('🔐 JWT Keys loaded from file');
    return existing;
  }

  // 3. Auto-generieren
  return generateAndPersistKeys();
}

async function getPrivateKey(): Promise<KeyLike> {
  const keys = getOrGenerateKeys();
  const pem = Buffer.from(keys.privateBase64, 'base64').toString('utf8');
  return (await importPKCS8(pem, ALG)) as KeyLike;
}

async function getPublicKey(): Promise<KeyLike> {
  const keys = getOrGenerateKeys();
  const pem = Buffer.from(keys.publicBase64, 'base64').toString('utf8');
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
