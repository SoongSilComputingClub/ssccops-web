"use client";

import Link from "next/link";
import {
  PROPOSAL_FORM_MISSING,
  PROPOSAL_FORM_READ_DENIED,
  type ProposalFormQuery,
} from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import { PublicFormNotice } from "./public-form-notice";

/*
 * 본문 가로 상한은 공개 폼 계열이 **같은 값(860px)을 쓴다** — 한 곳만 고치지 말 것
 * (ssccops#153 · ssccops-web#203). 대상: admin의 public-form-page·proposal-list-page·
 * proposal-form-notice, www의 event-apply-page.
 *
 * lms의 proposal-new-page는 아직 720px이다 — 그 앱이 개발 중이라 이번 변경에서 뺐다.
 * 같은 성격의 화면이므로 개발이 끝나면 함께 860px로 맞출 것.
 *
 * 860px인 근거는 읽기 편한 줄 길이(한 줄 45~75자)다. 본문 글자가 15~16px이라 860px에서
 * 한 줄이 대략 60~70자로 그 범위에 든다. 더 넓히면 장문형 답변(textarea)에서 줄이 길어져
 * 시선이 되돌아오기 어렵고, 좁히면 선택지 많은 문항이 세로로만 늘어난다.
 *
 * **폭 제한을 푸는 것은 답이 아니다** — 문항은 단일 컬럼 세로 나열이라(QitemCard가 2단
 * 배치를 하지 않는다) 폭만 넓히면 짧은 입력칸이 화면 끝까지 늘어나 오히려 읽기 나빠진다.
 *
 * max-w는 상한이라 좁은 화면에서는 px-4가 그대로 지배한다 — 이 값은 PC에서만 효과가 있다.
 */

/*
 * 기획안 폼을 열지 못한 네 갈래 (#163).
 *
 * 두 화면(작성·제출 현황)이 같은 진입 조회를 쓰므로 안내도 한곳에서 그린다 — 각자 적으면
 * 같은 상태가 두 문장으로 보이고, 한쪽만 고쳐진다.
 *
 * **"권한 없음"에 다시 시도 버튼을 주지 않는다.** 몇 번을 눌러도 같고, 버튼이 있으면 사용자는
 * 자기가 무언가를 잘못 눌렀다고 여겨 되풀이한다. 반대로 통신 실패에는 버튼이 있어야 한다 —
 * 그쪽은 실제로 다시 시도할 값어치가 있는 유일한 갈래다.
 */
export function ProposalFormNotice({ query }: { query: ProposalFormQuery }) {
  if (query.status === "loading") {
    return <PublicFormNotice icon="…" title="기획안 폼을 불러오는 중입니다" />;
  }

  if (query.status === "denied") {
    return <PublicFormNotice icon="!" title={PROPOSAL_FORM_READ_DENIED} />;
  }

  if (query.status === "not-seeded") {
    return (
      <PublicFormNotice
        icon="!"
        title={PROPOSAL_FORM_MISSING}
        description="폼이 준비되면 이 화면에서 바로 작성할 수 있습니다."
        action={{ label: "다시 확인", onClick: query.reload }}
      />
    );
  }

  return (
    <PublicFormNotice
      icon="!"
      title={query.errorMessage}
      action={{ label: "다시 시도", onClick: query.reload }}
    />
  );
}

/**
 * 두 기획안 화면을 오가는 줄.
 *
 * 작성 화면과 제출 현황은 **같은 일의 앞뒤**라 서로를 가리켜야 한다 — 낸 뒤에 결과를 보러 가고,
 * 수정요청을 읽은 뒤 다시 쓰러 온다. 한쪽에서 다른 쪽으로 갈 길이 없으면 주소를 기억하는
 * 사람만 그 흐름을 완주한다.
 */
export function ProposalNav({ current }: { current: "new" | "status" }) {
  return (
    <div className="mx-auto flex max-w-[860px] flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-6 text-[13.5px] lg:px-6">
      <span className="font-semibold text-n300">기획안</span>
      {current === "new" ? (
        <Link href={ROUTES.proposals} className="text-accent underline">
          제출 현황 보기
        </Link>
      ) : (
        <Link href={ROUTES.proposalNew} className="text-accent underline">
          기획안 작성하기
        </Link>
      )}
    </div>
  );
}
