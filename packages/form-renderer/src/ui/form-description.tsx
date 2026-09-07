import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

import { cn } from "../lib/cn";

/*
 * 폼의 안내 문구(페이지 설명 · 문항 설명) 렌더러 — ssccops#222.
 *
 * **두 앱이 같은 결과를 봐야 해서 여기 있다.** 편집자는 어드민 미리보기로 보고 응답자는
 * 공개 앱에서 보는데, 렌더러를 앱마다 두면 그중 한 벌만 고쳐지는 순간 "편집기에서는
 * 목록이었는데 응답 화면에서는 별표가 그대로 보인다"가 된다(클라이언트 검증 규칙을 이
 * 패키지로 모은 것과 같은 이유 · ssccops#136).
 *
 * ── 서식 범위 ──────────────────────────────────────────────
 * 굵기 · 기울임 · 목록 · 줄바꿈 · 링크. **본문(행사 상세)용 렌더러와 일부러 다르다.**
 *
 * **`remark-gfm`을 붙이지 않는다.** 표·자동링크가 딸려 오는데, 안내 문구에 표가 들어가면
 * 좁은 화면에서 폼을 통째로 밀어낸다. 붙이지 않으면 표 문법은 **평문 그대로 보여** 레이아웃을
 * 깨지 않고 편집자도 그것이 안 먹는다는 것을 바로 안다.
 *
 * **이미지는 그리지 않는다**(ssccops#222 · 2026-09-07 결정). 업로드·읽기 경로가 필요한데
 * 두 선례가 갈리고(행사 본문은 전용 경로 · `file_rfrnc`는 얼굴이 찍힌 인증사진과 같은 테이블)
 * 익명 읽기를 여는 판단이 무겁다. **지우지 않고 대체 텍스트를 남기는 것**은, 통째로 사라지면
 * 편집자가 이미지가 로딩 중인지 지원되지 않는지 구별할 수 없기 때문이다. 외부 URL로 요청이
 * 나가지 않는 것도 함께 얻는다.
 *
 * ── 안전 ────────────────────────────────────────────────
 * **원시 HTML을 해석하지 않는다.** react-markdown은 기본으로 HTML을 글자 그대로 두고
 * `rehype-raw`를 붙여야 해석한다 — 그 플러그인을 쓰지 않는 것이 여기서의 안전장치 전부다.
 * 설명은 `FORM_WRITE` 권한자만 쓰지만 그 결과물은 **링크로 뿌려지는 공개 화면**에 렌더되므로
 * 신뢰 경계가 사라지지는 않는다. 나중에 누군가 "표가 안 그려져요"로 rehype-raw를 붙이면 이
 * 결정이 조용히 뒤집히므로, 그때는 sanitize를 함께 건다.
 *
 * ── 줄바꿈 ──────────────────────────────────────────────
 * `remark-breaks` 대신 `whitespace-pre-line`을 쓴다. 마크다운은 문단 안의 한 줄 개행을
 * 텍스트 노드에 그대로 남기므로 CSS만으로 살아나고, 그전까지 다섯 화면이 평문을 그리던
 * 방식이 정확히 이것이라 **기존 폼의 설명이 그대로 보인다**(의존성도 늘지 않는다).
 */

const COMPONENTS: Components = {
  p: (props) => <p className="my-[3px] whitespace-pre-line first:mt-0 last:mb-0" {...props} />,
  ul: (props) => <ul className="my-[3px] list-disc pl-[18px]" {...props} />,
  ol: (props) => <ol className="my-[3px] list-decimal pl-[18px]" {...props} />,
  li: (props) => <li className="whitespace-pre-line" {...props} />,
  code: (props) => <code className="rounded-[4px] bg-black/5 px-[4px] py-[1px]" {...props} />,
  /*
   * 제목은 안내 문구 안에서 크기로 튀지 않게 굵기만 준다. 문항 카드 안에 h1이 들어가면
   * 질문 문구보다 커져 무엇이 질문인지 흐려진다.
   */
  h1: (props) => <p className="my-[3px] font-semibold" {...props} />,
  h2: (props) => <p className="my-[3px] font-semibold" {...props} />,
  h3: (props) => <p className="my-[3px] font-semibold" {...props} />,
  blockquote: (props) => (
    <blockquote className="my-[3px] border-l-2 border-line pl-[8px]" {...props} />
  ),
  a: ({ href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-all text-accent underline underline-offset-2"
      {...props}
    />
  ),
  // 이미지는 그리지 않고 대체 텍스트만 남긴다 — 위 머리말 참조
  img: ({ alt }: ComponentPropsWithoutRef<"img">) => <span>{alt}</span>,
};

/**
 * 폼 안내 문구를 마크다운으로 그린다. 비어 있거나 공백뿐이면 **아무것도 그리지 않는다** —
 * 부르는 쪽마다 `{desc && ...}`를 적으면 한 곳에서 빠뜨려 빈 자리가 생긴다.
 */
export function FormDescription({
  children,
  className,
}: {
  children: string | null | undefined;
  className?: string;
}) {
  if (!children || !children.trim()) {
    return null;
  }

  return (
    <div className={cn("break-words", className)}>
      <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
    </div>
  );
}
