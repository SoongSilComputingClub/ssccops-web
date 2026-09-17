"use client";

import {
  basisBadgeLabel,
  citationLabel,
  citationSource,
  withCitationMarkers,
  type AssistantAnswer,
  type AssistantCitation,
} from "@/entities/assistant";
import { Markdown } from "@/shared/ui";
import type { AssistantMessage as Message } from "../model/use-assistant-store";

/*
 * 말풍선 하나 (#433 · 기획안 §6.3 · §13.1).
 *
 * **출처가 이 기능의 값이다** — 답변만 있고 인용이 없으면 그 답을 근거로 쓸 수 없다. 그래서
 * 인용 카드가 답변에 딸린 장식이 아니라 같은 덩어리로 붙어 있다.
 */

export function AssistantMessageItem({ message }: Readonly<{ message: Message }>) {
  if (message.kind === "question") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-[14px] py-[10px] text-[14px] leading-[1.6] break-words whitespace-pre-wrap text-on-solid">
          {message.text}
        </div>
      </div>
    );
  }

  /*
   * 오류는 거절과 다르다 — 거절(`answered: false`)은 서버가 «근거가 없다»고 답한 것이고
   * 이것은 묻지 못한 것이다. 같은 모양으로 그리면 코퍼스에 없는 질문과 망가진 요청이 화면에서
   * 구별되지 않는다.
   */
  if (message.kind === "error") {
    return (
      <div className="rounded-2xl rounded-bl-md border border-danger/35 bg-danger/8 px-[14px] py-[10px] text-[14px] leading-[1.6] text-danger">
        {message.text}
      </div>
    );
  }

  if (message.kind === "streaming") {
    return <StreamingBubble text={message.text} />;
  }

  return <AnswerBubble answer={message.answer} />;
}

/**
 * 흘러 들어오는 중인 답 (#464).
 *
 * ── `Markdown`을 태우지 않는다 ────────────────────────────────
 * 받는 중의 본문은 **반쯤 온 마크다운**이다 — `**강조`가 닫히기 전, 표의 첫 줄만, 목록의
 * 기호만 온 상태를 지난다. 그것을 매 조각마다 파싱해 그리면 글자가 들어올 때마다 문단이
 * 접혔다 펴지고 표가 생겼다 사라진다. 다 받은 뒤 `AnswerBubble`이 한 번에 그리므로 **완성된
 * 문서로 바뀌는 순간은 한 번뿐**이고, 그 전까지는 줄바꿈만 살려 글자를 그대로 보여 준다.
 *
 * ── 본문의 `[3]`을 그대로 둔다 ────────────────────────────────
 * 표기로 갈아 그리려면 인용이 있어야 하는데 그것은 `done`에만 실려 온다. 게다가 **치환은
 * 길이를 바꾸므로** 조각 경계에 걸린 대괄호를 건드리면 다음 조각이 붙는 순간 문장이 흔들린다
 * (`withCitationMarkers` 주석).
 *
 * 커서(`▍`)를 `aria-hidden`으로 두는 것은 그것이 글자가 아니라 «아직 받는 중»이라는 표시라서다 —
 * 읽어 주는 화면에서는 패널의 `aria-busy`가 같은 말을 이미 하고 있다.
 */
function StreamingBubble({ text }: Readonly<{ text: string }>) {
  return (
    <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-[14px] py-[11px]">
      <div className="text-[14px] leading-[1.7] break-words whitespace-pre-wrap">
        {text}
        <span aria-hidden="true" className="ml-[1px] animate-pulse text-n500">
          ▍
        </span>
      </div>
    </div>
  );
}

