"use client";

import Link from "next/link";
import type { RosterPositionNotation, RosterSemester } from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  ROSTER_EXPORT_FORBIDDEN_MESSAGE,
  useMemberRosterExport,
  type MemberRosterExport,
} from "@/features/member";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { Button, Card, EmptyState, Field, PageBody, PageHeader, SelectField } from "@/shared/ui";

/*
 * 회원명부 내보내기 (#785 · 서버 #674 · 상위 ssccops#598).
 *
 * 운영진이 학기마다 동아리연합회에 내는 회원명부를 서버가 원본 양식 그대로 xlsx로 만든다. 화면은
 * **연도·학기와 옵션 둘을 받아 내려받기만** 한다 — 누구를 넣고 무엇으로 적을지는 서버 규칙이다.
 *
 * 권한은 CSV 회원 이관과 같은 `MEMBER_MANAGE`다(서버 클래스 레벨 `@RequireAuthority`). 목차에서는
 * 감추고, 주소로 들어오면 CSV 이관 화면처럼 안내만 그린다 — 이 화면에서 할 수 있는 일이 내려받기
 * 하나뿐이라 잠긴 버튼만 남은 화면은 뜻이 없다.
 */

/*
 * 직책 표기법 두 선택지 — 이름과 설명은 Story(ssccops#598) 표가 정본이다.
 *
 * 체크박스 하나(«실제 역할로 표기»)가 아니라 이름과 설명을 붙인 라디오인 것은 끈 상태가 무엇인지
 * 화면만 봐서는 알 수 없어서다. 체크박스 둘이 아닌 것은 서로 배타라 «둘 다»·«둘 다 아님»이라는
 * 뜻 없는 상태가 생기기 때문이다.
 */
const NOTATION_OPTIONS: readonly {
  value: RosterPositionNotation;
  label: string;
  description: string;
}[] = [
  {
    value: "FEDERATION",
    label: "동아리연합회 표기법",
    description: "동아리연합회 제출용입니다. 회장·부회장 외 모든 회원을 ‘정회원’으로 적습니다.",
  },
  {
    value: "SSCC",
    label: "SSCC 표기법",
    description:
      "동아리 내부용입니다. SSCC 직책 체계대로 회장·부회장 외 회원은 대표 역할로 적고, 대표 역할이 없으면 비워 둡니다.",
  },
];

const SEMESTERS: readonly RosterSemester[] = [1, 2];

/* 묶음 제목 — `Field`의 라벨과 같은 모양이다(체크박스·라디오 묶음은 `<fieldset>`이라 직접 그린다) */
const LEGEND = "mb-[8px] block text-[13.5px] text-n400";

export function MemberRosterExportPage() {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/csv-import 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title="회원명부 내보내기" />
        <PageBody>
          <EmptyState message={ROSTER_EXPORT_FORBIDDEN_MESSAGE} />
        </PageBody>
      </>
    );
  }

  return <RosterExportForm />;
}

function RosterExportForm() {
  const roster = useMemberRosterExport();
  const loading = roster.status === "loading";

  return (
    <>
      <PageHeader title="회원명부 내보내기" subtitle="동아리연합회 양식의 xlsx" />
      <PageBody>
        {/* 서버가 내려받은 기록을 감사 로그에 남긴다 — 누르기 전에 알 수 있어야 한다 */}
        <div className="mb-4 max-w-[720px] text-[14px] leading-[1.7] text-n400">
          연락처·학번이 담긴 파일입니다. 내려받은 기록이 남습니다.
        </div>

        <Card className="flex max-w-[720px] flex-col gap-6">
          <TermSection roster={roster} disabled={loading} />
          <StatusSection roster={roster} disabled={loading} />
          <NotationSection roster={roster} disabled={loading} />

          {roster.status === "error" && (
            <div className="rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] leading-[1.6] text-danger">
              {roster.errorMessage}
              {/* 회장 역할을 배정해야 풀리는 거절이다 — 옵션을 바꿔도 같다 */}
              {roster.presidentMissing && (
                <>
                  {" "}
                  <Link href={ROUTES.roles} className="text-accent underline">
                    역할 관리로
                  </Link>
                </>
              )}
            </div>
          )}

          <div>
            <Button
              onClick={roster.download}
              disabled={loading || roster.blockReason !== null}
              title={roster.blockReason ?? undefined}
            >
              {loading ? "내려받는 중…" : "내려받기"}
            </Button>
          </div>
        </Card>
      </PageBody>
    </>
  );
}

