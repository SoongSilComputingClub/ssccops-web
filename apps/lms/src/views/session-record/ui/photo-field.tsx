"use client";

import { useEffect, useMemo, useRef } from "react";
import type { AcademicSessionFileReference } from "@/entities/academic-session";
import { cn } from "@/shared/lib/cn";

/*
 * 출석 인증사진 입력 (#128) — 회차당 1장.
 *
 * 파일을 고르면 부모(폼)에 `File`을 올리고, 미리보기는 `URL.createObjectURL`로 로컬에서 그린다
 * (업로드는 제출 버튼을 눌러야 일어난다 — 서버에 초안이 없다). 재제출 화면에서 이미 올라간
 * 사진이 있으면 그 주소를 미리보기로 보여 주고, 새로 고르지 않으면 그대로 둔다(재업로드는
 * 선택이다).
 *
 * 형식·용량을 여기서 판정하지 않는다 — 허용 목록과 상한은 서버에만 있고(AGENTS.md), 웹이
 * 복제하면 서버가 규칙을 넓힌 날에도 화면만 계속 막는다. 최종 판정은 업로드 응답 코드로 안내한다.
 */

export function PhotoField({
  existing,
  file,
  onPick,
  onClear,
  disabled,
}: {
  /** 재제출 화면에서 이미 올라간 사진 (없으면 null) */
  existing: AcademicSessionFileReference | null;
  /** 이번에 새로 고른 파일 (없으면 null) */
  file: File | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 고른 파일의 로컬 미리보기 주소. 파일이 바뀔 때만 새로 만들고, 이전 것은 아래 이펙트가 해제한다
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const shownUrl = previewUrl ?? existing?.fileUrlAddr ?? null;

  return (
    <div className="flex flex-col gap-[8px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) onPick(picked);
          // 같은 파일을 다시 고를 수 있게 값을 비운다
          event.target.value = "";
        }}
      />

      {shownUrl ? (
        <div className="flex flex-col gap-[8px]">
          {/* 인증사진 미리보기 — 원본 비율 유지, 가로 폭에 맞춰 축소 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shownUrl}
            alt="출석 인증사진 미리보기"
            className="max-h-[240px] w-full rounded-[12px] object-contain shadow-[inset_0_0_0_1px_#e5e8eb]"
          />
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="rounded-[10px] px-[12px] py-[7px] text-[13.5px] text-accent shadow-[inset_0_0_0_1px_#3182f6] disabled:opacity-50"
            >
              {file ? "다른 사진 고르기" : "사진 바꾸기"}
            </button>
            {file && (
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className="rounded-[10px] px-[12px] py-[7px] text-[13.5px] text-n300 shadow-[inset_0_0_0_1px_#d1d6db] disabled:opacity-50"
              >
                {existing ? "새 사진 취소" : "사진 제거"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "flex h-[150px] flex-col items-center justify-center gap-[6px] rounded-[12px] border border-dashed border-line-strong bg-bg text-center transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span className="text-[14.5px] text-n300">사진을 선택해 주세요</span>
          <span className="font-mono text-[12.5px] text-n500">JPG · PNG</span>
        </button>
      )}
    </div>
  );
}
