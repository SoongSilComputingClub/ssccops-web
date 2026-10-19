import { formatDt } from "@ssccops/date";
import { cn } from "../lib/cn";
import { formatFileSize } from "../lib/file-size";

/*
 * 첨부 파일 목록 — 이름 · 크기 · 올린 시각 · 내려받기 (+ 지우기) (web#805 · ssccops#607).
 *
 * 기획안 첨부 자료가 **세 앱에서 같은 줄**로 선다: lms 작성·재제출(올리기·지우기)과 상세(읽기),
 * admin 기획안 검토(읽기), www 학술 프로그램 상세(읽기 · 로그인한 회원). 둘 이상이 같은 것을 쓰면
 * 올린다는 규칙(루트 AGENTS «FSD»)대로 여기 둔다.
 *
 * ── 표시만 한다 ─────────────────────────────────────────────
 * 전송 계층·경로·권한·오류 문구는 앱 몫이다 — 세 앱이 부르는 경로가 다르고(`…/mine/…` · 검토자 ·
 * 학술 프로그램), 401·403을 다루는 법도 앱마다 다르다(루트 AGENTS «서버 연동 규약»). 카드·제목·빈
 * 상태도 앱이 그린다(`EmptyState`가 앱마다 API가 달라 여기 올리지 않은 것과 같은 이유).
 *
 * ── 내려받기는 버튼이다, 링크가 아니다 ─────────────────────
 * 서명 URL은 15분이면 만료되므로 목록에 박아 두지 않고 누를 때마다 받는다(`onDownload`). 브라우저
 * 안에서 열지 않는다 — md를 렌더하거나 pdf를 띄우지 않는다(서버가 내용 검사를 하지 않는 전제 ·
 * ssccops#607 «보안»).
 *
 * 지우기 확인 창은 두지 않는다 — 운영 건 첨부(admin #546)와 같다. 지운 파일은 올린 사람의 기기에
 * 그대로 있다.
 */

export interface AttachmentListItem {
  fileId: number;
  fileName: string;
  /** 바이트 */
  fileSize: number | null;
  /** 일시TS (Asia/Seoul 오프셋) — 잘라 쓴다 */
  uploadedAt: string | null;
}

const ROW_BUTTON =
  "shrink-0 cursor-pointer whitespace-nowrap rounded-[12px] border border-line-strong px-3 py-[6px] text-[13.5px] text-n300 transition-colors disabled:cursor-not-allowed disabled:opacity-45";

export function AttachmentList({
  items,
  onDownload,
  onRemove,
  disabled,
  className,
}: Readonly<{
  items: readonly AttachmentListItem[];
  onDownload: (fileId: number) => void;
  /** 있으면 줄마다 «지우기» — 없으면 읽기 전용 */
  onRemove?: (fileId: number) => void;
  /** 처리 중 — 버튼을 잠근다 */
  disabled?: boolean;
  className?: string;
}>) {
  return (
    <ul className={cn("flex flex-col divide-y divide-hairline", className)}>
      {items.map((item) => {
        const meta = [formatFileSize(item.fileSize), formatDt(item.uploadedAt)]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={item.fileId} className="flex items-center gap-[8px] py-[10px]">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px]" title={item.fileName}>
                {item.fileName}
              </div>
              {meta && <div className="mt-[2px] text-[12.5px] text-n500">{meta}</div>}
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onDownload(item.fileId)}
              aria-label={`${item.fileName} 내려받기`}
              className={cn(ROW_BUTTON, "hover:border-accent hover:text-accent")}
            >
              내려받기
            </button>
            {onRemove && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(item.fileId)}
                aria-label={`${item.fileName} 지우기`}
                className={cn(ROW_BUTTON, "hover:border-danger hover:text-danger")}
              >
                지우기
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
