/*
 * 배포 환경 표식 (ssccops#291 · ssccops-web#413).
 *
 * 세 앱(www·admin·lms)이 탭·홈 화면에서 dev와 prod로 갈리게 하는 값을 한 벌로 만든다 —
 * 파비콘·apple-touch-icon 경로, `<title>` 앞 `[DEV] `, manifest 이름 뒤 ` (dev)`.
 * 아이콘 파일 자체는 `scripts/icons/generate-icons.py`가 `apps/<app>/public/icons/{prod,dev}/`에
 * 만들어 둔 것이고, 여기서는 **그중 어느 폴더를 가리킬지만** 정한다.
 *
 * ── 판정 ──────────────────────────────────────────────────
 * `NEXT_PUBLIC_DEPLOY_ENV === "dev"`면 dev, 그 밖은 전부(없음 포함) prod. 변수를 잊으면
 * dev가 prod 아이콘으로 보일 뿐 반대는 없다 — prod에는 아무것도 넣지 않는다.
 *
 * ── 함정: 값은 앱이 읽어서 넘긴다 ──────────────────────────
 * 이 함수는 `process.env`를 **직접 읽지 않는다.** `NEXT_PUBLIC_*`은 Next가 빌드 때
 * `process.env.NEXT_PUBLIC_DEPLOY_ENV`라는 **글자 그대로의 표현**을 값으로 바꿔 끼우는
 * 방식이라, 앱이 컴파일하는 파일에 그 표현이 적혀 있어야 한다. 이 패키지 안에서 읽으면
 * 인라인을 못 받아 빈 값이 되고, 그러면 dev 워커도 조용히 prod로 보인다.
 * 그래서 호출은 각 앱 `src/app/layout.tsx`·`manifest.ts`에서 이렇게 한다:
 *
 *     const DEPLOY = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV);
 */

export type DeployEnv = "prod" | "dev";

/** `MetadataRoute.Manifest["icons"]`에 그대로 들어가는 모양 — next 타입에 기대지 않으려고 따로 적었다 */
export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: "any" | "maskable";
}

export interface DeployMarks {
  env: DeployEnv;
  isDev: boolean;
  /** `metadata.icons`에 그대로. `icon`이 있어야 `src/app/favicon.ico` 파일 규약 없이 탭 아이콘이 뜬다 */
  icons: { icon: string; apple: string };
  /** manifest `icons`에 그대로 — 192·512·maskable·ico */
  manifestIcons: ManifestIcon[];
  /** `<title>` — dev면 `[DEV] ` 접두. `title.template`의 `%s`는 그대로 두면 된다 */
  title: (base: string) => string;
  /** manifest `name`·`short_name` — dev면 ` (dev)` 접미 */
  name: (base: string) => string;
}

export function deployEnv(raw: string | undefined): DeployEnv {
  return raw === "dev" ? "dev" : "prod";
}

export function deployMarks(raw: string | undefined): DeployMarks {
  const env = deployEnv(raw);
  const isDev = env === "dev";
  const dir = `/icons/${env}`;
  return {
    env,
    isDev,
    icons: { icon: `${dir}/favicon.ico`, apple: `${dir}/apple-touch-icon.png` },
    manifestIcons: [
      { src: `${dir}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${dir}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: `${dir}/icon-512-maskable.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: `${dir}/favicon.ico`, sizes: "any", type: "image/x-icon" },
    ],
    title: (base) => (isDev ? `[DEV] ${base}` : base),
    name: (base) => (isDev ? `${base} (dev)` : base),
  };
}
