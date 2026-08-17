"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_TTL = void 0;
exports.signAccessToken = signAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.hashRefreshToken = hashRefreshToken;
const jose_1 = require("jose");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const ALG = 'RS256';
const ACCESS_TTL = '24h'; // private family NAS — enough for URL-bound stream/thumbnail tokens
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const KEYS_DIR = process.env.LIFEHUB_DATA_PATH
    ? (0, node_path_1.join)(process.env.LIFEHUB_DATA_PATH, 'keys')
    : (0, node_path_1.join)(process.cwd(), 'data', 'keys');
const PRIVATE_KEY_PATH = (0, node_path_1.join)(KEYS_DIR, 'jwt_private.pem');
const PUBLIC_KEY_PATH = (0, node_path_1.join)(KEYS_DIR, 'jwt_public.pem');
function generateAndPersistKeys() {
    const { privateKey, publicKey } = (0, node_crypto_1.generateKeyPairSync)('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });
    (0, node_fs_1.mkdirSync)(KEYS_DIR, { recursive: true });
    (0, node_fs_1.writeFileSync)(PRIVATE_KEY_PATH, privateKey);
    (0, node_fs_1.writeFileSync)(PUBLIC_KEY_PATH, publicKey);
    const privateBase64 = Buffer.from(privateKey).toString('base64');
    const publicBase64 = Buffer.from(publicKey).toString('base64');
    console.log(`🔐 JWT Keys generated and saved to ${KEYS_DIR}`);
    return { privateBase64, publicBase64 };
}
function loadExistingKeys() {
    if (!(0, node_fs_1.existsSync)(PRIVATE_KEY_PATH) || !(0, node_fs_1.existsSync)(PUBLIC_KEY_PATH)) {
        return null;
    }
    try {
        const privatePem = (0, node_fs_1.readFileSync)(PRIVATE_KEY_PATH, 'utf8');
        const publicPem = (0, node_fs_1.readFileSync)(PUBLIC_KEY_PATH, 'utf8');
        return {
            privateBase64: Buffer.from(privatePem).toString('base64'),
            publicBase64: Buffer.from(publicPem).toString('base64'),
        };
    }
    catch {
        return null;
    }
}
function getOrGenerateKeys() {
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
async function getPrivateKey() {
    const keys = getOrGenerateKeys();
    const pem = Buffer.from(keys.privateBase64, 'base64').toString('utf8');
    return (await (0, jose_1.importPKCS8)(pem, ALG));
}
async function getPublicKey() {
    const keys = getOrGenerateKeys();
    const pem = Buffer.from(keys.publicBase64, 'base64').toString('utf8');
    return (await (0, jose_1.importSPKI)(pem, ALG));
}
// ../../shared/auth/src/jwt.ts(38,11): signAccessToken uses await getPrivateKey
async function signAccessToken(payload) {
    const jti = (0, node_crypto_1.randomBytes)(16).toString('hex');
    const key = await getPrivateKey();
    return new jose_1.SignJWT({ ...payload })
        .setProtectedHeader({ alg: ALG, typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TTL)
        .setJti(jti)
        .sign(key);
}
async function verifyAccessToken(token) {
    const key = await getPublicKey();
    const { payload } = await (0, jose_1.jwtVerify)(token, key, { algorithms: [ALG] });
    return payload;
}
function generateRefreshToken() {
    const token = (0, node_crypto_1.randomBytes)(48).toString('base64url');
    const hash = (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
    return { token, hash };
}
function hashRefreshToken(token) {
    return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
}
exports.REFRESH_TTL = REFRESH_TTL_SECONDS;
//# sourceMappingURL=jwt.js.map