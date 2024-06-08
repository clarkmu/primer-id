import { NextResponse } from "next/server";

export default function middleware(req: any) {
  const { pathname } = req.nextUrl;

  if (
    pathname.includes("/api/test") &&
    req.method === "PATCH" &&
    req.headers.get("x-api-key") !== process.env.API_KEY
  ) {
    return NextResponse.json(
      { message: "Unauthorized. This attempt has been reported to the FBI." },
      { status: 401 }
    );
    //todo: forward to FBI
  }
}
