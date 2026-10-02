import Link from "next/link";
import { programStopOf, type AcdmActvSttsCd } from "@/entities/academic-program";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState, Notice } from "@/shared/ui";
import { SignupRequiredNotice } from "@/features/signup";

/*
 * 학술 화면(내 활동·회차 기록·출석부·팀원 관리)이 공유하는 안내 블록 (#190 · #192).
 *
 * 활동 선택은 상단 드롭다운(`ProgramSwitcher`)이 맡는다 — 여기 있는 것은 활동을 그릴 수
 * 없는 갈래들(맡은 활동 없음 · 미가입 · 결정 실패)의 공용 문구다. 세 화면이 같은 상황에
 * 같은 문구를 쓰게 한다(#117). 종료·폐지된 프로그램의 안내 띠(#716 · #741)도 같은 이유로 여기 있다.
 */

/** 맡은 활동이 하나도 없을 때 */
export function NoProgramNotice() {
  return (
    <EmptyState
      title="맡고 있는 학술 프로그램이 없습니다"
      description="스터디장·팀장으로 지정되면 이 화면을 쓸 수 있습니다."
    />
  );
}

/** 미가입 안내 — 같은 자리에서 가입까지 (#453). 어드민 링크(`signupHref`)는 걷어냈다 */
export function ProgramSignupNotice() {
  return <SignupRequiredNotice title="회원 가입을 마쳐야 학술 프로그램 화면을 볼 수 있습니다" />;
}

/**
 * 종료·폐지된 프로그램 안내 한 줄 (#716 · ADR-0057 · #741 · ADR-0058).
 *
 * 둘 다 그 프로그램의 쓰기를 전부 멈추고(서버 409 `ACADEMIC_PROGRAM_COMPLETED`·
 * `ACADEMIC_PROGRAM_DISCONTINUED`) 되돌리기(재시작·복원)는 학술국장이 어드민에서 한다 — 이 앱에는
 * 그 버튼이 없어 «누구에게 무엇을 요청하나»를 적는다. 조회는 막지 않으므로 화면은 그대로 그리고
 * 그 위에 띠로 얹는다. `Notice`를 쓰지 않는 것은 그쪽이 화면 한가운데 세우는 빈 상태 카드라서다
 * (모집 문항 편집기의 띠와 같은 모양).
 *
 * 프로그램 상태를 받아 쓰기가 열려 있으면 아무것도 그리지 않는다 — 부르는 쪽마다
 * `sttsCd === "COMPLETED"`를 적던 것을 한 곳(`programStopOf`)으로 모았다. 폼을 여닫는 것은 이
 * 안내가 아니라 서버 `isEditable`이다.
 */
export function ProgramStoppedNotice({ sttsCd }: Readonly<{ sttsCd: AcdmActvSttsCd }>) {
  const stop = programStopOf(sttsCd);
  if (!stop) return null;
  return (
    <p className="rounded-[12px] border border-line bg-bg px-[14px] py-[11px] text-[13.5px] leading-[1.7] text-n400">
      {stop.adjective} 프로그램입니다. 기록을 고쳐야 하면 학술국장에게 {stop.undo}을
      요청해주세요.
    </p>
  );
}

/** 프로그램 목록 조회 자체가 실패했을 때 — 내 프로그램으로 되돌린다 */
export function BackToProgramsNotice({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <Notice title={title} description={description}>
      <Link
        href={ROUTES.studioPrograms}
        className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-on-solid hover:bg-accent-strong"
      >
        내 프로그램으로
      </Link>
    </Notice>
  );
}
