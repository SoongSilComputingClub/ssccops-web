import { apiFetch } from "@/shared/lib/api/client";
import type { RoleAuthorities } from "../model/types";

/*
 * 역할의 권한 조회·교체 API (ssccops-server #65 · RoleAuthorityController).
 *
 * 둘 다 ROLE_MANAGE 를 요구한다.
 */

interface RoleAuthorityResponse {
  roleId: number;
  roleNm: string;
  grants: { authrtCd: string; authrtNm: string; crtDt: string }[] | null;
  effectiveAuthrtCds: string[] | null;
}

function toRoleAuthorities(res: RoleAuthorityResponse): RoleAuthorities {
  return {
    roleId: res.roleId,
    roleNm: res.roleNm,
    grants: res.grants ?? [],
    effectiveAuthrtCds: res.effectiveAuthrtCds ?? [],
  };
}

/** GET /v1/roles/{roleId}/authorities — 직접 부여(grants)와 펼친 결과(effectiveAuthrtCds) */
export async function fetchRoleAuthorities(roleId: number): Promise<RoleAuthorities> {
  const res = await apiFetch<RoleAuthorityResponse>(`/v1/roles/${roleId}/authorities`);
  return toRoleAuthorities(res);
}

/**
 * PUT /v1/roles/{roleId}/authorities — **전체 교체**.
 *
 * 부분 부여·회수가 아니다. 요청에 없는 권한은 회수되고 빈 배열이면 전부 회수된다 — 화면이
 * 체크박스 트리의 상태 전체를 들고 있으므로 차집합을 웹이 계산해 보내면 그 계산이 틀렸을 때
 * 원인을 되짚을 수 없다.
 *
 * `authrtCds` 에는 **사용자가 직접 체크한 코드만** 담는다. 상위를 체크해서 함께 부여되는 자손을
 * 여기에 끼워 넣으면, 나중에 상위를 회수했을 때 자손이 직접 부여로 남아 조용히 살아남는다.
 *
 * 응답으로 교체 뒤 상태를 그대로 돌려주므로 저장 직후 재조회를 하지 않는다 — 특히
 * `effectiveAuthrtCds` 는 서버가 방금 펼친 결과라, 이보다 정확한 값을 웹이 만들 방법이 없다.
 */
export async function replaceRoleAuthorities(
  roleId: number,
  authrtCds: readonly string[],
): Promise<RoleAuthorities> {
  const res = await apiFetch<RoleAuthorityResponse>(`/v1/roles/${roleId}/authorities`, {
    method: "PUT",
    body: JSON.stringify({ authrtCds: [...authrtCds] }),
  });
  return toRoleAuthorities(res);
}
