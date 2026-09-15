"use client";

import Link from "next/link";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { ROUTES } from "@/shared/config/routes";

/*
 * 대화를 시작하기 전의 패널 안 (#433 · 기획안 §13.1 · §13.3).
 *
 * **부제를 두지 않는다.** 목업의 «동아리 규정 · 학칙 문서 기반 답변»은 뺐다 — 코퍼스가 이제
 * 화면에서 바뀌므로(#432) 그 한 줄이 곧 거짓말이 될 자리다(세칙·지침이 들어오고 학칙이 빠져도
 * 문구는 그대로 남는다). **추천 질문이 같은 일을 더 정확히 한다** — 지금 코퍼스가 답할 수
 * 있는 것만 서버가 내려 주기 때문이다.
 */

/**
 * 고지 문구 — **뒷문장은 책임 경계라 지운 채로 내보내지 않는다**(이슈).
 *
 * «사내»가 아니라 «동아리»인 것은 여기가 회사가 아니기 때문이다.
 */
const DISCLAIMER =
  "동아리 규정 문서에서 찾아 출처와 함께 답해요. 읽기 전용이므로 승인·반려 같은 처리는 직접 하셔야 해요.";

export function AssistantEmpty({
  suggestions,
  loaded,
  onPick,
}: Readonly<{ suggestions: string[]; loaded: boolean; onPick: (question: string) => void }>) {
  /*
   * 코퍼스가 비어 있을 때의 안내다. **추천 질문이 빈 배열인 것이 그 신호이자 새 환경의 정상
   * 상태**이고(서버 §12.5), 그것 말고 코퍼스 크기를 물을 길이 이 화면에 없다 — 문서 목록
   * 조회는 RAG_DOCUMENT_MANAGE가 있어야 열린다.
   *
   * **`loaded`를 함께 보는 이유**: 조회가 끝나기 전에도 배열은 비어 있다. 그것만 보고 그리면
   * 문서가 멀쩡히 있는 환경에서도 패널을 열 때마다 «등록된 규정 문서가 없습니다»가 한 번
   * 번쩍인다 — 사용자가 실제로 읽고 믿는 문장이라 깜빡임으로 지나갈 수 없다.
   */
  const corpusMayBeEmpty = loaded && suggestions.length === 0;

  return (
    <div className="flex flex-col gap-4 px-1 py-2">
      <p className="text-[13.5px] leading-[1.7] text-n400">{DISCLAIMER}</p>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-[7px]">
          <div className="text-[12.5px] text-n500">이런 것을 물어볼 수 있어요</div>
          {/*
            **서버가 내린 추천 질문이다**(§13.3). 웹에 하드코딩하면 업로드 다음 날부터 거짓말을
            한다 — 후보가 «어느 문서가 있어야 답할 수 있는가»로 묶여 있어 그 문서가 시행 중이
            아니면 내려오지 않는다.
          */}
          {suggestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onPick(question)}
              className="cursor-pointer rounded-xl border border-line bg-surface px-[13px] py-[10px] text-left text-[13.5px] leading-[1.5] text-n300 transition-colors hover:border-accent hover:text-accent"
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {corpusMayBeEmpty && <EmptyCorpusNotice />}
    </div>
  );
}

/**
 * 문서가 하나도 없을 때의 안내.
 *
 * **`RAG › 설정`으로 가는 링크는 `RAG_DOCUMENT_MANAGE` 보유자에게만 보인다**(이슈) —
 * 코퍼스 화면은 목록 조회까지 그 권한이라(서버 클래스 레벨 `@RequireAuthority`) 없는 사람을
 * 보내면 첫 조회부터 403이다. «이동은 감추고, 동작은 잠근다»가 그대로 적용되는 자리다.
 */
function EmptyCorpusNotice() {
  const canManage = useCan(CAPABILITY.RAG_DOCUMENT_MANAGE);

  return (
    <div className="rounded-xl border border-line bg-subtle px-[13px] py-[11px] text-[13px] leading-[1.7] text-n400">
      아직 등록된 규정 문서가 없어 답할 수 있는 것이 없습니다
      {canManage && (
        <>
          {" — "}
          <Link href={ROUTES.ragSettings} className="text-accent underline underline-offset-2">
            RAG › 설정
          </Link>
          에서 문서를 올려주세요
        </>
      )}
    </div>
  );
}
