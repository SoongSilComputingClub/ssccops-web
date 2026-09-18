"use client";

import type { ContentGalleryImage } from "@/entities/content";
import { FIELD_LABEL } from "@/shared/config/labels";
import { Button, Card, ImagePickButton, Pill, SectionLabel } from "@/shared/ui";

/*
 * 포스트 갤러리 (#521) — 올리기 · 지우기 · 표지 고르기 · 본문에 넣기.
 *
 * 순서 바꾸기는 없다 — 서버에 정렬 컬럼이 없어 발급 순서가 곧 순서다(이슈 «하지 않는 것»).
 *
 * **표지는 갤러리 안에서만 고른다.** 저장 본문의 `coverFileId`가 갤러리에 없는 값이면 서버가
 * 400 COVER_NOT_IN_GALLERY로 거절하므로, 주소 입력란 같은 다른 길을 두지 않는다. 표지를 비우는
 * «표지 해제»는 남긴다 — 한 번 고른 표지를 되돌릴 길이 없으면 잘못 고른 사람이 장을 지워야 한다.
 *
 * 등록 화면(`postId === null`)에서는 잠긴다 — 발급 경로가 `/posts/{postId}/images`라 저장이 먼저다.
 * 감추지 않고 잠근 채 이유를 붙인다(AGENTS.md).
 */

/** 등록 화면에서 갤러리가 잠기는 사유 */
export const NEED_SAVED_POST = "이미지는 저장한 뒤 수정 화면에서 올립니다";

export function ContentGallery({
  gallery,
  coverFileId,
  uploading,
  deletingFileId,
  lock,
  error,
  onPick,
  onDelete,
  onCover,
  onInsert,
}: Readonly<{
  gallery: readonly ContentGalleryImage[];
  coverFileId: number | null;
  uploading: boolean;
  /** 지우는 중인 장 — 그 장의 버튼만 잠근다 */
  deletingFileId: number | null;
  /** 갤러리를 잠글 사유 — 없으면 undefined */
  lock: string | undefined;
  /** 올리기·지우기 실패 한 줄 — 이 자리에 남긴다 */
  error: string | null;
  onPick: (file: File) => void;
  onDelete: (fileId: number) => void;
  /** null이면 표지 해제 */
  onCover: (fileId: number | null) => void;
  onInsert: (imageUrl: string) => void;
}>) {
  return (
    <Card className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SectionLabel>갤러리 · {FIELD_LABEL.contentCover}</SectionLabel>
        <div className="flex-1" />
        <ImagePickButton
          label={uploading ? "올리는 중…" : "이미지 올리기"}
          disabled={uploading || Boolean(lock)}
          hint={lock}
          onPick={onPick}
        />
      </div>
      <div className="mb-3 text-[13px] leading-[1.6] text-n500">
        올리기 전에 긴 변 1600px·webp로 줄입니다. 표지는 갤러리에 있는 이미지 중에서 고릅니다.
        표지 선택은 저장해야 반영됩니다.
      </div>
      {lock && <div className="mb-3 text-[12.5px] text-n500">{lock}</div>}
      {error && <div className="mb-3 text-[12.5px] text-danger">{error}</div>}

      {gallery.length === 0 ? (
        <div className="py-6 text-center text-[13.5px] text-n500">아직 올린 이미지가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {gallery.map((image) => {
            const isCover = image.fileId === coverFileId;
            const deleting = deletingFileId === image.fileId;
            return (
              <div
                key={image.fileId}
                className="flex flex-col gap-2 rounded-[12px] border border-line p-2"
              >
                {/*
                  next/image가 아니라 img인 것은 주소가 서버의 302 리다이렉트라 remotePatterns에
                  미리 적을 수 없기 때문이다(행사 대표 이미지와 같은 판단).
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.imageUrl}
                  alt=""
                  className="aspect-square w-full rounded-[8px] border border-line object-cover"
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  {isCover ? (
                    <>
                      <Pill tone="blue">표지</Pill>
                      <Button variant="link" disabled={deleting} onClick={() => onCover(null)}>
                        표지 해제
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="link"
                      disabled={deleting}
                      onClick={() => onCover(image.fileId)}
                    >
                      표지로
                    </Button>
                  )}
                  <Button
                    variant="link"
                    disabled={deleting}
                    onClick={() => onInsert(image.imageUrl)}
                  >
                    본문에 넣기
                  </Button>
                  <Button
                    variant="link-danger"
                    disabled={deleting || Boolean(lock)}
                    title={lock}
                    onClick={() => onDelete(image.fileId)}
                  >
                    {deleting ? "지우는 중…" : "지우기"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
