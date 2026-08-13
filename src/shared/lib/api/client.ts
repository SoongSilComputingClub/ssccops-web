import { createClient } from "@/shared/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/** ssccops-server 호출 시 현재 Supabase 세션의 access token을 Authorization: Bearer로 실어 보낸다 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const {
    data: { session },
  } = await createClient().auth.getSession();

  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}
