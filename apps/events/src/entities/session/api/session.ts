import { apiFetchAuthed } from "@/shared/api/authed-client";
import type { AuthSession } from "../model/types";

/*
 * 응답 스키마를 아는 곳은 이 파일 하나다. 서버는 여기 적은 것보다 많은 필드를 내려주지만
 * (등급·역할·권한 배열 …) 이 앱이 읽는 것은 아래뿐이라 그만큼만 선언한다.
 */
interface AuthSessionResponse {
  signedUp: boolean;
  authUser: { id: string; email: string | null; name: string | null };
  member: { memberId: number; name: string } | null;
}

/**
 * GET /v1/auth/session — 이 사용자가 우리 서비스의 누구인지 판정하는 유일한 출처.
 *
 * 미가입자도 200으로 돌아온다(`signedUp: false` · `member: null`). 그래서 '내 신청' 화면은
 * 신청 목록 조회가 403으로 깨지기를 기다리지 않고 **이 응답만으로 가입 안내를 그릴 수 있다**.
 */
export async function fetchAuthSession(): Promise<AuthSession> {
  const response = await apiFetchAuthed<AuthSessionResponse>("/v1/auth/session");
  return {
    signedUp: response.signedUp,
    authUser: response.authUser,
    member: response.member,
  };
}
