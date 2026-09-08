"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AcademicProgramMember } from "@/entities/academic-program";
import {
  sesnSttsBadge,
  type AcademicSessionDetail,
  type CurriculumItemWithSession,
} from "@/entities/academic-session";
// 클라이언트 훅은 피처 배럴이 아니라 직접 임포트한다(배럴은 서버 전용 로더를 끌어온다)
import {
  useSubmitSession,
  type SubmitMode,
} from "@/features/academic-session/model/use-submit-session";
import { ROUTES } from "@/shared/config/routes";
import { formatYmd, todayInSeoul } from "@/shared/lib/date";
import { Badge, Card, Field } from "@/shared/ui";
import { AttendanceChecklist } from "./attendance-checklist";
import { PhotoField } from "./photo-field";

/*
 * 회차 기록 작성 폼 (#128) — **클라이언트**.
 *
 * ── 로딩 완료 전에는 마운트하지 않는다 (AGENTS.md · 이슈) ────
 * 상위 페이지(`SessionRecordPage`)가 SSR 로더 결과가 `ready`가 될 때까지 이 컴포넌트를
 * 마운트하지 않는다. 그래서 `useState` 초깃값을 넘어온 prop으로 잡아 두면 그대로 폼 초깃값이
 * 되고, 비동기 로딩을 기다리는 `useEffect` 동기화가 필요 없다.
 *
 * ── 신규(create) / 재제출(resubmit) ─────────────────────────
 * `mode`로 POST/PUT을 가른다(훅이 실제 분기). 재제출이면 이전 제출 내용(진행 내용·전달사항·
 * 출석·사진)이 초깃값으로 채워지고, 국장이 남긴 수정요청 사유(`latestOpinion`)를 상단에 보여
 * 준다.
 *
 * ── 임시저장이 없다 ────────────────────────────────────────
 * 서버에 초안이 없다(이슈 「지킬 것」). 버튼은 "제출" 하나뿐이고, 저장되지 않는 값이 사라지는
 * 임시저장 버튼을 두지 않는다.
 *
 * ── 16px 규칙 (#105) ───────────────────────────────────────
 * lms에는 어드민의 공용 입력(`INPUT_BASE`)이 없다. iOS Safari가 16px 미만 입력란 포커스 시
 * 화면을 확대하고 스스로 돌아오지 않으므로, 입력 글자는 `text-[16px] lg:text-[15px]`로 둔다.
 */

const INPUT_CLASS =
  "w-full rounded-[12px] border border-line bg-surface px-[11px] py-[9px] text-[16px] text-ink outline-none placeholder:text-n500 focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 lg:text-[15px]";

