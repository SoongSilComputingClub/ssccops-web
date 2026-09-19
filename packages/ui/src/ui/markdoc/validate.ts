import Markdoc from "@markdoc/markdoc";
import { CONTENT_MARKDOC_CONFIG } from "./schema";

/*
 * 저장 전 검증 — 모르는 태그·속성, 닫히지 않은 태그를 줄 번호와 함께 (ADR-0039).
 *
 * 문구는 편집기에 그대로 뜬다(루트 AGENTS «화면 문구» — 한 줄 · 사실만). Markdoc의 오류 id를
 * 우리 말로 옮기고, 모르는 id는 Markdoc 문구 그대로 둔다 — 지어내지 않는다.
 */

const MESSAGE: Record<string, (m: string) => string> = {
  "tag-undefined": (m) => `모르는 태그입니다 — ${quoted(m) ?? m}`,
  "attribute-undefined": (m) => `이 태그에 없는 속성입니다 — ${quoted(m) ?? m}`,
  "attribute-value-invalid": (m) => `속성 값이 맞지 않습니다 — ${m}`,
  "attribute-type-invalid": (m) => `속성 값의 형식이 맞지 않습니다 — ${m}`,
  "missing-closing": () => "닫는 태그가 없습니다",
  "parse-error": (m) => `태그 문법이 맞지 않습니다 — ${m}`,
};

function quoted(message: string): string | null {
  const m = /'([^']+)'/.exec(message);
  return m ? `'${m[1]}'` : null;
}

/** 오류 목록 — 비어 있으면 저장해도 된다. 각 줄은 «L줄: 문구» */
export function validateContentMarkdoc(text: string): string[] {
  const ast = Markdoc.parse(text);
  return Markdoc.validate(ast, CONTENT_MARKDOC_CONFIG)
    .filter((e) => e.error.level === "critical" || e.error.level === "error")
    .map((e) => {
      const line = e.lines?.[0] != null ? `L${e.lines[0] + 1}: ` : "";
      const to = MESSAGE[e.error.id];
      return `${line}${to ? to(e.error.message) : e.error.message}`;
    });
}
