import argon2 from 'argon2';

// Argon2id mit OWASP-empfohlenen Parametern für 2025+
// (siehe TECH_STACK.md §3.3: memory=64MB, iterations=3, parallelism=4)
const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
