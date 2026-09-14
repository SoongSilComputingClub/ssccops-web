/*
 * 헤더·사이드바의 브랜드 마크 (ssccops-web#449 · ssccops#337).
 *
 * 세 앱이 같은 자리에 테두리 상자에 «S» 한 글자를 그리고 있었다 — ssccops#290이 앱마다 색을
 * 가르고 dev에는 호박색 모서리를 붙인 아이콘을 만들어 두고도 탭·홈 화면에서만 썼다. 이제
 * 화면 안에서도 그 아이콘이다. 그래서 **dev에서는 헤더에도 호박색 모서리가 보인다** — 어느
 * 환경을 보고 있는지 화면 안에서 아는 것이 의도다.
 *
 * `src`는 앱이 `deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV).mark`로 넘긴다 — 이 패키지 안에서
 * env를 읽으면 Next의 인라인을 못 받는다(`lib/deploy-env.ts` 주석). `<img>`인 것은 `next/image`를
 * 쓰지 않는 플랫폼 중립 규칙(ADR-0030) 때문이고, 192px 파일 하나를 26~28px로 내리는 것이라
 * 최적화할 것도 없다. 아이콘은 흰 바탕 타일이라 다크모드에서도 앱 아이콘처럼 보인다 — 투명
 * 마크를 따로 만들면 www의 진회색 마크가 어두운 바탕에서 사라진다.
 */
export function BrandMark({
  src,
  size = 26,
  radius = 7,
  className = "",
}: Readonly<{
  src: string;
  /** 한 변 px — admin 사이드바 28·30, www·lms 헤더 26, 로그인·동의 화면 34 */
  size?: number;
  /** 모서리 px — 헤더 7, 로그인·동의 화면 12 (옛 «S» 상자와 같은 값) */
  radius?: number;
  className?: string;
}>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image 금지(ADR-0030), 192px 파일 하나
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      className={`flex-none border border-[var(--color-line)] ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    />
  );
}
