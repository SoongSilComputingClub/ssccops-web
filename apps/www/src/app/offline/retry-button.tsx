"use client";

/**
 * «다시 시도» — 지금 주소를 다시 부른다. 워커가 `/offline`을 대신 내준 것이라 주소창은 원래 가려던
 * 화면이고, 연결이 돌아왔으면 그 화면이 뜬다. 서버 컴포넌트인 페이지에 onClick을 둘 수 없어 따로다.
 * 모양은 404 화면의 주 행동 링크와 같다.
 */
export function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-on-solid hover:bg-accent-strong"
    >
      다시 시도
    </button>
  );
}
