import { apiFetch } from "@/shared/lib/api/client";
import type { AuthorityNode } from "../model/types";

/*
 * 권한 트리 API (ssccops-server #65 · AuthorityController).
 *
 * **조회까지 포함해 전부 ROLE_MANAGE 를 요구한다.** 어떤 묶음 권한이 있는지 자체가 운영 구조를
 * 드러내기 때문이다. 그래서 화면은 권한이 없으면 호출조차 하지 않는다 — 어차피 403 이 오고,
 * 오류 문구로 "권한 없음" 을 알리는 것보다 처음부터 화면을 닫는 편이 정직하다.
 * (버튼 노출용 권한 목록은 이 API 가 아니라 세션 응답의 capabilities 가 준다.)
 */

/** 서버가 내려주는 트리 노드 — indctSeqno·상위 코드가 null 로 올 수 있다 */
interface AuthorityTreeResponse {
  authrtCd: string;
  authrtNm: string;
  upAuthrtCd: string | null;
  authrtExpln: string | null;
  sysYn: boolean;
  indctSeqno: number | null;
  crtDt: string;
  mdfcnDt: string;
  children: AuthorityTreeResponse[] | null;
}

function toAuthorityNode(res: AuthorityTreeResponse): AuthorityNode {
  return {
    authrtCd: res.authrtCd,
    authrtNm: res.authrtNm,
    upAuthrtCd: res.upAuthrtCd,
    authrtExpln: res.authrtExpln,
    sysYn: res.sysYn,
    indctSeqno: res.indctSeqno,
    crtDt: res.crtDt,
    mdfcnDt: res.mdfcnDt,
    /*
     * 서버는 잎에서도 빈 배열을 약속하지만 여기서 한 번 더 떨어뜨린다 — 화면 전체가 재귀
     * 순회라, 한 노드의 null 하나가 트리 어디에서든 터질 수 있다.
     */
    children: (res.children ?? []).map(toAuthorityNode),
  };
}

/** GET /v1/authorities — 권한 트리 (children 중첩, 서버가 indctSeqno 로 정렬해 내려준다) */
export async function fetchAuthorityTree(): Promise<AuthorityNode[]> {
  const tree = await apiFetch<AuthorityTreeResponse[] | null>("/v1/authorities");
  return (tree ?? []).map(toAuthorityNode);
}

/** 사용자 정의 묶음 권한 생성 본문 (AuthorityCreateRequest) */
export interface AuthorityCreateInput {
  authrtCd: string;
  authrtNm: string;
  /** null 이면 최상위 권한이 된다 */
  upAuthrtCd: string | null;
  authrtExpln: string;
  indctSeqno: number;
}

/**
 * POST /v1/authorities — 사용자 정의 묶음 권한 생성.
 *
 * `sysYn` 은 본문에 없다. 화면에서 만든 권한은 언제나 사용자 정의이며, 요청으로 받으면 true 를
 * 실어 보내는 것만으로 삭제 보호를 스스로 걸 수 있다 — 그렇게 만들어진 권한은 코드가 가리키지
 * 않는데도 지울 수 없게 된다.
 *
 * 응답 본문을 쓰지 않는다. 생성 직후 화면은 트리를 다시 받는다 — 새 노드가 트리의 어디에
 * 어떤 순서로 끼는지는 서버가 정하고, 응답 한 건을 웹이 끼워 넣기 시작하면 그 규칙을 웹이
 * 흉내 내게 된다.
 */
export async function createAuthority(input: AuthorityCreateInput): Promise<void> {
  await apiFetch<unknown>("/v1/authorities", {
    method: "POST",
    body: JSON.stringify({
      authrtCd: input.authrtCd,
      authrtNm: input.authrtNm,
      // 빈 문자열이 아니라 null 로 보낸다 — 서버에서 ""는 "최상위" 가 아니라 없는 코드가 된다
      upAuthrtCd: input.upAuthrtCd || null,
      authrtExpln: input.authrtExpln || null,
      indctSeqno: input.indctSeqno,
    }),
  });
}

/** 권한 수정 본문 (AuthorityUpdateRequest) — 부분 수정이 아니라 노드 한 벌 전체다 */
export interface AuthorityUpdateInput {
  authrtNm: string;
  upAuthrtCd: string | null;
  authrtExpln: string;
  indctSeqno: number;
}

/**
 * PATCH /v1/authorities/{authrtCd} — 이름·설명·상위·순번 수정.
 *
 * **메서드는 PATCH 지만 본문은 노드 한 벌 전체다.** JSON 은 "필드를 보내지 않음" 과 "null 을
 * 보냄" 을 구별할 수 없어, upAuthrtCd 를 부분 수정으로 두면 "상위를 그대로 둬라" 와 "최상위로
 * 올려라" 가 같은 요청이 된다. 편집 화면이 노드 한 벌을 들고 저장하므로 전체를 보낸다.
 *
 * **`authrtCd` 는 본문에 싣지 않는다.** 서버는 본문의 코드가 경로와 다르면 거절하는데(시스템
 * 권한은 409, 사용자 정의는 400), 이 화면에는 애초에 코드를 고치는 입력란이 없다 — 코드는 PK 라
 * 값 하나를 갈아 끼우는 조작이 아니기 때문이다. 생략하면 서버가 검사하지 않는다.
 */
export async function updateAuthority(
  authrtCd: string,
  input: AuthorityUpdateInput,
): Promise<void> {
  await apiFetch<unknown>(`/v1/authorities/${encodeURIComponent(authrtCd)}`, {
    method: "PATCH",
    body: JSON.stringify({
      authrtNm: input.authrtNm,
      upAuthrtCd: input.upAuthrtCd || null,
      authrtExpln: input.authrtExpln || null,
      indctSeqno: input.indctSeqno,
    }),
  });
}

/**
 * DELETE /v1/authorities/{authrtCd} — 사용자 정의 권한 삭제.
 *
 * 시스템 권한은 409 SYSTEM_AUTHORITY_IMMUTABLE, 부여됐거나 자식이 달린 권한은 409
 * AUTHORITY_IN_USE 로 거절된다. 화면은 시스템 권한의 삭제 버튼을 애초에 잠그지만, 자식·부여
 * 여부는 화면이 들고 있는 트리가 낡았을 수 있으므로 서버 판정을 그대로 안내한다.
 */
export async function deleteAuthority(authrtCd: string): Promise<void> {
  await apiFetch<unknown>(`/v1/authorities/${encodeURIComponent(authrtCd)}`, {
    method: "DELETE",
  });
}
