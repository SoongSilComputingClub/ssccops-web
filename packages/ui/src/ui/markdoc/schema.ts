import Markdoc, { Tag, type Config, type RenderableTreeNode, type Schema } from "@markdoc/markdoc";

/*
 * 콘텐츠 본문(페이지·포스트)의 Markdoc 스키마 — 노드 모양과 레이아웃 태그 5종 (ADR-0039 · ssccops#390).
 *
 * ── 왜 Markdoc인가 ──────────────────────────────────────────
 * 본문은 홍보국이 어드민에서 쓰고 www가 익명에게 그린다. 레이아웃(카드 격자·FAQ·단계·타임라인)을
 * **라우트별 프리셋**으로 만들었더니(web#527) 같은 글이 어느 주소에 있느냐로 모양이 정해지고, 어느
 * 절이 카드가 되는지는 코드의 규칙(«`###` 둘 이상이면 타일»)이 정해 글쓴이에게 보이지 않았다.
 * Markdoc은 레이아웃을 **글 안의 태그**로 적는다 — 어드민 미리보기와 www가 이 파일 하나로 같은
 * 것을 그린다. 원시 HTML은 Markdoc이 기본으로 해석하지 않으므로(글자로 나간다) ADR-0038의 보안
 * 경계는 그대로다.
 *
 * ── 태그는 «감싸기»다 ───────────────────────────────────────
 * 태그 안의 구조는 여전히 마크다운(제목·문단·목록)이고, 태그의 transform이 **제목에서 자른다.**
 * `{% cards %}` 안의 `## 도전` + 문단이 카드 하나, `{% faq %}` 안의 `### 질문` + 답이 항목 하나,
 * `{% timeline %}` 안의 `## 1983` + 목록이 연도 하나다. 속성으로 제목을 따로 적게 하지 않는 것은
 * 이미 쓰던 글을 태그로 감싸기만 하면 되게 하려는 것이다. 태그가 기대하는 구조가 아니면(제목이
 * 없다 · `steps`에 번호 목록이 없다) **안을 그대로 그린다** — 글이 사라지지 않는다.
 *
 * ── 제목 단계 ──────────────────────────────────────────────
 * `#`은 `<h2>`부터다 — 화면 제목(`<h1>`)이 본문 밖에 있다. 태그가 자르는 기준은 «제목이면 무엇이든»
 * 이라 `##`을 쓰든 `###`을 쓰든 같다.
 *
 * ── 스타일 ────────────────────────────────────────────────
 * 클래스는 Tailwind 유틸리티이고 색은 토큰 이름(`bg-accent-soft` 등)이다 — 세 앱의 `@theme`이 같은
 * 이름을 정의한다. 이 패키지는 각 앱 `globals.css`의 `@source`로 훑힌다(#316 함정 — 새 앱이면 그
 * 줄부터).
 */

const HEADING = /^h[1-6]$/;

/**
 * 기본 노드 위에 클래스만 얹는다. 기본 노드 대부분(문단·항목·인용·표 칸)은 `transform`이 없고
 * `render` 이름만 있다 — 그때는 같은 모양의 Tag를 직접 만든다(없다고 null로 떨어뜨리면 문단이
 * 통째로 사라진다 · #532에서 한 번 그랬다).
 */
function styled(name: keyof typeof Markdoc.nodes, className: string): Schema {
  const base = Markdoc.nodes[name] as Schema;
  return {
    ...base,
    transform(node, config) {
      if (base.transform) {
        const out = base.transform(node, config);
        if (out instanceof Tag) out.attributes = { ...out.attributes, className };
        return out;
      }
      return new Tag(
        String(base.render),
        { ...node.transformAttributes(config), className },
        node.transformChildren(config),
      );
    },
  };
}

/** Tag 하나의 글자만 모은다 — 카드 제목·FAQ 질문·연도 (제목에 강조가 있어도 글자만 남는다) */
function textOf(node: RenderableTreeNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node instanceof Tag) return node.children.map(textOf).join("");
  return "";
}

