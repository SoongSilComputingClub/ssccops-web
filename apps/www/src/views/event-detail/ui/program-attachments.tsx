"use client";

import { AttachmentList } from "@ssccops/ui";
import { useProgramAttachments } from "@/features/academic-program";
import { Card } from "@/shared/ui";

/*
 * 학술 프로그램 상세의 «첨부 자료» 절 (web#805 · ssccops#607 · 클라이언트).
 *
 * 행사 상세는 익명 SSR 그대로 두고(OG · wave2 D7) 이 절만 클라이언트로 떼어 냈다 — 신청 버튼 자리
 * (`apply-actions.tsx`)와 같은 방식이다. 학술 프로그램(`event.academicProgram`)일 때만 페이지가
 * 이것을 그린다.
 *
 * **익명·미가입에게는 아무것도 그리지 않는다.** 확인 중일 때도 비워 둔다 — 익명은 요청이 나가지
 * 않아 곧바로 감춰지는데, 그 사이 뼈대를 그리면 첨부가 있는 것처럼 한 번 깜빡인다. 첨부가 없는
 * 프로그램도 절이 없다(«첨부 자료 없음»을 띄울 이유가 이 화면에는 없다).
 *
 * 브라우저 안에서 열지 않는다 — 내려받기만 한다(md 렌더·pdf 내장 뷰어 없음 · ssccops#607 «보안»).
 */
export function ProgramAttachments({
  academicProgramId,
}: Readonly<{ academicProgramId: number }>) {
  const a = useProgramAttachments(academicProgramId);

  if (a.status === "loading" || a.status === "hidden") return null;
  if (a.status === "ready" && a.items.length === 0) return null;

  return (
    <Card className="flex w-full flex-col gap-[8px]">
      <h2 className="text-[16px] font-semibold">첨부 자료</h2>
      {a.status === "error" ? (
        <div className="flex flex-wrap items-center gap-x-[8px] text-[13.5px] text-danger">
          <span>{a.loadError}</span>
          <button
            type="button"
            onClick={a.reload}
            className="cursor-pointer underline underline-offset-2"
          >
            새로고침
          </button>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-n500">기획안과 함께 낸 자료입니다.</p>
          <AttachmentList
            items={a.items}
            disabled={a.busy}
            onDownload={(fileId) => void a.download(fileId)}
          />
        </>
      )}
      {a.actionError && <p className="text-[12.5px] text-danger">{a.actionError}</p>}
    </Card>
  );
}
