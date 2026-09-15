import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "wsms_session";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  return new TextEncoder().encode(secret ?? "insecure-dev-secret-change-me");
}

async function getRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

const PUBLIC_PATHS = ["/login", "/manifest.webmanifest", "/sw.js"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/cron/")
  ) {
    return NextResponse.next();
  }

  const role = await getRole(req);

  // API guard: protect admin-only APIs and any authenticated API
  if (pathname.startsWith("/api/")) {
    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Fully admin-only, regardless of method (employee data, reports, analytics).
    const adminOnlyApi = ["/api/employees", "/api/report-settings", "/api/email-logs", "/api/reports/", "/api/stats/"];
    // Employees may read these (needed for the sale-entry screen: active pricing
    // mode / enabled payment methods) but only admins may change them.
    const adminWriteOnlyApi = ["/api/pricing-settings", "/api/app-settings"];

    if (role !== "ADMIN") {
      if (adminOnlyApi.some((p) => pathname.startsWith(p))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (req.method !== "GET" && adminWriteOnlyApi.some((p) => pathname.startsWith(p))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  // Page guard
  if (!role) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/employee", req.url));
  }

  if (pathname.startsWith("/employee") && role !== "EMPLOYEE" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js).*)",
  ],
};