/** 연도·학기 — 서버에 학기 개념이 없어 이 값이 제목과 파일 이름이 된다 */
function TermSection({ roster, disabled }: Readonly<{ roster: MemberRosterExport; disabled: boolean }>) {
  return (
    <div>
      <div className="grid max-w-[360px] grid-cols-2 gap-3">
        <Field label="연도">
          <SelectField
            value={roster.year}
            onChange={(e) => roster.setYear(Number(e.target.value))}
            disabled={disabled}
          >
            {roster.yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </SelectField>
        </Field>
        <Field label="학기">
          <SelectField
            value={roster.semester}
            onChange={(e) => roster.setSemester(Number(e.target.value) === 1 ? 1 : 2)}
            disabled={disabled}
          >
            {SEMESTERS.map((semester) => (
              <option key={semester} value={semester}>
                {semester}학기
              </option>
            ))}
          </SelectField>
        </Field>
      </div>
      <div className="mt-[6px] text-[13px] leading-[1.6] text-n500">
        파일 제목과 이름에 들어갑니다. 명단은 오늘 기준입니다.
      </div>
    </div>
  );
}

/**
 * 포함할 회원 상태 — 선택지는 `GET /v1/member-statuses` 그대로다(화면이 목록을 박아 두지 않는다).
 *
 * 임시회원 제외·회장단 포함은 서버의 고정 규칙이라 체크박스가 없고 한 줄로만 밝힌다.
 */
function StatusSection({ roster, disabled }: Readonly<{ roster: MemberRosterExport; disabled: boolean }>) {
  return (
    <fieldset className="min-w-0">
      <legend className={LEGEND}>포함할 회원 상태</legend>

      {roster.statusesLoading && <div className="text-[14px] text-n500">불러오는 중…</div>}
      {roster.statusesFailed && (
        <div className="text-[13.5px] text-danger">
          회원 상태 목록을 불러오지 못했습니다 — 새로고침해주세요
        </div>
      )}
      {roster.statuses.length > 0 && (
        <div className="flex flex-wrap gap-x-[18px] gap-y-[10px]">
          {roster.statuses.map((s) => (
            <label
              key={s.code}
              className={cn(
                "flex items-center gap-[6px] text-[15px]",
                disabled ? "cursor-default" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                className="size-[17px] flex-none accent-accent disabled:cursor-not-allowed disabled:opacity-60"
                checked={roster.isStatusChecked(s.code)}
                onChange={() => roster.toggleStatus(s.code)}
                disabled={disabled}
              />
              {s.name}
            </label>
          ))}
        </div>
      )}

      {roster.noStatusChosen && (
        <div className="mt-[8px] text-[13px] text-danger">포함할 회원 상태를 하나 이상 골라주세요</div>
      )}
      <div className="mt-[8px] text-[13px] leading-[1.6] text-n500">
        회장·부회장은 고른 상태와 관계없이 항상 포함됩니다. 임시회원은 포함되지 않습니다.
      </div>
    </fieldset>
  );
}

/** 직책 표기법 — 선택지마다 이름 아래 설명을 붙여 무엇이 다른지 화면에서 바로 읽히게 한다 */
function NotationSection({ roster, disabled }: Readonly<{ roster: MemberRosterExport; disabled: boolean }>) {
  return (
    <fieldset className="min-w-0">
      <legend className={LEGEND}>직책 표기법</legend>
      <div className="flex flex-col gap-[10px]">
        {NOTATION_OPTIONS.map((option) => {
          const checked = roster.notation === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex items-start gap-[10px] rounded-[12px] border px-[14px] py-3 transition-colors",
                checked ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong",
                disabled ? "cursor-default" : "cursor-pointer",
              )}
            >
              <input
                type="radio"
                name="roster-position-notation"
                value={option.value}
                className="mt-[3px] size-[17px] flex-none accent-accent disabled:cursor-not-allowed"
                checked={checked}
                onChange={() => roster.setNotation(option.value)}
                disabled={disabled}
              />
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">{option.label}</span>
                <span className="mt-[2px] block text-[13.5px] leading-[1.6] text-n500">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
