import { apiFetchAuthed } from "@/shared/api/authed-client";
import type { ProgramEventPost } from "../model/event-post";
import { toProgramEventPost, type ProgramEventPostApiResponse } from "./event-post-mapping";

/*
 * 소개 글(행사 게시물) 조회 (#819 · ADR-0069 · 서버 #699 ·
 * `GET /v1/academic-programs/{id}/event-post`) — **서버 컴포넌트 전용**.
 *
 * 행사 경로(`/v1/events/{id}`)는 `EVENT_MANAGE` 하나로 잠겨 있고 리더 역할에는 권한을 붙일 수
 * 없어서(ADR-0067) 학술 경로로 읽는다. 판정은 «그 프로그램의 리더인가» 하나이고 아니면 403이다.
 *
 * 접수가 끝나도 200이다 — 잠기면 `isEditable: false`와 `lockReason`만 온다(지원서 문항 조회와
 * 같은 모양). 화면은 감추지 않고 읽기 전용으로 그린다.
 *
 * `apiFetchAuthed`가 `next/headers`를 타므로 배럴에서 재export 하지 않는다 — 로더가 직접 임포트한다.
 */
export async function fetchProgramEventPost(academicProgramId: number): Promise<ProgramEventPost> {
  const res = await apiFetchAuthed<ProgramEventPostApiResponse>(
    `/v1/academic-programs/${academicProgramId}/event-post`,
  );
  return toProgramEventPost(res);
}