/** 제목 Tag에서 잘라 «제목 + 그 아래 본문» 묶음으로 — 첫 제목 앞의 것은 `lead` */
function splitAtHeadings(children: RenderableTreeNode[]): {
  lead: RenderableTreeNode[];
  groups: { title: string; body: RenderableTreeNode[] }[];
} {
  const lead: RenderableTreeNode[] = [];
  const groups: { title: string; body: RenderableTreeNode[] }[] = [];
  for (const child of children) {
    if (child instanceof Tag && HEADING.test(child.name)) {
      groups.push({ title: textOf(child), body: [] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].body.push(child);
    } else {
      lead.push(child);
    }
  }
  return { lead, groups };
}

/** 태그가 기대하는 구조가 아닐 때 — 안을 그대로 */
function plain(children: RenderableTreeNode[]): Tag {
  return new Tag("div", {}, children);
}

/* ── 노드 ──────────────────────────────────────────────────── */

export const nodes: Config["nodes"] = {
  heading: {
    ...Markdoc.nodes.heading,
    transform(node, config) {
      const level = Math.min(Number(node.attributes.level) + 1, 6);
      const className =
        level === 2
          ? "mt-[26px] mb-[8px] text-[20px] font-semibold"
          : level === 3
            ? "mt-[24px] mb-[8px] text-[18px] font-semibold"
            : "mt-[20px] mb-[6px] text-[16px] font-semibold";
      return new Tag(`h${level}`, { className }, node.transformChildren(config));
    },
  },
  paragraph: styled("paragraph", "my-[10px] text-[15px] leading-[1.75]"),
  list: {
    ...Markdoc.nodes.list,
    transform(node, config) {
      const ordered = Boolean(node.attributes.ordered);
      return new Tag(
        ordered ? "ol" : "ul",
        { className: `my-[10px] ${ordered ? "list-decimal" : "list-disc"} pl-[20px] leading-[1.8]` },
        node.transformChildren(config),
      );
    },
  },
  item: styled("item", "text-[15px]"),
  blockquote: styled("blockquote", "my-[12px] border-l-[3px] border-line pl-[12px] text-n300"),
  hr: styled("hr", "my-[20px] border-line"),
  code: styled("code", "rounded-[5px] bg-bg px-[5px] py-[1px] font-mono text-[13.5px]"),
  fence: {
    ...Markdoc.nodes.fence,
    transform(node) {
      return new Tag(
        "pre",
        { className: "my-[12px] overflow-x-auto rounded-xl bg-bg p-[14px] text-[13.5px]" },
        [new Tag("code", {}, [String(node.attributes.content ?? "")])],
      );
    },
  },
  // 본문 링크는 대개 외부 안내·지도라 새 탭으로, opener는 끊는다 — `Markdown`과 같은 판단
  link: {
    ...Markdoc.nodes.link,
    transform(node, config) {
      return new Tag(
        "a",
        {
          href: node.attributes.href,
          title: node.attributes.title,
          target: "_blank",
          rel: "noreferrer",
          className: "text-accent-strong underline underline-offset-2",
        },
        node.transformChildren(config),
      );
    },
  },
  // 본문 이미지는 <img> 그대로 — 주소가 운영진이 그때그때 붙이는 외부 URL이라 next/image가 못 안다
  image: {
    ...Markdoc.nodes.image,
    transform(node) {
      return new Tag("img", {
        src: node.attributes.src,
        alt: node.attributes.alt ?? "",
        title: node.attributes.title,
        className: "my-[12px] h-auto max-w-full rounded-xl",
      });
    },
  },
  // 표는 좁은 화면에서 페이지를 밀지 않게 가로 스크롤 상자에. 격자선 대신 줄 사이 하늘선
  table: {
    ...Markdoc.nodes.table,
    transform(node, config) {
      const table = new Tag(
        "table",
        { className: "w-full border-collapse text-[14.5px]" },
        node.transformChildren(config),
      );
      return new Tag("div", { className: "my-[12px] overflow-x-auto" }, [table]);
    },
  },
  th: styled(
    "th",
    "border-b border-line bg-bg px-[12px] py-[9px] text-left text-[13px] font-medium whitespace-nowrap text-n400 first:rounded-l-[8px] last:rounded-r-[8px]",
  ),
  td: styled("td", "border-b border-line px-[12px] py-[9px] align-top"),
};

/* ── 태그 5종 ──────────────────────────────────────────────── */

const callout: Schema = {
  render: "Callout",
  attributes: { tone: { type: String, default: "info", matches: ["info", "warn"] } },
};

const cards: Schema = {
  render: "Cards",
  attributes: { columns: { type: Number, default: 3 } },
  transform(node, config) {
    const { lead, groups } = splitAtHeadings(node.transformChildren(config));
    if (groups.length === 0) return plain(lead);
    const items = groups.map(
      (g, i) => new Tag("Card", { index: i + 1, title: g.title }, g.body),
    );
    // 2열 아니면 3열 — 그 밖의 값은 3
    const columns = Number(node.attributes.columns) === 2 ? 2 : 3;
    const grid = new Tag("Cards", { columns }, items);
    return lead.length > 0 ? new Tag("div", {}, [...lead, grid]) : grid;
  },
};

const faq: Schema = {
  render: "Faq",
  transform(node, config) {
    const { lead, groups } = splitAtHeadings(node.transformChildren(config));
    if (groups.length === 0) return plain(lead);
    const items = groups.map((g) => new Tag("FaqItem", { question: g.title }, g.body));
    const list = new Tag("Faq", {}, items);
    return lead.length > 0 ? new Tag("div", {}, [...lead, list]) : list;
  },
};

const steps: Schema = {
  render: "Steps",
  transform(node, config) {
    const children = node.transformChildren(config);
    const at = children.findIndex((c) => c instanceof Tag && c.name === "ol");
    if (at < 0) return plain(children);
    const ol = children[at] as Tag;
    const items = ol.children
      .filter((c): c is Tag => c instanceof Tag && c.name === "li")
      .map((li, i) => new Tag("Step", { index: i + 1 }, li.children));
    const list = new Tag("Steps", {}, items);
    return new Tag("div", {}, [...children.slice(0, at), list, ...children.slice(at + 1)]);
  },
};

const timeline: Schema = {
  render: "Timeline",
  transform(node, config) {
    const { lead, groups } = splitAtHeadings(node.transformChildren(config));
    if (groups.length === 0) return plain(lead);
    const entries = groups.map(
      (g) => new Tag("TimelineEntry", { title: g.title }, g.body.map(timelineList)),
    );
    const list = new Tag("Timeline", {}, entries);
    return lead.length > 0 ? new Tag("div", {}, [...lead, list]) : list;
  },
};

/** 타임라인 안의 목록은 점 대신 세로선 위의 작은 점 — 목록 노드를 그 모양으로 바꿔 단다 */
function timelineList(node: RenderableTreeNode): RenderableTreeNode {
  if (!(node instanceof Tag) || node.name !== "ul") return node;
  const items = node.children.map((li) =>
    li instanceof Tag && li.name === "li"
      ? new Tag("li", { className: "relative py-[3px] text-[15px]" }, [
          new Tag("span", {
            "aria-hidden": true,
            className:
              "absolute -left-[30px] top-[0.85em] h-[8px] w-[8px] rounded-full bg-line-strong",
          }),
          ...li.children,
        ])
      : li,
  );
  return new Tag(
    "ul",
    { className: "my-[4px] ml-[5px] list-none border-l-2 border-line-strong py-[6px] pl-[25px] leading-[1.8]" },
    items,
  );
}

export const tags: Config["tags"] = { callout, cards, faq, steps, timeline };

export const CONTENT_MARKDOC_CONFIG: Config = { nodes, tags };

/** 편집기 삽입 버튼이 넣는 본보기 — 태그 이름과 함께 «안에 무엇을 쓰는가»를 보여 준다 */
export const CONTENT_TAG_SNIPPETS: readonly { label: string; snippet: string }[] = [
  { label: "안내 상자", snippet: '{% callout tone="info" %}\n안내 문장\n{% /callout %}\n' },
  {
    label: "카드",
    snippet: "{% cards columns=3 %}\n## 제목 하나\n한 줄 설명\n\n## 제목 둘\n한 줄 설명\n{% /cards %}\n",
  },
  { label: "단계", snippet: "{% steps %}\n1. **첫 단계** — 설명\n2. **둘째 단계** — 설명\n{% /steps %}\n" },
  { label: "FAQ", snippet: "{% faq %}\n### 질문?\n답.\n\n### 다음 질문?\n답.\n{% /faq %}\n" },
  { label: "연혁", snippet: "{% timeline %}\n## 1983 — 창단\n- 4월 — 무슨 일\n\n## 1984\n- 3월 — 무슨 일\n{% /timeline %}\n" },
];
