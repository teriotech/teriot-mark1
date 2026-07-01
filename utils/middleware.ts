import { type NextRequest } from "next/server";

export async function updateSupabaseSession(request: NextRequest) {
  void request;
  return new Response(null, { status: 200 });
}
