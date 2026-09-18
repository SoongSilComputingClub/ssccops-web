import { ImageResponse } from "next/og";
import { toShareDescription } from "@ssccops/share-meta";
import { deployMarks } from "@ssccops/ui";
import { fetchPublicFormMeta, isFormRef } from "@/entities/form";

/**
 * 공개 폼 공유 카드 이미지 (ssccops#361) — `GET /f/{ref}/og`, 1200×630 PNG.
 *
 * 크롤러가 `og:image`를 요청하는 순간 제목·안내를 그려 준다. 폼마다 이미지를 만들어 둘 필요가
 * 없고, 데이터는 `generateMetadata`가 쓰는 익명 meta와 같다 — 그래서 새로 새는 것도 없다.
 *
 * **접수 상태·마감일은 그리지 않는다.** 메신저는 이미지도 한 번 캐싱하면 갱신하지 않아, 담으면
 * 마감된 뒤에도 «모집 중»이라 말하는 그림이 방에 남는다(ssccops#194). 제목과 안내 문구만.
 *
 * **폰트는 자기 origin의 `/fonts/…`를 fetch한다.** Satori는 시스템 폰트를 쓰지 않고 바이트를
 * 받는데, Next 문서의 `fetch(new URL("./font", import.meta.url))`은 Workers에서 `file://`로 풀려
 * 못 쓴다. 정적 자산을 HTTP로 받으면 Vercel·Cloudflare 어느 쪽이든 같은 뜻이다(ADR-0030). 받은
 * 바이트는 모듈 변수에 두어 같은 인스턴스에서는 한 번만 받는다.
 *
 * meta가 없으면(DRAFT·없는 폼·서버 불통) 서비스 기본 카드를 그린다 — 404를 내면 메신저가 이미지
 * 없는 카드를 만드는데, 그것과 기본 카드 중 후자가 낫고 «없는 폼»을 이미지로 구별해 줄 이유는
 * 없다(meta 경로가 DRAFT와 없는 폼을 나누지 않는 것과 같은 자리).
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

/** 자기 origin의 정적 자산을 받아 모듈 변수에 둔다 — 같은 인스턴스에서는 한 번만 받는다 */
function loadAsset(origin: string, path: string): Promise<ArrayBuffer> {
  let cached = assetCache.get(path);
  if (!cached) {
    cached = fetch(`${origin}${path}`, { cache: "force-cache" }).then((res) => {
      if (!res.ok) {
        assetCache.delete(path);
        throw new Error(`${path} ${res.status}`);
      }
      return res.arrayBuffer();
    });
    assetCache.set(path, cached);
  }
  return cached;
}

/** Satori의 <img>는 URL을 다시 받으러 나가므로 data URI로 건넨다 */
function toDataUri(png: ArrayBuffer): string {
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
}

/** 제목이 길면 두 줄까지만 — 세 줄부터는 카드에서 잘린다 */
function clampTitle(title: string): string {
  return title.length > 44 ? `${title.slice(0, 43)}…` : title;
}

export async function GET(request: Request, context: RouteContext<"/f/[formId]/og">) {
  const { formId } = await context.params;
  const origin = new URL(request.url).origin;

  const meta = isFormRef(formId) ? await fetchPublicFormMeta(formId) : null;
  const title = meta ? clampTitle(meta.formTtlNm) : "SSCC 신청서";
  const description = meta?.pageDescCn
    ? toShareDescription(meta.pageDescCn)
    : "숭실컴퓨팅클럽(SSCC) 신청서입니다";

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
          <span>SSCC 숭실컴퓨팅클럽</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, lineHeight: 1.25, letterSpacing: -1 }}>{title}</div>
          <div style={{ fontSize: 32, lineHeight: 1.4, opacity: 0.8 }}>{description}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.6 }}>신청서 · 로그인하면 바로 작성할 수 있습니다</div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: fontData
        ? [{ name: "Pretendard", data: fontData, weight: 600, style: "normal" }]
        : undefined,
      headers: {
        // 같은 폼은 같은 그림 — 크롤러가 여러 번 와도 하루는 그대로 준다
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
