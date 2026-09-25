import { ImageResponse } from "next/og";
import { requestOrigin } from "@ssccops/auth";
import { deployMarks } from "@ssccops/ui";
import { OG_CARDS, resolveOgCard } from "@/shared/config/og-cards";

/**
 * 학술 앱 공유 카드 이미지 (#556 · ssccops#418) — `GET /og?card=default|proposal`, 1200×630 PNG.
 *
 * LMS 링크를 메신저에 붙이면 제목·설명만 뜨고 이미지가 없었다. 기획안 제출 링크는 학기 초마다
 * 부원 전체에게 나가는 링크라, www 공개 폼 카드(ssccops#361 · `f/[formId]/og/route.tsx`)와 같은
 * 모양이어야 같은 동아리 링크로 보인다. 두 앱은 소스를 공유하지 않으므로 뼈대를 그대로 옮겼다.
 *
 * **파일 규약(`opengraph-image.tsx`)이 아니라 라우트다.** 파일 규약은 세그먼트마다 파일 하나이고
 * 요청 시점의 env·쿼리로 갈릴 수 없다 — 카드 둘을 위해 파일 둘을 두면 마크·폰트 로딩이 두 벌이
 * 되고, 헤더 마크가 `deployMarks()`로 dev·prod가 갈리는 것(#449 · 아래 `MARK_PATH`)은 한 라우트가
 * 쿼리로 카드를 고르는 쪽이 자연스럽다(favicon 파일 규약을 걷어낸 #413과 같은 이유).
 *
 * **카드는 허용 목록(`OG_CARDS`)에서만 고른다.** 쿼리의 문자열을 그대로 그리지 않는다 — 우리
 * 마크 아래 아무 문장이나 얹은 그림을 누구든 만들 수 있게 된다. 모르는 키는 기본 카드.
 *
 * **시간에 따라 변하는 값(접수 기간·마감)은 그리지 않는다.** 메신저는 이미지도 한 번 캐싱하면
 * 갱신하지 않아, 담으면 마감된 뒤에도 «접수 중»이라 말하는 그림이 방에 남는다(ssccops#194).
 *
 * **폰트는 자기 origin의 `/fonts/…`를 fetch한다.** Satori는 시스템 폰트를 쓰지 않고 바이트를
 * 받는데, Next 문서의 `fetch(new URL("./font", import.meta.url))`은 Workers에서 `file://`로 풀려
 * 못 쓴다. 정적 자산을 HTTP로 받으면 Vercel·Cloudflare 어느 쪽이든 같은 뜻이다(ADR-0030). 받은
 * 바이트는 모듈 변수에 두어 같은 인스턴스에서는 한 번만 받는다. 폰트 파일은 www의 것을 복사해
 * 두었다(`public/fonts` — 앱은 정적 자산을 공유하지 않는다).
 */

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;
const FONT_PATH = "/fonts/pretendard-semibold-ko.otf";
/*
 * 헤더의 동아리 마크는 탭·홈 화면 아이콘과 같은 파일(`deployMarks().mark`, #449)이다 — dev 배포는
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const card = OG_CARDS[resolveOgCard(url.searchParams.get("card"))];
  const origin = requestOrigin(request);

  // 둘 다 없어도 카드는 뜬다 — 폰트가 없으면 한글이 □로, 마크가 없으면 글자 상자로
  const [fontData, markData] = await Promise.all([
    loadAsset(origin, FONT_PATH).catch(() => null),
    loadAsset(origin, MARK_PATH).catch(() => null),
  ]);

  return new ImageResponse(
    (
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
          {markData ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori 트리라 next/image가 아니다
            <img src={toDataUri(markData)} width={56} height={56} alt="" style={{ borderRadius: 14 }} />
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
          <span>SSCC 숭실컴퓨팅클럽 · 학술</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, lineHeight: 1.25, letterSpacing: -1 }}>{card.title}</div>
          <div style={{ fontSize: 32, lineHeight: 1.4, opacity: 0.8 }}>{card.description}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.6 }}>{card.footer}</div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: fontData
        ? [{ name: "Pretendard", data: fontData, weight: 600, style: "normal" }]
        : undefined,
      headers: {
        // 같은 카드는 같은 그림 — 크롤러가 여러 번 와도 하루는 그대로 준다
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
