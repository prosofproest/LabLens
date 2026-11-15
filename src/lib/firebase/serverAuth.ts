// Server-only Firebase Auth token verification
// Uses standard JSON Web Key Set (JWKS) to cryptographically verify Firebase ID tokens.
// DO NOT import this file into Client Components.

import { jwtVerify, createRemoteJWKSet, decodeJwt } from "jose";

const GOOGLE_JWKS_URL = new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
);

// Cache JWKS client instance across server invocations
const JWKS = createRemoteJWKSet(GOOGLE_JWKS_URL);

export interface VerifiedFirebaseToken {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

/**
 * Cryptographically verifies a Firebase Auth ID Token on the server.
 * Enforces RS256 algorithm, valid expiration, matching audience (projectId),
 * and correct Google issuer.
 * Throws an error if the token is missing, expired, forged, or unauthenticated.
 */
export async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseToken> {
  if (!token || typeof token !== "string" || token.trim() === "") {
    throw new Error("Missing or empty authentication token.");
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("Server configuration error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.");
  }

  // Handle Firebase Auth Emulator environment (for local emulator testing)
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    try {
      const claims = decodeJwt(token);
      if (!claims.sub || typeof claims.sub !== "string") {
        throw new Error("Invalid emulator token: missing subject (UID).");
      }
      return {
        uid: claims.sub,
        email: (claims.email as string) || undefined,
        emailVerified: Boolean(claims.email_verified),
      };
    } catch {
      throw new Error("Malformed emulator authentication token.");
    }
  }

  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  // Cryptographically verify signature against Google's public x509 JWK set
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: expectedIssuer,
    audience: projectId,
    algorithms: ["RS256"],
  });

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token payload: missing subject UID.");
  }

  return {
    uid: payload.sub,
    email: (payload.email as string) || undefined,
    emailVerified: Boolean(payload.email_verified),
  };
}

