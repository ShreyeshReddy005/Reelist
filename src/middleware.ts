import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "next-firebase-auth-edge";

export async function middleware(request: NextRequest) {
  let serviceAccount = { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "reelist-9d75b", clientEmail: "", privateKey: "" };
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      serviceAccount = {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
    }
  }

  return authMiddleware(request, {
    loginPath: "/api/login",
    logoutPath: "/api/logout",
    apiKey: "AIzaSyB5kw5J0-n-E6dBBdKT9oIOeQLc9mUI8tY",
    cookieName: "AuthToken",
    cookieSignatureKeys: ["secret1", "secret2"],
    cookieSerializeOptions: {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 24 * 1000,
    },
    serviceAccount,
    handleValidToken: async ({ token, decodedToken }, headers) => {
      if (request.nextUrl.pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next({ request: { headers } });
    },
    handleInvalidToken: async (reason) => {
      const isPublicRoute = ["/login", "/api/login", "/api/logout", "/__/auth"].some((route) =>
        request.nextUrl.pathname.startsWith(route)
      );
      if (!isPublicRoute) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      return NextResponse.next();
    },
    handleError: async (error) => {
      console.error('Unhandled authentication error', { error });
      return NextResponse.next();
    }
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
