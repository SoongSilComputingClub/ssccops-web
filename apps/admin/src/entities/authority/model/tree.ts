import type { AuthorityNode } from "./types";

/*
 * 권한 트리를 화면이 다루기 위한 순수 함수들.
 *
 * **여기에 "누가 무슨 권한을 가졌는가" 를 판정하는 함수는 없다.** 그 판정은 서버
 * (AuthorityPolicy)와 세션의 capabilities 가 한다 — 웹은 트리의 **모양**만 다룬다.
 * 유일한 예외는 아래 previewEffectiveCodes 이며, 그 함수 주석에 왜 예외인지를 적어 두었다.
 */

/** 트리를 세로로 편 한 줄 — depth 는 들여쓰기용이다 */
export interface FlatAuthority {
  node: AuthorityNode;
  depth: number;
}

/**
 * 트리를 화면 표시 순서(깊이 우선)대로 편다.
 *
 * 재귀 컴포넌트 대신 평평한 배열을 그리는 것은 표 형태(체크박스 열 + 이름 열 + 배지 열)의
 * 열 정렬을 맞추기 위해서다 — 재귀로 그리면 깊이마다 중첩 div 가 생겨 열이 계단처럼 어긋난다.
 * 정렬은 서버가 indctSeqno 로 이미 해 두었으므로 여기서 다시 정렬하지 않는다.
 */
export function flattenAuthorities(
  nodes: readonly AuthorityNode[],
  depth = 0,
): FlatAuthority[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flattenAuthorities(node.children, depth + 1),
  ]);
}

/** 코드로 노드를 찾는다. 없으면 null */
export function findAuthority(
  nodes: readonly AuthorityNode[],
  authrtCd: string,
): AuthorityNode | null {
  for (const node of nodes) {
    if (node.authrtCd === authrtCd) return node;
    const found = findAuthority(node.children, authrtCd);
    if (found) return found;
  }
  return null;
}

/** 자기 자신을 포함한 서브트리의 모든 코드 */
export function subtreeCodes(node: AuthorityNode): string[] {
  return [node.authrtCd, ...node.children.flatMap(subtreeCodes)];
}

/**
 * 상위 권한 후보 — 자기 자신과 자기 자손을 뺀 나머지.
 *
 * 서버도 AUTHORITY_CYCLE_DETECTED 로 막지만, 고를 수 없는 값을 목록에 남겨 두면 사용자는
 * 고르고 저장하고 나서야 거절당한다. 애초에 후보에 없으면 그런 왕복이 생기지 않는다.
 *
 * `authrtCd` 가 null 이면(새로 만드는 권한) 뺄 자손이 없으므로 전체가 후보다.
 */
export function parentCandidates(
  tree: readonly AuthorityNode[],
  authrtCd: string | null,
): FlatAuthority[] {
  const flat = flattenAuthorities(tree);
  if (authrtCd === null) return flat;

  const self = findAuthority(tree, authrtCd);
  if (self === null) return flat;

  const excluded = new Set(subtreeCodes(self));
  return flat.filter((f) => !excluded.has(f.node.authrtCd));
}

/** 아직 저장하지 않은 체크 상태를 화면에 비추기 위한 값 — {@link previewGrants} 참고 */
export interface GrantPreview {
  /** 저장하면 실제로 부여될 코드 전부 (직접 체크 + 상위에서 함께 부여되는 것) */
  effective: Set<string>;
  /**
   * 자손 코드 → 그것을 부여한 **조상의 이름**.
   *
   * 잠긴 체크박스에 "왜 잠겼는지" 를 사람 말로 붙이려면 조상의 이름이 필요하다. "상위 권한
   * 때문에 잠김" 만으로는 트리가 깊어질수록 어느 줄을 풀어야 할지 알 수 없다.
   */
  inheritedFrom: Map<string, string>;
}

/**
 * 아직 저장하지 않은 체크 상태를 **미리 보기** 위해서만 쓰는 하향 펼침.
 *
 * ── 서버가 이미 펼쳐 주는데 왜 여기에 같은 계산이 있는가 ──────────
 * 서버의 `effectiveAuthrtCds` 는 **저장된 상태**의 답이다. 사용자가 방금 체크한 상위 권한은
 * 아직 서버에 없으므로, 그 체크로 자손이 함께 부여된다는 사실을 서버에 물어볼 방법이 없다.
 * 저장 전까지 자손을 아무 표시 없이 두면 "상위를 체크했는데 자손은 왜 그대로냐" 가 되어,
 * 사용자는 결국 자손을 하나씩 다시 체크하게 된다 — 이 화면이 존재하는 이유가 사라진다.
 *
 * ── 그래서 이 함수의 결과는 어디까지만 쓰는가 ─────────────────────
 * **표시(체크·비활성·자기 잠금 경고)에만 쓴다.** 서버로 나가는 PUT 본문은 언제나 사용자가
 * 직접 체크한 코드(`directCodes`)뿐이고, 저장 뒤 "지금 부여된 것" 은 다시 서버의
 * effectiveAuthrtCds 로 되돌아간다. 규칙이 두 벌이 되지 않는 것은 이 경계 덕분이다 —
 * 여기서 계산한 값이 인가 판정에 쓰이는 경로는 없다.
 *
 * 펼침 규칙 자체(위 → 아래 한 방향)는 트리의 부모-자식 간선을 그대로 따르는 것이고, 그 간선은
 * 서버가 내려준 데이터다.
 */
export function previewGrants(
  tree: readonly AuthorityNode[],
  directCodes: ReadonlySet<string>,
): GrantPreview {
  const effective = new Set<string>();
  const inheritedFrom = new Map<string, string>();

  const walk = (nodes: readonly AuthorityNode[], ancestorNm: string | null) => {
    for (const node of nodes) {
      const direct = directCodes.has(node.authrtCd);
      if (ancestorNm !== null) {
        inheritedFrom.set(node.authrtCd, ancestorNm);
        effective.add(node.authrtCd);
      } else if (direct) {
        effective.add(node.authrtCd);
      }
      walk(node.children, ancestorNm ?? (direct ? node.authrtNm : null));
    }
  };

  walk(tree, null);
  return { effective, inheritedFrom };
}
