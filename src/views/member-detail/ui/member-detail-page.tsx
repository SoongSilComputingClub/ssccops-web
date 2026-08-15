"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generationText,
  mbrGrdTone,
  mbrSttsTone,
  MEMBER_CHANGE_WARNING,
  type MemberChange,
  type MemberChangeWarning,
} from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { GradeStatusSheet, useMemberDetail } from "@/features/member";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  flash,
  PageBody,
  PageHeader,
  Pill,
  SectionLabel,
} from "@/shared/ui";

/*
 * 회원 상세 (#46 · 서버 #76 · GET /v1/members/{memberId}).
 *
 * 프로필·현재 역할·최근 변경 이력 3건이 **한 응답**으로 온다. 예전에는 목 스토어의 회원·역할
 * 관계·등급 이력·상태 이력 네 배열을 화면에서 이어 붙였는데, 이력을 합쳐 자르는 규칙(기록
 * 시각 역순 3건)이 화면 계산에 달려 있어 서버와 갈릴 자리였다. 변경자 이름도 응답에 실려
 * 오므로 회원 목록에서 이름을 되찾던 `mbrNmOf`가 사라졌다.
 *
 * 목록보다 더 좁혀진 개인정보(연락처·이메일·변경 이력)를 한 사람 단위로 보여 주므로 목록과
 * 같은 권한으로 잠근다(#52). 목록에서 감춰도 주소를 직접 치면 여기로 바로 올 수 있어 화면마다
 * 판정을 둔다 — 근거는 views/member-list 의 NO_MEMBER_MANAGE 주석.
 */
const NO_MEMBER_MANAGE =
  "회원 관리(MEMBER_MANAGE) 권한이 없어 회원 정보를 볼 수 없습니다 — 운영진에게 요청해주세요";

/**
 * 아직 이 화면에서 열리지 않는 조작.
 *
 * 정보 수정은 #47(PATCH /v1/members/{memberId}), 등급·상태 변경은 #48(전용 변경 API)에서
 * 열렸다. 남은 역할 부여(#50)는 서버 호출이 아직 붙지 않았다 — 그때까지 버튼을 열어 두면 목
 * 스토어를 고치는 조작이 되는데, 그 목 회원은 이 화면이 보여 주는 서버 회원과 다른 사람이다.
 * 저장되지 않는 입력창을 열어 두지 않는다는 판단은 views/my-account 가 먼저 했다.
 */
const READ_ONLY_NOTE = "역할 부여는 역할 변경 API 연동 이후에 열립니다.";

