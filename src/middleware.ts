import type { NextRequest } from "next/server";
import { updateSession } from "@/shared/lib/supabase/proxy";

/*
 * Next.js 16은 middleware.ts를 proxy.ts로 대체했지만, @opennextjs/cloudflare가 아직
 * proxy.ts 컨벤션을 인식하지 못해 빌드가 깨진다 (opennextjs/opennextjs-cloudflare#962).
 * 어댑터가 지원할 때까지 구 컨벤션(middleware.ts / export function middleware)을 유지한다.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
