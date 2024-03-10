import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest, ev: NextFetchEvent) {
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") !== "https" &&
    req.nextUrl.hostname.indexOf("localhost") === -1
  ) {
    return NextResponse.redirect(
      `https://${req.nextUrl.hostname}${req.nextUrl.pathname}`,
      301
    );
  }

  return NextResponse.next();
}
