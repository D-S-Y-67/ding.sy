/**
 * Reference implementation: verifying Regmaglypt JWTs on the Aliyun backend.
 *
 * The frontend obtains a token from GET {AUTH_BASE_URL}/api/auth/token and
 * sends it as `Authorization: Bearer <jwt>`. The backend verifies it
 * independently — no shared secret, no callback to the frontend — using the
 * public keys published at {AUTH_BASE_URL}/api/auth/jwks.
 *
 * Dependencies: `jose` only (npm install jose).
 *
 * The remote key set is fetched lazily and cached in-process by jose
 * (default cooldown 30s, refresh on unknown `kid`), so key rotation on the
 * auth server is picked up automatically without restarts.
 */
import { createRemoteJWKSet, errors, jwtVerify } from "jose";

const AUTH_BASE_URL = process.env.AUTH_BASE_URL ?? "https://regmaglypt.com";

const JWKS = createRemoteJWKSet(new URL(`${AUTH_BASE_URL}/api/auth/jwks`));

/**
 * Verifies a bearer token. Returns the payload on success; throws
 * TokenError with an HTTP status + reason on any failure.
 *
 * Verification covers, in one call: RS256 signature against the JWKS,
 * `exp` (expiry, with 5s clock-tolerance), `iss` and `aud` pinning.
 */
export async function verifyBearerToken(authorizationHeader) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new TokenError(401, "missing_token", "Expected 'Authorization: Bearer <jwt>'");
  }
  const token = authorizationHeader.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ["RS256"],
      issuer: AUTH_BASE_URL,
      audience: "regmaglypt-api",
      clockTolerance: 5,
    });
    // payload.sub is the Regmaglypt user id; email/name ride along.
    return payload;
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      // Expired is worth distinguishing: the client should mint a fresh
      // token from /api/auth/token (its session usually still lives) and
      // retry, rather than treat it as a hard auth failure.
      throw new TokenError(401, "token_expired", "JWT past its exp claim");
    }
    if (err instanceof errors.JOSEError) {
      throw new TokenError(401, "token_invalid", err.message);
    }
    throw err;
  }
}

export class TokenError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* Minimal HTTP server showing the middleware pattern.                 */
/* Run: AUTH_BASE_URL=http://localhost:3000 node verify.mjs            */
/* Then: curl -H "Authorization: Bearer <jwt>" localhost:8080/me       */
/* ------------------------------------------------------------------ */
import { createServer } from "node:http";

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createServer(async (req, res) => {
    try {
      const user = await verifyBearerToken(req.headers.authorization);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, sub: user.sub, email: user.email }));
    } catch (err) {
      const status = err instanceof TokenError ? err.status : 500;
      const code = err instanceof TokenError ? err.code : "internal_error";
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: code }));
    }
  }).listen(8080, () => console.log("verify server on :8080"));
}
