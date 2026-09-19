/*
 * 올리기 전 이미지 축소 (#521 — 갤러리는 원본을 그대로 보관할 이유가 없다).
 *
 * 긴 변을 `maxEdge`(기본 1600px)로 줄이고 webp로 다시 인코딩한다. 휴대폰 사진 한 장이 4~8MB인데
 * 공개 화면이 그리는 폭은 1600을 넘지 않는다 — 서버 상한(10MB)에 걸리는 일도, 부원이 목록에서
 * 수십 MB를 받는 일도 여기서 막는다. **canvas만 쓴다**(라이브러리 없음) — 세 앱 어디에도 이미지
 * 처리 의존성이 없고, 이 한 자리를 위해 들이면 번들만 는다.
 *
 * ── 원본을 그대로 돌려주는 경우 ──────────────────────────────
 * - 디코딩에 실패했을 때(canvas가 모르는 형식 · 손상 파일) — 판정은 서버가 확장자로 한다.
 * - GIF — canvas는 첫 프레임만 잡아 움직임이 사라진다. 원본을 그대로 보낸다.
 * - webp 인코딩이 안 되거나(`toBlob`이 null · 옛 Safari) 결과가 원본보다 클 때 — 축소가 뜻이 없다.
 *   이때 크기는 줄었을 수 있으나 형식은 원본(`file`)이라 확장자도 원본 것을 쓴다.
 *
 * EXIF 회전은 `createImageBitmap(file, { imageOrientation: "from-image" })`가 적용한다 — 지원하지
 * 않는 브라우저는 `<img>` 경로로 떨어지며 최신 브라우저는 그쪽도 EXIF를 존중한다(CSS
 * `image-orientation: from-image` 기본값).
 */

export interface ResizedImage {
  /** 올릴 바이트 — 축소·재인코딩됐으면 webp, 아니면 원본 파일 그대로 */
  blob: Blob;
  /** 발급 요청에 보낼 확장자(소문자·점 없음) */
  fileExt: string;
  /** 축소가 실제로 일어났는가 — 안내 문구용 */
  resized: boolean;
}

const WEBP = "image/webp";
const DEFAULT_MAX_EDGE = 1600;
/** webp 품질 — 사진 기준 0.85면 눈으로 차이가 없고 용량은 jpeg 원본의 절반 아래다 */
const WEBP_QUALITY = 0.85;

/** 파일명에서 확장자만 뽑는다(점 뒤, 소문자). 못 뽑으면 빈 문자열 — 서버가 형식 오류로 판정하게 둔다 */
export function fileExtOf(file: File): string {
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
}

function original(file: File): ResizedImage {
  return { blob: file, fileExt: fileExtOf(file), resized: false };
}

/** 파일을 그릴 수 있는 비트맵으로 — 실패하면 null(형식을 모르거나 손상) */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* 아래 <img> 경로로 */
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, WEBP, WEBP_QUALITY));
}

export async function resizeImageForUpload(
  file: File,
  maxEdge = DEFAULT_MAX_EDGE,
): Promise<ResizedImage> {
  if (file.type === "image/gif" || fileExtOf(file) === "gif") return original(file);

  const source = await decode(file);
  if (!source) return original(file);

  const width = source.width;
  const height = source.height;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return original(file);

  ctx.drawImage(source, 0, 0, targetW, targetH);
  if ("close" in source) source.close();

  let blob: Blob | null = null;
  try {
    blob = await toBlob(canvas);
  } catch {
    blob = null;
  }

  /* webp가 안 나오거나(옛 Safari) 형식이 다르거나 원본보다 크면 축소가 뜻이 없다 — 원본으로 */
  if (!blob || blob.type !== WEBP || blob.size >= file.size) return original(file);

  return { blob, fileExt: "webp", resized: true };
}