export function SessionRecordForm({
  academicProgramId,
  mode,
  curriculumItem,
  members,
  session,
}: {
  academicProgramId: number;
  mode: SubmitMode;
  curriculumItem: CurriculumItemWithSession;
  members: AcademicProgramMember[];
  /** 재제출일 때만 채워진다 */
  session: AcademicSessionDetail | null;
}) {
  const router = useRouter();
  const { submitting, submit } = useSubmitSession(academicProgramId);

  /* ── 폼 상태 (초깃값 = 넘어온 prop) ──────────────────────── */

  const [actlYmd, setActlYmd] = useState<string>(
    session?.actualYmd ?? curriculumItem.planYmd ?? todayInSeoul(),
  );
  const [prgrsCn, setPrgrsCn] = useState<string>(session?.progressContent ?? "");
  const [ntcCn, setNtcCn] = useState<string>(session?.noticeContent ?? "");

  /** eventPtcpId → 참석 여부. 재제출이면 이전 출석을, 신규면 전원 참석으로 시작한다 */
  const [present, setPresent] = useState<Record<number, boolean>>(() => {
    const seed: Record<number, boolean> = {};
    for (const member of members) seed[member.eventPtcpId] = true;
    if (session) {
      for (const row of session.attendances) seed[row.eventPtcpId] = row.atndYn;
    }
    return seed;
  });

  const [photo, setPhoto] = useState<File | null>(null);

  const [fieldError, setFieldError] = useState<{ actlYmd?: string; prgrsCn?: string }>({});
  const [banner, setBanner] = useState<string>("");
  /**
   * 회차 기록은 저장됐지만 사진만 실패한 상태. 여기서는 폼을 다시 제출할 수 없다(신규는 409
   * `SESSION_ALREADY_EXISTS`, 재제출은 상태가 이미 `SUBMITTED`) — 사진은 출석부 화면에서 다시
   * 올린다(그쪽은 `allowsCorrection`이라 제출 상태에서도 열린다).
   */
  const [photoFailed, setPhotoFailed] = useState<string>("");

  const badge = sesnSttsBadge(curriculumItem.sesnSttsCd);
  const seqLabel = curriculumItem.seqno === null ? "" : `${curriculumItem.seqno}회차 · `;

  const attendances = useMemo(
    () =>
      members.map((member) => ({
        eventPtcpId: member.eventPtcpId,
        atndYn: present[member.eventPtcpId] ?? false,
      })),
    [members, present],
  );

  const toggleAttendance = (eventPtcpId: number) => {
    setPresent((prev) => ({ ...prev, [eventPtcpId]: !prev[eventPtcpId] }));
  };

  const onSubmit = async () => {
    // 클라이언트 검증은 서버 @NotNull·@NotBlank와 같은 최소 판정만 — 규칙을 두 벌로 만들지 않는다
    const errors: { actlYmd?: string; prgrsCn?: string } = {};
    if (!actlYmd) errors.actlYmd = "실제 진행일을 입력해 주세요";
    if (!prgrsCn.trim()) errors.prgrsCn = "진행 내용을 입력해 주세요";
    setFieldError(errors);
    if (Object.keys(errors).length > 0) {
      setBanner("입력을 확인해 주세요");
      return;
    }
    setBanner("");

    const outcome = await submit({
      mode,
      sessionId: session?.sessionId ?? curriculumItem.sessionId ?? null,
      body: {
        curriculumItemId: curriculumItem.curriculumItemId,
        actlYmd,
        prgrsCn: prgrsCn.trim(),
        ntcCn,
        attendances,
      },
      photo,
    });

    if (outcome.result === "failed") {
      setBanner(outcome.message);
      return;
    }

    if (outcome.result === "submitted-photo-failed") {
      /*
       * 회차 기록은 저장됐지만 사진만 실패했다. 폼에 머무르며 경고를 남긴다 — 여기서 다시
       * 제출하면 서버가 409로 끊는다(기록은 이미 저장됨). 사진 재업로드는 출석부 화면의 몫이다.
       */
      setPhotoFailed(outcome.message);
      return;
    }

    // 제출 성공 → '내 활동'으로 이동(이슈)
    router.push(ROUTES.studio);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 items-start gap-[16px] lg:grid-cols-[1.5fr_1fr]">
      {/* ── 왼쪽: 계획 항목 · 진행일 · 진행 내용 · 사진 ── */}
      <Card className="flex flex-col gap-[16px]">
        <div className="flex items-center gap-[8px]">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <span className="flex-1" />
          {curriculumItem.planYmd && (
            <span className="text-[13px] text-n500">계획일 {formatYmd(curriculumItem.planYmd)}</span>
          )}
        </div>

        {mode === "resubmit" && session?.latestOpinion && (
          <div className="rounded-[12px] bg-accent-soft px-[12px] py-[10px]">
            <div className="text-[13px] font-medium text-accent">국장이 요청한 수정 사항</div>
            <p className="mt-[4px] whitespace-pre-wrap text-[13.5px] leading-[1.6] text-n300">
              {session.latestOpinion}
            </p>
          </div>
        )}

        <div>
          <div className="mb-[6px] text-[13px] text-n400">계획 커리큘럼 항목</div>
          <div className="rounded-[12px] border border-line px-[12px] py-[11px]">
            <div className="text-[15px] font-semibold text-ink">
              {seqLabel}
              {curriculumItem.title || "-"}
            </div>
            {curriculumItem.planYmd && (
              <div className="mt-[3px] text-[13px] text-n500">
                계획일 {formatYmd(curriculumItem.planYmd)}
              </div>
            )}
          </div>
        </div>

        <Field label="실제 진행일" required error={fieldError.actlYmd}>
          <input
            type="date"
            value={actlYmd}
            onChange={(event) => setActlYmd(event.target.value)}
            disabled={submitting}
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="진행 내용" required error={fieldError.prgrsCn}>
          <textarea
            value={prgrsCn}
            onChange={(event) => setPrgrsCn(event.target.value)}
            disabled={submitting}
            rows={5}
            placeholder="계획 대비 실제로 다룬 내용, 변경 사항, 과제를 적어 주세요"
            className={`${INPUT_CLASS} min-h-[120px] resize-y`}
          />
        </Field>

        <Field label="전달사항">
          <textarea
            value={ntcCn}
            onChange={(event) => setNtcCn(event.target.value)}
            disabled={submitting}
            rows={3}
            placeholder="다음 회차 준비물, 과제 안내 등 (선택)"
            className={`${INPUT_CLASS} min-h-[72px] resize-y`}
          />
        </Field>

        <Field label="출석 인증사진 · 회차당 1장">
          <PhotoField
            existing={session?.fileReference ?? null}
            file={photo}
            onPick={setPhoto}
            onClear={() => setPhoto(null)}
            disabled={submitting}
          />
        </Field>
      </Card>

      {/* ── 오른쪽: 출석 체크 · 제출 ── */}
      <Card className="flex flex-col gap-[16px]">
        <AttendanceChecklist
          members={members}
          present={present}
          onToggle={toggleAttendance}
          disabled={submitting}
        />

        <div className="flex flex-col gap-[8px]">
          {photoFailed ? (
            <>
              <div className="rounded-[12px] bg-amber-soft px-[12px] py-[10px] text-[13.5px] leading-[1.6] text-amber">
                {photoFailed}
              </div>
              <button
                type="button"
                onClick={() => {
                  router.push(ROUTES.studio);
                  router.refresh();
                }}
                className="rounded-[12px] bg-accent px-[16px] py-[10px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                내 활동으로
              </button>
              <p className="text-[13px] leading-[1.6] text-n500">
                인증사진은 출석부 화면에서 다시 올릴 수 있습니다.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="rounded-[12px] bg-accent px-[16px] py-[10px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                {submitting ? "제출 중…" : "제출 · 승인 요청"}
              </button>
              {banner && <p className="text-[13px] text-danger">{banner}</p>}
              <p className="text-[13px] leading-[1.6] text-n500">
                제출하면 학술국장 승인 대기 상태가 됩니다. 승인 결과는 &lsquo;내 활동&rsquo;에서
                확인할 수 있습니다.
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
