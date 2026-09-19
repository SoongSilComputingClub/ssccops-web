import Markdoc from "@markdoc/markdoc";
import React from "react";
import { MARKDOC_COMPONENTS } from "./components";
import { CONTENT_MARKDOC_CONFIG } from "./schema";

/**
 * 콘텐츠 본문(페이지·포스트) 렌더러 — Markdoc (ADR-0039 · ssccops#390).
 *
 * www의 공개 화면과 admin의 미리보기가 **이 하나**를 쓴다 — 편집기에서 본 것이 곧 화면이다.
 * 행사 본문은 여전히 `Markdown`(react-markdown)이다 — lms와 공유하고 레이아웃 태그가 필요 없다.
 *
 * 검증 오류가 있어도 그린다 — 모르는 태그는 안쪽이 평문으로 나온다(Markdoc 기본). 저장 전에
 * 막는 것은 편집기의 몫(`validateContentMarkdoc`).
 */
export function ContentMarkdoc({ children }: Readonly<{ children: string }>) {
  const ast = Markdoc.parse(children);
  const content = Markdoc.transform(ast, CONTENT_MARKDOC_CONFIG);
  return (
    <div className="markdoc text-ink">
      {Markdoc.renderers.react(content, React, { components: MARKDOC_COMPONENTS })}
    </div>
  );
}