export function MemberDetailPage({ mbrId }: { mbrId: number }) {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/role-authorities 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title="회원 상세" showBack />
        <PageBody>
          <EmptyState message={NO_MEMBER_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <MemberDetailView mbrId={mbrId} />;
}

function MemberDetailView({ mbrId }: { mbrId: number }) {
  const router = useRouter();
  const { member, status, errorMessage, reload, apply } = useMemberDetail(mbrId);

  /** 어느 시트가 열려 있는가 — null이면 닫혀 있다 */
  const [sheet, setSheet] = useState<"grd" | "stts" | null>(null);
  /**
   * 방금 저장한 상태 변경에 딸려 온 경고.
   *
   * 화면 상태로 들고 있는 것은 이것이 **회원의 속성이 아니라 방금 일어난 일**이기 때문이다 —
   * 다시 조회해도 오지 않고, 사용자가 처리했다고 표시하기 전까지 남아 있어야 한다.
   */
  const [warnings, setWarnings] = useState<MemberChangeWarning[]>([]);

  if (status !== "ready" || !member) {
    return (
      <>
        <PageHeader title="회원 상세" showBack />
        <PageBody>
          {status === "loading" && (
            <Card className="animate-pulse">
              <div className="h-[30px] w-[180px] rounded bg-black/5" />
              <div className="mt-3 h-[18px] w-[240px] rounded bg-black/5" />
              <div className="mt-5 h-[120px] w-full rounded bg-black/5" />
            </Card>
          )}
          {status === "not-found" && (
            <EmptyState
              message="회원을 찾을 수 없습니다."
              action={{ label: "회원 목록", onClick: () => router.push(ROUTES.members) }}
            />
          )}
          {status === "error" && (
            <EmptyState
              message={errorMessage || "회원 정보를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  return (
    <>
      {/*
        수정 화면으로 가는 유일한 길이다 — 이 버튼이 없으면 /members/{mbrId}/edit 는 주소를
        직접 쳐야만 닿는다. 두 화면 모두 MEMBER_MANAGE 로 잠겨 있고(여기까지 온 사람은 이미
        가졌다) 저장 시점의 판정은 서버가 다시 한다.
      */}
      <PageHeader
        title="회원 상세"
        subtitle={`회원 #${member.memberId}`}
        showBack
        action={{
          label: "정보 수정",
          onClick: () => router.push(ROUTES.memberEdit(member.memberId)),
        }}
      />
      <PageBody>
        {/*
          경고는 본문 맨 위다 — 방금 한 변경의 결과이고, 스크롤을 내려야 보이는 자리에 두면
          못 보고 화면을 떠난다. 닫기 전까지 남는다.
        */}
        {warnings.length > 0 && (
          <ChangeWarningPanel warnings={warnings} onDismiss={() => setWarnings([])} />
        )}
        <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center gap-[10px]">
                <div className="text-[26px] font-medium">{member.name}</div>
                {/* 색은 코드로 고르고 글자는 서버가 준 명칭을 쓴다 (api/members.ts 주석) */}
                <Badge tone={mbrGrdTone(member.membershipGradeCode)}>
                  {member.membershipGradeName}
                </Badge>
                <Badge tone={mbrSttsTone(member.membershipStatusCode)}>
                  {member.membershipStatusName}
                </Badge>
                {/* 아직 로그인한 적 없는 이관 회원 — 시스템으로 연락이 닿지 않는다 */}
                {!member.linkedAccount && <Pill tone="outline">이관</Pill>}
              </div>
              <div className="mt-1 text-[13.5px] text-n500">
                회원 #{member.memberId} · 가입 {member.joinDate}
              </div>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
              <div className="grid grid-cols-[84px_1fr_84px_1fr] gap-y-[9px] text-[15px]">
                <div className="text-[14px] text-n500">학생번호</div>
                <div>{member.studentNumber || "학번 미확인"}</div>
                <div className="text-[14px] text-n500">기수</div>
                <div>{generationText(member.generationNumber)}</div>
                <div className="text-[14px] text-n500">학과</div>
                <div>{member.departmentName || "학과 미입력"}</div>
                <div className="text-[14px] text-n500">학년</div>
                <div>
                  {member.academicYear ? `${member.academicYear}학년` : "학년 미입력"}
                </div>
                <div className="text-[14px] text-n500">연락처</div>
                <div>{member.phoneNumber || "미입력"}</div>
                <div className="text-[14px] text-n500">이메일</div>
                <div>{member.email || "미입력"}</div>
              </div>
              <div className="mt-4 text-[13px] text-n500">{READ_ONLY_NOTE}</div>
            </Card>

            {/*
              등급·상태는 여기서만 바꾼다. 정보 수정 화면(#47)에 이 두 값의 자리가 없는 것은
              변경 이력을 남겨야 하는 조작이라 서버가 전용 엔드포인트로 열었기 때문이고,
              화면도 같은 경계를 그린다 — 수정 폼에 넣으면 이력 없는 변경 경로가 생긴다.
            */}
            <Card>
              <SectionLabel className="mb-3">등급 · 상태</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[12px] border border-line p-[14px]">
                  <div className="text-[13px] text-n500">회원등급</div>
                  <div className="mt-1 text-[19px] font-medium">
                    {member.membershipGradeName}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSheet("grd")}
                  >
                    등급 변경
                  </Button>
                </div>
                <div className="rounded-[12px] border border-line p-[14px]">
                  <div className="text-[13px] text-n500">회원상태</div>
                  <div className="mt-1 text-[19px] font-medium">
                    {member.membershipStatusName}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSheet("stts")}
                  >
                    상태 변경
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">현재 역할</SectionLabel>
              {member.roles.length === 0 ? (
                <EmptyState message="부여된 역할이 없습니다." padding="sm" />
              ) : (
                <div className="flex flex-col gap-[9px]">
                  {/*
                    현재(오늘이 효력 기간 안인) 역할만 실려 온다 — 기간 판정은 서버가 한다
                    (BR-M25). 화면이 시작·종료일을 다시 견주지 않으므로 그 두 날짜는 응답에
                    없고, 여기서도 보여 주지 않는다.
                  */}
                  {member.roles.map((role) => (
                    <div
                      key={role.roleId}
                      className="flex items-center gap-2 rounded-[12px] border border-line p-3"
                    >
                      <div className="text-[16px] font-medium">{role.roleName}</div>
                      {role.representative && <Pill tone="blue">대표</Pill>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionLabel className="mb-3">최근 변경이력</SectionLabel>
              {member.recentChanges.length === 0 ? (
                <div className="text-[14.5px] text-n500">변경 이력이 없습니다</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {member.recentChanges.map((change, index) => (
                    <ChangeRow key={`${change.changeType}-${change.createdAt}-${index}`} change={change} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageBody>

      {/*
        변경 응답으로 화면을 갈아 끼운다 — 다시 조회하지 않는다. 응답의 member가 조회와 같은
        상세 DTO라 뱃지·등급/상태 카드·최근 변경이력(맨 앞이 방금 남긴 이력이다)이 한 번에
        맞는다. reload()를 부르면 왕복 한 번 동안 옛 값이 남고, 그 사이 다른 사람이 바꾼 값이
        섞여 방금 내가 한 변경이 반영된 것인지 구분되지 않는다.
      */}
      <GradeStatusSheet
        member={member}
        kind={sheet}
        onClose={() => setSheet(null)}
        onChanged={(result) => {
          apply(result.member);
          /* 성공 사실만 토스트로 알린다 — 처리가 남았다는 사실은 아래 패널이 붙들고 있는다 */
          flash(sheet === "grd" ? "등급을 변경했습니다" : "상태를 변경했습니다");
          setWarnings(result.warnings);
        }}
      />
    </>
  );
}

/**
 * 탈퇴·제명으로 옮긴 뒤 남은 것들 (#48 · 서버 응답의 `warnings`).
 *
 * ── 왜 토스트가 아닌가 ──────────────────────────────────────────
 * 서버는 상태만 바꾸고 **역할·담당 하위 업무를 정리하지 않는다** — 어떻게 넘길지가 운영 규칙이
 * 필요한 판단이라 부수 효과를 넣지 않기로 했기 때문이다(서버 `MemberChangeWarningResponse`).
 * 그래서 이 사실을 사람에게 넘기는 마지막 지점이 이 패널이고, 몇 초 뒤 사라지는 토스트로
 * 알리면 조직을 떠난 회원이 국장 역할과 미완료 업무를 그대로 쥔 채 아무도 모르게 남는다.
 * 닫기는 사용자가 직접 누른다 — "봤다"는 표시이지 처리했다는 뜻은 아니므로 문구로 구분한다.
 *
 * 건수는 서버가 문구와 따로 실어 주므로 값으로 쓴다. 코드를 모르는 경고가 새로 생겨도 서버
 * 문장을 그대로 보여 준다 — 화면이 모르는 경고를 삼키면 그 사실만 조용히 사라진다.
 */
function ChangeWarningPanel({
  warnings,
  onDismiss,
}: {
  warnings: MemberChangeWarning[];
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-2xl border border-amber bg-amber-soft p-[18px]"
    >
      <div className="flex items-start gap-[10px]">
        <div className="mt-[3px] flex size-[18px] flex-none items-center justify-center rounded-full bg-amber text-[12px] font-bold text-white">
          !
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-medium text-amber">
            상태는 바뀌었지만 정리되지 않은 항목이 남아 있습니다
          </div>
          <div className="mt-[10px] flex flex-col gap-[7px]">
            {warnings.map((warning) => (
              <div key={warning.code} className="flex items-baseline gap-2 text-[14.5px]">
                <Badge tone="grey">{warningLabel(warning.code)}</Badge>
                <span>{warning.message}</span>
                <span className="text-[13px] text-n400">({warning.count}건)</span>
              </div>
            ))}
          </div>
          <div className="mt-[10px] text-[13px] text-n400">
            역할과 담당 업무는 <b>자동으로 정리되지 않습니다</b> — 역할 종료와 업무 인계는 직접
            처리해주세요.
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          확인했습니다
        </Button>
      </div>
    </div>
  );
}

/** 경고 코드 → 무엇이 남았는지를 가리키는 짧은 이름. 모르는 코드는 서버 문장만 보여 준다 */
function warningLabel(code: string): string {
  switch (code) {
    case MEMBER_CHANGE_WARNING.CURRENT_ROLES_REMAIN:
      return "역할";
    case MEMBER_CHANGE_WARNING.ASSIGNED_SUB_WORKS_REMAIN:
      return "하위 업무";
    default:
      return "확인 필요";
  }
}

/**
 * 변경 이력 한 줄.
 *
 * 등급·상태 이력이 한 배열에 섞여 오고 무엇이 바뀌었는지는 `changeType`이 가른다. 이전 값이
 * 없으면(가입 시점의 최초 부여) '신규'로 그린다 — 그때는 등급도 상태도 없었다는 사실 그대로다.
 *
 * 날짜는 `appliedDate`(언제부터 적용되는가)를 쓴다. 정렬 기준인 `createdAt`은 UTC 기준
 * 일시라 시:분을 그대로 잘라 보여 주면 아홉 시간 어긋난 시각이 화면에 뜬다.
 */
function ChangeRow({ change }: { change: MemberChange }) {
  const kind = change.changeType === "GRADE" ? "등급" : "상태";
  const by = change.changedByName ?? "-";

  return (
    <div className="flex items-start gap-[10px]">
      <div className="mt-[7px] size-[5px] flex-none rounded-full bg-accent" />
      <div className="min-w-0">
        <div className="text-[14.5px]">
          {kind} · {change.previousName ?? "신규"} → {change.newName}
        </div>
        <div className="mt-[2px] text-[12.5px] text-n500">
          {change.appliedDate} · {by}
        </div>
        {change.changeReason && (
          <div className="mt-[2px] text-[12.5px] text-n400">{change.changeReason}</div>
        )}
      </div>
    </div>
  );
}
