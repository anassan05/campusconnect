import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function apiErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("Unhandled API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export const badRequest = (msg: string) => new ApiError(400, msg);
export const unauthorized = () => new ApiError(401, "Authentication required");
export const forbidden = (msg = "You do not have permission for this action") => new ApiError(403, msg);
export const notFound = (msg = "Resource not found") => new ApiError(404, msg);
export const conflict = (msg: string) => new ApiError(409, msg);
