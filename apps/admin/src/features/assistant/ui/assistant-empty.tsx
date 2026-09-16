"use client";

import Link from "next/link";
import type { AssistantCorpusState } from "@/entities/assistant";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { ragSettingsUrl } from "@/shared/config/routes";

/*
 * 대화를 시작하기 전의 패널 안 (#433 · #463 · 기획안 §13.1 · §13.3).
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
  corpusState,
  loaded,
  onPick,
}: Readonly<{
  suggestions: string[];
  corpusState: AssistantCorpusState;
  loaded: boolean;
  onPick: (question: string) => void;
}>) {
  /*
   * 지금 물어도 되는 상태가 아닐 때의 안내다. **서버가 내린 `corpusState`로 가른다**(#463) —
   * 추천 질문이 빈 배열인 것만으로는 «코퍼스가 비었다»와 «문서는 있는데 시행 중인 것이
   * 없다»가 갈리지 않아, 화면이 이미 올린 문서를 올리라고 말했다. 코퍼스 크기를 따로 물을
   * 길은 여기 없다 — 문서 목록·요약은 RAG_DOCUMENT_MANAGE 뒤에 있고 패널은 어디서나 열린다.
   *
   * **`loaded`를 함께 보는 이유**: 조회가 끝나기 전에는 상태가 초깃값(`EMPTY`)이다. 그것만
   * 보고 그리면 문서가 멀쩡히 있는 환경에서도 패널을 열 때마다 «등록된 규정 문서가 없습니다»가
   * 한 번 번쩍인다 — 사용자가 실제로 읽고 믿는 문장이라 깜빡임으로 지나갈 수 없다.
   */
  const notice = loaded && corpusState !== "READY";

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

      {notice && <CorpusNotice corpusState={corpusState} />}
    </div>
  );
}

/**
 * 답할 근거가 없을 때의 안내 — **상태 둘 × 권한 둘**(#463).
 *
 * ── 왜 `NONE_EFFECTIVE`를 더 쪼개지 않는가 ─────────────────────
 * 서버가 그 한 값에 «색인 중»·«색인 실패»·«내려둔 문서뿐»·«시행 중이지만 재색인 중»을 모두
 * 담았다. 패널이 묻는 것은 «지금 물어도 되는가» 하나이고 «왜 없는가»는 관리 목록이 문서마다
 * 말하므로, 화면에서 되쪼개면 서버가 모르는 어휘가 생긴다.
 *
 * ── `RAG › 설정` 링크는 권한 보유자에게만 ───────────────────────
 * 코퍼스 화면은 **목록 조회까지** RAG_DOCUMENT_MANAGE라(서버 클래스 레벨 `@RequireAuthority`)
 * 없는 사람을 보내면 첫 조회부터 403이다. «이동은 감추고, 동작은 잠근다»가 그대로 적용되는
 * 자리라, 권한이 없으면 링크 대신 **그 사람이 할 수 있는 일**(운영진 문의)을 말한다.
 *
 * ── 링크가 «시행 전 문서»로 데려간다 ───────────────────────────
 * `NONE_EFFECTIVE`의 링크는 적용 상태 필터를 실어 보낸다 — 문서가 수십 건일 때 «시행을
 * 누르세요»라고 말하면서 걸러지지 않은 전체 목록으로 데려가면 그 말이 다시 헛돈다. **한
 * «행»을 가리킬 수는 없다**: 패널이 받는 것은 상태 하나뿐이고(`suggestions`에 문서 식별자가
 * 없다) 시행 전 문서가 여러 건이면 «그 행»이 하나로 정해지지도 않는다.
 */
function CorpusNotice({ corpusState }: Readonly<{ corpusState: AssistantCorpusState }>) {
  const canManage = useCan(CAPABILITY.RAG_DOCUMENT_MANAGE);

  return (
    <div className="rounded-xl border border-line bg-subtle px-[13px] py-[11px] text-[13px] leading-[1.7] text-n400">
      {corpusState === "NONE_EFFECTIVE" ? (
        canManage ? (
          <>
            올린 문서가 아직 시행 전입니다 — <RagSettingsLink applyStatus="DRAFT" />
            에서 «시행»을 눌러야 답변에 쓰입니다
          </>
        ) : (
          "아직 시행 중인 규정 문서가 없습니다 — 운영진에게 문의해주세요"
        )
      ) : canManage ? (
        <>
          아직 등록된 규정 문서가 없습니다 — <RagSettingsLink />
          에서 올려주세요
        </>
      ) : (
        "아직 등록된 규정 문서가 없어 답할 수 있는 것이 없습니다"
      )}
    </div>
  );
}

function RagSettingsLink({ applyStatus }: Readonly<{ applyStatus?: "DRAFT" }>) {
  return (
    <Link
      href={ragSettingsUrl(applyStatus)}
      className="text-accent underline underline-offset-2"
    >
      RAG › 설정
    </Link>
  );
}
