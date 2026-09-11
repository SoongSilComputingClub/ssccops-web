import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/*
 * 본문(Markdown) 렌더러 — wave2 D12. `apps/www`·`apps/lms`가 함께 쓴다 (ssccops#243).
 *
 * 두 앱에 **글자까지 같은 사본**이 있었다. 아래 안전 판단(원시 HTML을 해석하지 않는다)이
 * 두 벌로 있으면 한쪽만 뒤집혀도 아무도 모른다 — 그것이 이 파일을 올린 이유다.
 *
 * **원시 HTML을 해석하지 않는다.** react-markdown 은 기본으로 HTML 을 글자 그대로 두고,
 * 해석하려면 `rehype-raw` 를 따로 붙여야 한다 — 그 플러그인을 쓰지 않는 것이 여기서의 안전
 * 장치 전부다. 본문은 운영진이 쓰지만 그렇다고 신뢰 경계가 사라지지는 않는다(계정 하나가
 * 털리면 공개 도메인 전체에 스크립트를 심을 수 있는 자리다). 나중에 누군가 "표가 안 그려져요"
 * 같은 이유로 rehype-raw 를 붙이면 이 결정이 조용히 뒤집히므로, 그때는 sanitize 를 함께 건다.
 *
 * 링크는 새 탭으로 열고 `rel="noreferrer"` 를 붙인다 — 본문에 적히는 링크는 대개 외부
 * 신청 안내·지도라 현재 탭을 뺏지 않는 편이 낫고, 새 탭은 opener 를 끊어 두는 것이 기본이다.
 */

/*
 * 제목 요소가 비어 보이는 것은 오탐이다 (#401 · S6850). react-markdown이 `props.children`으로
 * 제목 글자를 넘기고 `{...props}`가 그것을 그대로 펼친다 — 정적 분석은 펼침 안의 children을
 * 보지 못한다. 마크다운의 `#`이 `<h2>`부터 시작하는 것은 화면 제목(`<h1>`)이 본문 밖에 있어서다.
 */
const COMPONENTS: Components = {
  h1: (props) => <h2 className="mt-[26px] mb-[8px] text-[20px] font-semibold" {...props} />,
  h2: (props) => <h3 className="mt-[24px] mb-[8px] text-[18px] font-semibold" {...props} />,
  h3: (props) => <h4 className="mt-[20px] mb-[6px] text-[16px] font-semibold" {...props} />,
  p: (props) => <p className="my-[10px] text-[15px] leading-[1.75]" {...props} />,
  ul: (props) => <ul className="my-[10px] list-disc pl-[20px] leading-[1.8]" {...props} />,
  ol: (props) => <ol className="my-[10px] list-decimal pl-[20px] leading-[1.8]" {...props} />,
  li: (props) => <li className="text-[15px]" {...props} />,
  blockquote: (props) => (
    <blockquote className="my-[12px] border-l-[3px] border-line pl-[12px] text-n300" {...props} />
  ),
  hr: () => <hr className="my-[20px] border-line" />,
  code: (props) => (
    <code className="rounded-[5px] bg-bg px-[5px] py-[1px] font-mono text-[13.5px]" {...props} />
  ),
  pre: (props) => (
    <pre className="my-[12px] overflow-x-auto rounded-xl bg-bg p-[14px] text-[13.5px]" {...props} />
  ),
  a: ({ href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent-strong underline underline-offset-2"
      {...props}
    />
  ),
  // 표가 좁은 화면에서 페이지를 밀지 않게 가로 스크롤 상자에 담는다
  table: (props) => (
    <div className="my-[12px] overflow-x-auto">
      <table className="w-full border-collapse text-[14px]" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-line bg-bg px-[10px] py-[6px] text-left" {...props} />,
  td: (props) => <td className="border border-line px-[10px] py-[6px]" {...props} />,
  /*
   * 본문 이미지도 <img> 그대로 쓴다 — next/image 는 허용 도메인(remotePatterns)을 미리 알아야
   * 하는데, 본문에 적히는 주소는 운영진이 그때그때 붙이는 외부 URL 이라 미리 알 수 없다.
   */
  img: ({ alt, ...props }: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} className="my-[12px] h-auto max-w-full rounded-xl" {...props} />
  ),
};

export function Markdown({ children }: Readonly<{ children: string }>) {
  return (
    <div className="text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
