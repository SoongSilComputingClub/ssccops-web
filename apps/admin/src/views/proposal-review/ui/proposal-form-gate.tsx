"use client";

import {
  PROPOSAL_FORM_MISSING,
  PROPOSAL_FORM_READ_DENIED,
  type ProposalFormQuery,
} from "@/features/form";
import { EmptyState, PageBody, PageHeader } from "@/shared/ui";

/**
 * 기획안 폼을 찾는 동안·못 찾았을 때의 화면 (#164).
 *
 * ── 왜 이것이 따로 있는가 ─────────────────────────────────────
 * 검토 목록도 상세도 **폼 번호를 모른 채 시작한다.** 코드(`sys_form_cd = 'PROPOSAL'`)로 폼을
 * 찾는 요청이 먼저 끝나야 응답 목록·응답 상세를 부를 수 있는데, 번호가 없는 동안 그 훅들을
 * 마운트하면 `formId = 0`으로 조회가 나가거나 "찾을 수 없습니다"가 잠깐 스쳐 지나간다.
 * 그래서 두 화면 모두 폼이 `ready`가 되기 전에는 본문을 마운트하지 않고 이 컴포넌트를 그린다.
 *
 * ── 네 갈래를 뭉치지 않는다 ───────────────────────────────────
 * 검토자가 할 수 있는 일이 갈래마다 다르다 — 권한이 없으면 다시 눌러도 영원히 같고(운영진에게
 * 권한을 요청해야 한다), 폼이 아직 없으면 기다리는 것이 맞으며, 통신 실패만이 다시 시도할
 * 값어치가 있다. 문구는 기획안 작성 화면(#163)과 **같은 상수**를 쓴다 — 같은 상황을 두 화면이
 * 다르게 말하면 읽는 사람은 서로 다른 두 가지 일이 일어난 줄 안다.
 */
export function ProposalFormGate({
  title,
  showBack,
  query,
}: {
  /** 화면 제목 — 목록과 상세가 서로 다른 제목으로 기다린다 */
  title: string;
  /** 상세는 목록으로 돌아갈 곳이 있고 목록에는 없다 */
  showBack?: boolean;
  query: ProposalFormQuery;
}) {
  return (
    <>
      <PageHeader title={title} showBack={showBack} />
      <PageBody>
        {query.status === "loading" ? (
          <EmptyState message="불러오는 중…" />
        ) : query.status === "denied" ? (
          /* 권한 부족에는 다시 시도를 주지 않는다 — 몇 번을 눌러도 같다 */
          <EmptyState message={PROPOSAL_FORM_READ_DENIED} />
        ) : query.status === "not-seeded" ? (
          <EmptyState message={PROPOSAL_FORM_MISSING} />
        ) : (
          <EmptyState
            message={query.errorMessage || "기획안 폼을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: query.reload }}
          />
        )}
      </PageBody>
    </>
  );
}
