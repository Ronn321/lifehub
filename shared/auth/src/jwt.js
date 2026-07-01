"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_TTL = void 0;
exports.signAccessToken = signAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.hashRefreshToken = hashRefreshToken;
const jose_1 = require("jose");
const node_crypto_1 = require("node:crypto");
const ALG = 'RS256';
const ACCESS_TTL = '15m';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
async function getPrivateKey() {
    const b64 = process.env.JWT_PRIVATE_KEY_BASE64;
    if (!b64)
        throw new Error('JWT_PRIVATE_KEY_BASE64 not set');
    const pem = Buffer.from(b64, 'base64').toString('utf8');
    return (await (0, jose_1.importPKCS8)(pem, ALG));
}
async function getPublicKey() {
    const b64 = process.env.JWT_PUBLIC_KEY_BASE64;
    if (!b64)
        throw new Error('JWT_PUBLIC_KEY_BASE64 not set');
    const pem = Buffer.from(b64, 'base64').toString('utf8');
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