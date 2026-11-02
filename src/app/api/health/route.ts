import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", app: "campusconnect", time: new Date().toISOString() });
}
