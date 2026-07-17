import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// All auth endpoints — OAuth callbacks, magic-link verification, session,
// JWKS — are served under /api/auth/* by Better Auth's handler.
export const { GET, POST } = toNextJsHandler(auth.handler);