function AnswerBubble({ answer }: Readonly<{ answer: AssistantAnswer }>) {
  const badge = basisBadgeLabel(answer);
  /*
   * 본문의 `[3]`을 서버가 만든 표기로 갈아 그린다 (#464) — **여기서만 한다.** 인용이 확정된
   * 뒤라야 짝을 맞출 수 있고, 치환은 길이를 바꾸므로 흘려 받는 동안에는 할 수 없다.
   */
  const body = withCitationMarkers(answer.answer, answer.citations);

  return (
    <div className="flex flex-col gap-2">
      {/*
        근거 배지 — 답변 **위**에 둔다. 「지금 쓰이는 회칙」과 「아직 쓰이지 않는 문서」의 답이
        화면에서 같아 보이면 안 되는데, 읽고 난 뒤에 붙은 꼬리표는 이미 읽은 문장을 되돌리지
        못한다. 거절이면 기댄 문서가 없으므로 그리지 않는다(`basisBadgeLabel`이 null을 준다 —
        `toAnswer`가 `applyStatus`를 눌러 두는 것과 한 쌍이다).
      */}
      {badge && (
        <div className="self-start rounded-full border border-line bg-fill px-[10px] py-[3px] text-[12px] text-n400">
          {badge}
        </div>
      )}

      <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-[14px] py-[11px]">
        {/*
          거절은 서버가 정한 안내 문구다. Markdown으로 그리지 않고 그대로 두는 것은 그 문장에
          서식이 없고, 답변과 같은 렌더러를 태우면 두 성격의 문장이 같아 보이기 때문이다.
        */}
        {answer.answered ? (
          /*
            패널은 본문 화면보다 좁다. `Markdown`은 15px·넓은 제목 여백으로 고정돼 있어
            (packages/ui — 본문 화면이 기준이다) 그대로 두면 380px 안에서 제목 하나가 한 칸을
            다 먹는다. **패키지의 계약을 호출부 하나 때문에 넓히지 않고** 바깥 상자에서 줄인다.
          */
          <div className="[&_h2]:mt-3 [&_h2]:text-[16px] [&_h3]:mt-3 [&_h3]:text-[15px] [&_h4]:mt-2 [&_li]:text-[14px] [&_p]:my-[7px] [&_p]:text-[14px] [&_p]:leading-[1.7] [&>div>:first-child]:mt-0 [&>div>:last-child]:mb-0">
            <Markdown>{body}</Markdown>
          </div>
        ) : (
          <div className="text-[14px] leading-[1.7] whitespace-pre-wrap text-n300">
            {body || "질문에 답할 근거를 찾지 못했습니다"}
          </div>
        )}
      </div>

      {/*
        근거는 **접어 둔다** (#468).

        발췌 카드가 여러 장이면 답변보다 길어져, 다 읽고 스크롤해 내려온 사람이 다음 질문을
        하려면 그 카드들을 다시 지나야 했다. 접어 두면 답이 먼저 읽히고, 「어디에 그렇게
        적혀 있나」를 확인하려는 사람만 편다.

        `<details>`를 쓰는 것은 여는 상태를 이 컴포넌트가 들지 않기 위해서다 — 말풍선은 대화가
        길어지면 여러 개가 함께 있고, 각자의 열림을 store에 두면 대화를 지울 때 따라 지울 것이
        하나 늘어난다. 키보드 조작과 보조기기 안내도 브라우저가 이미 한다.

        `answered: false`면 애초에 `citations`가 비어 온다(`toAnswer`가 #468에서 버린다) —
        거절에 «근거 보기»를 달면 눌러서 빈 곳을 확인하게 만든다.
      */}
      {answer.citations.length > 0 && (
        <details className="group self-start">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg px-[9px] py-[5px] text-[12.5px] text-n400 transition-colors hover:bg-fill hover:text-n300 [&::-webkit-details-marker]:hidden">
            {/* 열리면 돌아가는 홑화살괄호 — 표식이라 읽어 주지 않는다 */}
            <span
              aria-hidden="true"
              className="text-[10px] transition-transform group-open:rotate-90"
            >
              ▶
            </span>
            답변 근거 보기 ({answer.citations.length})
          </summary>

          <ul className="mt-[6px] flex list-none flex-col gap-[6px]">
            {answer.citations.map((citation, index) => (
              /*
                `ref`가 키다 — 서버가 발췌마다 매긴 번호라 한 답변 안에서 겹치지 않는다. 문서명과
                표기를 이어 붙이던 옛 키는 같은 조를 두 번 인용하면 부딪혔다. **`ref`가 0인 것은
                서버가 그 값을 빠뜨렸다는 뜻**이라(`toCitation`) 그때만 인덱스로 떨어뜨린다.
              */
              <li key={citation.ref || `fallback-${index}`}>
                <CitationCard citation={citation} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * 인용 카드 — **`citationType`으로 갈린다**.
 *
 * `ARTICLE`이면 «제2장 회원 · 제7조 (회원의 구분)», `PAGE`면 «2026 지원금 집행 지침 p.12».
 * 한 답변에 둘이 섞이는 것이 정상이라 유형을 왼쪽 표식으로 밝힌다 — 두 카드가 나란히 놓였을
 * 때 어느 쪽이 조문이고 어느 쪽이 페이지인지가 글자 모양만으로는 갈리지 않는다.
 *
 * **표식이 유형 하나만 말하던 자리다** (#464). 이제 본문이 `[제7조]`로 근거를 달고 있으므로
 * 카드가 그중 어느 것인지를 함께 밝힌다 — 근거 여럿을 단 답에서 «본문의 이 대괄호가 아래 어느
 * 카드인가»를 짚을 값이 그 전에는 없었다. `marker`가 본문에 박힌 글자와 **같은 문자열**이라
 * (둘 다 서버가 만든다) 눈으로 잇는 데 해석이 필요하지 않다.
 */
function CitationCard({ citation }: Readonly<{ citation: AssistantCitation }>) {
  const source = citationSource(citation);

  return (
    <div className="rounded-xl border border-line bg-subtle px-[12px] py-[9px]">
      <div className="flex items-start gap-[7px]">
        <span
          aria-hidden="true"
          className="mt-[1px] flex-none rounded-[6px] border border-line-strong px-[5px] py-[1px] text-[11px] text-n500"
        >
          {/*
            서버가 표기를 만들지 못했으면(계약상 비지 않지만) 유형으로 돌아간다 — 표식 자리를
            비우면 조항 카드와 페이지 카드가 글자 모양만으로 갈려야 한다.
          */}
          {citation.marker ?? (citation.citationType === "ARTICLE" ? "조항" : "쪽")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium break-words text-n300">
            {citationLabel(citation)}
          </div>
          {source && <div className="mt-[2px] text-[12px] text-n500">{source}</div>}
        </div>
      </div>
      {/*
        원문 발췌 — 인용이 가리키는 곳에 실제로 그 문장이 있는지를 여기서 확인한다. 이것이
        없으면 «제7조»라는 글자만 남아 운영진이 회칙을 다시 열어야 한다.
      */}
      {citation.snippet && (
        <p className="mt-[7px] border-l-2 border-line-strong pl-[9px] text-[12px] leading-[1.6] break-words whitespace-pre-wrap text-n400">
          {citation.snippet}
        </p>
      )}
    </div>
  );
}
