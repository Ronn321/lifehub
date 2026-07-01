# Infrastructure Scripts

## generate-jwt-keys

Generates an RS256 keypair for JWT signing.

**Windows (recommended):**
```bash
node infrastructure/scripts/generate-jwt-keys.mjs
```

**Linux/macOS:**
```bash
bash infrastructure/scripts/generate-jwt-keys.sh
```

Beide Varianten schreiben die Base64-kodierten Keys als `JWT_PRIVATE_KEY_BASE64` und `JWT_PUBLIC_KEY_BASE64` in `.env`.

**Wichtig:** `.env` ist in `.gitignore`, die `.pem`-Dateien ebenfalls. Niemals committen.
