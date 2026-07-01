"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const argon2_1 = __importDefault(require("argon2"));
// Argon2id mit OWASP-empfohlenen Parametern für 2025+
// (siehe TECH_STACK.md §3.3: memory=64MB, iterations=3, parallelism=4)
const ARGON2_OPTS = {
    type: argon2_1.default.argon2id,
    memoryCost: 64 * 1024, // 64 MB
    timeCost: 3,
    parallelism: 4,
};
async function hashPassword(plain) {
    return argon2_1.default.hash(plain, ARGON2_OPTS);
}
async function verifyPassword(hash, plain) {
    try {
        return await argon2_1.default.verify(hash, plain);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=password.js.map