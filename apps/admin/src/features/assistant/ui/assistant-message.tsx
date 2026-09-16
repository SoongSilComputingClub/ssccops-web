"use client";

import {
  basisBadgeLabel,
  citationLabel,
  citationSource,
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

  return <AnswerBubble answer={message.answer} />;
}

function AnswerBubble({ answer }: Readonly<{ answer: AssistantAnswer }>) {
  const badge = basisBadgeLabel(answer);

  return (
    <div className="flex flex-col gap-2">
      {/*
        근거 배지 — 답변 **위**에 둔다. 「지금 회칙」과 「의결 전 개정안」의 답이 화면에서
        같아 보이면 안 되는데, 읽고 난 뒤에 붙은 꼬리표는 이미 읽은 문장을 되돌리지 못한다.
        거절이면 기댄 문서가 없으므로 그리지 않는다(basisBadgeLabel이 null을 준다).
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
            <Markdown>{answer.answer}</Markdown>
          </div>
        ) : (
          <div className="text-[14px] leading-[1.7] whitespace-pre-wrap text-n300">
            {answer.answer || "질문에 답할 근거를 찾지 못했습니다"}
          </div>
        )}
      </div>

      {/*
        `answered: false`면 인용 영역을 비운다 — `citations`는 빈 배열이지 null이 아니므로
        길이만 보면 된다. 거절에 «출처 없음» 같은 빈 상자를 그리지 않는 것은, 없는 것이
        정상인 자리에 자리를 만들면 무언가 실패한 것처럼 읽히기 때문이다.
      */}
      {answer.citations.length > 0 && (
        <ul className="flex list-none flex-col gap-[6px]">
          {answer.citations.map((citation, index) => (
            <li key={`${citation.docTitle ?? ""}-${citationLabel(citation)}-${index}`}>
              <CitationCard citation={citation} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 인용 카드 — **`citationType`으로 갈린다**.
 *
 * `ARTICLE`이면 «제2장 회원 · 제7조 6항», `PAGE`면 «2026 지원금 집행 지침 p.12». 한 답변에
 * 둘이 섞이는 것이 정상이라 유형을 왼쪽 표식으로 밝힌다 — 두 카드가 나란히 놓였을 때 어느
 * 쪽이 조문이고 어느 쪽이 페이지인지가 글자 모양만으로는 갈리지 않는다.
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
          {citation.citationType === "ARTICLE" ? "조항" : "쪽"}
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
        없으면 «제7조 6항»이라는 글자만 남아 운영진이 회칙을 다시 열어야 한다.
      */}
      {citation.snippet && (
        <p className="mt-[7px] border-l-2 border-line-strong pl-[9px] text-[12px] leading-[1.6] break-words whitespace-pre-wrap text-n400">
          {citation.snippet}
        </p>
      )}
    </div>
  );
}
