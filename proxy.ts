import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection (FR-001).
 *
 * Next 16 uses `proxy.ts` for this; a `middleware.ts` alongside it is a build
 * error. The upstream Circle sample shipped a proxy that redirected everything
 * to `/dashboard`, which this build no longer has — that surface belonged to the
 * credit-purchase app we replaced.
 *
 * Presence of the session cookie is all that is checked here. This runs on the
 * edge and cannot reach the session helpers, so it is a gate, not an
 * authorisation decision — route handlers remain responsible for anything that
 * actually matters.
 *
 * Public by design: sign-in, the auth endpoint, and the recipient claim link.
 * The claim link MUST stay public — Persona C receives a URL and has no
 * account (FR-021).
 */

const PUBLIC_PREFIXES = ["/sign-in", "/api/auth", "/claim", "/api/claim"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (request.cookies.get("aurum_session")?.value) {
    return NextResponse.next();
  }

  // APIs get a JSON 401 rather than an HTML redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Please sign in." },
      { status: 401 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
