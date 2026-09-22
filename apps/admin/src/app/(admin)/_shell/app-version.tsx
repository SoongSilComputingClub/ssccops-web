/*
 * 지금 보고 있는 버전 (ssccops#229).
 *
 * 운영진이 문의할 때 "어느 버전을 보고 계세요"를 물을 수 있게 하는 것이 전부라, 사이드바·드로어
 * 맨 아래에 회색 작은 글씨로만 둔다. 값은 `next.config.ts`가 `package.json`에서 주입한다 —
 * 릴리스에서 고칠 곳이 `package.json` 하나로 끝나게 하려는 것이다.
 *
 * 값이 없으면 아무것도 그리지 않는다. 빈 자리에 `v` 한 글자만 남는 것보다 낫다.
 * `nav-panel.tsx`에 있던 것을 #614에서 뗐다 — 발치가 계정 메뉴로 바뀌며 목록과 발치가 갈렸다.
 */
export function AppVersion({ className = "" }: Readonly<{ className?: string }>) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  if (!version) return null;
  return <div className={`px-[18px] pt-2 pb-1 text-[11.5px] text-n500 ${className}`}>v{version}</div>;
}
