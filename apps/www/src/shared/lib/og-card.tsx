import type { ImageResponse } from "next/og";
import { deployMarks } from "@ssccops/ui";
import { OG_IMAGE_SIZE } from "@/shared/config/og-cards";

/*
 * 공유 카드(OG 이미지)의 공통 뼈대 — 마크 + 머리글 + 제목 + 부제 + 바닥글, 1200×630 (#602).
 *
 * 공개 폼 카드(`f/[formId]/og` · ssccops#361)가 먼저 있었고 사이트 기본 카드(`/og` · #602)가
 * 같은 그림을 그리게 되어 자산 로딩·틀을 여기로 올렸다 — 라우트마다 사본을 두면 «같은 동아리
 * 링크로 보인다»는 목적이 한쪽만 손볼 때 깨진다. 라우트는 문구를 정하고 이 틀에 넣는다.
 *
 * **폰트·마크는 자기 origin의 정적 자산을 HTTP로 받는다.** Satori는 시스템 폰트를 쓰지 않고
 * 바이트를 받는데, Next 문서의 `fetch(new URL("./font", import.meta.url))`은 Workers에서 `file://`로
 * 풀려 못 쓴다. HTTP로 받으면 Vercel·Cloudflare 어느 쪽이든 같은 뜻이다(ADR-0030). 받은 바이트는
 * 모듈 변수에 두어 같은 인스턴스에서는 한 번만 받는다. `ImageResponse`는 Node 런타임 라우트에서
 * 만들므로(`runtime = "nodejs"`) 여기서는 타입만 가져온다.
 *
 * **시간에 따라 변하는 값(접수 기간·마감)은 그리지 않는다.** 메신저는 이미지도 한 번 캐싱하면
 * 갱신하지 않아, 담으면 마감된 뒤에도 «접수 중»이라 말하는 그림이 방에 남는다(ssccops#194).
 */

const FONT_PATH = "/fonts/pretendard-semibold-ko.otf";
/*
 * 머리글의 동아리 마크는 탭·홈 화면 아이콘과 같은 파일(`deployMarks().mark`, #449)이다 — dev 배포는
 * dev 마크가 뜬다. `process.env.NEXT_PUBLIC_DEPLOY_ENV`를 여기서 글자 그대로 읽는 것은 layout.tsx와
 * 같은 이유다(패키지 안에서 읽으면 인라인을 못 받는다).
 */
const MARK_PATH = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV).mark;

const assetCache = new Map<string, Promise<ArrayBuffer>>();

/**
 * 자기 origin의 정적 자산을 받아 모듈 변수에 둔다 — 같은 인스턴스에서는 한 번만 받는다.
 * `origin`은 `requestOrigin(request)`로 넘긴다 — `request.url`의 오리진은 컨테이너에서
 * `0.0.0.0:3000`이라 받으러 나가지 못한다(#696).
 */
function loadAsset(origin: string, path: string): Promise<ArrayBuffer> {
  let cached = assetCache.get(path);
  if (!cached) {
    cached = fetch(`${origin}${path}`, { cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`${path} ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((error: unknown) => {
        // 실패는 캐시에 남기지 않는다 — 예전에는 `!res.ok`만 지워서 연결 자체의 실패(거절·TLS·DNS)가
        // 그대로 남았다. 인스턴스가 오래 사는 컨테이너에서는 한 번의 실패가 재시작까지 간다(#696)
        assetCache.delete(path);
        throw error;
      });
    assetCache.set(path, cached);
  }
  return cached;
}

/** Satori의 <img>는 URL을 다시 받으러 나가므로 data URI로 건넨다 */
function toDataUri(png: ArrayBuffer): string {
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
}

export interface OgCardAssets {
  fontData: ArrayBuffer | null;
  markData: ArrayBuffer | null;
}

/** 폰트·마크 — 둘 다 없어도 카드는 뜬다: 폰트가 없으면 한글이 □로, 마크가 없으면 글자 상자로 */
export async function loadOgCardAssets(origin: string): Promise<OgCardAssets> {
  const [fontData, markData] = await Promise.all([
    loadAsset(origin, FONT_PATH).catch(() => null),
    loadAsset(origin, MARK_PATH).catch(() => null),
  ]);
  return { fontData, markData };
}

type ImageResponseOptions = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>;

/** `new ImageResponse(tree, options)`의 둘째 인자 — 크기·폰트·캐시 헤더가 카드마다 같다 */
export function ogCardResponseOptions(assets: OgCardAssets): ImageResponseOptions {
  return {
    ...OG_IMAGE_SIZE,
    fonts: assets.fontData
      ? [{ name: "Pretendard", data: assets.fontData, weight: 600, style: "normal" }]
      : undefined,
    headers: {
      // 같은 카드는 같은 그림 — 크롤러가 여러 번 와도 하루는 그대로 준다
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  };
}

interface OgCardFrameProps {
  readonly assets: OgCardAssets;
  /** 마크 옆 한 줄 — 어느 동아리·어느 축인가 */
  readonly header: string;
  readonly title: string;
  readonly description: string;
  readonly footer: string;
}

/** Satori가 그리는 트리 — flex만 쓴다(Satori는 CSS 일부만 안다) */
export function OgCardFrame({ assets, header, title, description, footer }: OgCardFrameProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        color: "#f8fafc",
        fontFamily: "Pretendard",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, opacity: 0.85 }}>
        {assets.markData ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori 트리라 next/image가 아니다
          <img
            src={toDataUri(assets.markData)}
            width={56}
            height={56}
            alt=""
            style={{ borderRadius: 14 }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#38bdf8",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            S
          </div>
        )}
        <span>{header}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 68, lineHeight: 1.25, letterSpacing: -1 }}>{title}</div>
        <div style={{ fontSize: 32, lineHeight: 1.4, opacity: 0.8 }}>{description}</div>
      </div>
      <div style={{ display: "flex", fontSize: 26, opacity: 0.6 }}>{footer}</div>
    </div>
  );
}
