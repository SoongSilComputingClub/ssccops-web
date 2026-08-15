"use client";

import { useRouter } from "next/navigation";
import { generationText, mbrGrdTone, mbrSttsTone } from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useMemberEdit } from "@/features/member";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  TextField,
  flash,
} from "@/shared/ui";

/*
 * 회원 정보 수정 (/members/{mbrId}/edit · #47 · 서버 #77 · PATCH /v1/members/{memberId}).
 *
 * ── 입력란은 서버가 고칠 수 있는 필드까지다 ─────────────────────
 * 예전 화면은 학번·가입일·등급·상태까지 편집란으로 열어 두고 목 스토어를 고쳤다. 서버는 그
 * 넷을 받지 않으므로(요청 본문에 필드 자체가 없다) 그대로 두면 사용자가 고친 값이 저장된 것처럼
 * 화면만 바뀐다 — **저장되지 않는 입력창을 열어 두지 않는다**는 판단은 views/my-account 가 먼저
 * 했다. 지금 이 화면이 보내는 것은 기수·이름·학과·학년·연락처·이메일 여섯 개다.
 *
 *  - 학번(stdnt_no)  가입 후 변경 불가로 확정됐다(데이터사전 ssccops#74 · updatable = false).
 *                    오타 정정 경로가 정해지면 별도 이슈로 열린다. 여기서는 읽기만 한다.
 *  - 가입일(join_ymd) 가입 시점의 사실이다. 이관 데이터 정정은 CSV 이관 기능과 함께 다룬다.
 *  - 등급·상태       변경 이력(mbr_grd_hstry · mbr_stts_hstry)을 함께 남겨야 해 전용 API가
 *                    따로 있다(서버 #78 · 웹 #48). 그래서 칩이 아니라 **상세 화면으로 보내는
 *                    링크**다 — 이 화면에서 고르게 두면 저장 버튼 하나가 이력 있는 변경과 없는
 *                    변경을 섞어 부르게 된다.
 *
 * ── 폼을 서버 값으로 채우고 전 필드를 보낸다 ────────────────────
 * PATCH이지만 본문은 한 벌 전체이고 **생략한 선택 필드는 비우는 것**이다(서버
 * MemberUpdateRequest 주석). 그래서 초기값은 반드시 서버 응답이어야 하고, 저장은 손대지 않은
 * 칸까지 통째로 보낸다. 화면에 "비워 둔 칸은 지워집니다"를 적어 둔 것은 이 의미가 사용자에게도
 * 보여야 하기 때문이다.
 *
 * ── 진입 가드는 #52 가 넣은 것을 그대로 둔다 ────────────────────
 * 수정은 조회보다 더 강한 동작이라 화면 자체를 열지 않는다 — "동작만 잠근다"를 따르면 남의
 * 개인정보가 채워진 폼을 보여 준 채 저장만 막는 꼴이 된다.
 */
const NO_MEMBER_MANAGE =
  "회원 관리(MEMBER_MANAGE) 권한이 없어 회원 정보를 수정할 수 없습니다 — 운영진에게 요청해주세요";

export function MemberEditPage({ mbrId }: { mbrId: number }) {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/role-authorities 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title="회원 수정" showBack />
        <PageBody>
          <EmptyState message={NO_MEMBER_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <MemberEditForm mbrId={mbrId} />;
}

function MemberEditForm({ mbrId }: { mbrId: number }) {
  const router = useRouter();
  const editor = useMemberEdit(mbrId);
  const { member, values, errors, academicRequired } = editor;

  if (editor.status !== "ready" || !member) {
    return (
      <>
        <PageHeader title="회원 수정" showBack />
        <PageBody>
          {editor.status === "loading" && (
            <Card className="animate-pulse">
              <div className="h-[30px] w-[180px] rounded bg-black/5" />
              <div className="mt-3 h-[18px] w-[240px] rounded bg-black/5" />
              <div className="mt-5 h-[120px] w-full rounded bg-black/5" />
            </Card>
          )}
          {editor.status === "not-found" && (
            <EmptyState
              message="회원을 찾을 수 없습니다."
              action={{ label: "회원 목록", onClick: () => router.push(ROUTES.members) }}
            />
          )}
          {editor.status === "error" && (
            <EmptyState
              message={editor.errorMessage || "회원 정보를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: editor.reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  const save = async () => {
    const saved = await editor.save();
    if (!saved) return;
    flash(`${saved.name} 저장됨`);
    router.replace(ROUTES.memberDetail(saved.memberId));
  };

  return (
    <>
      <PageHeader
        title="회원 수정"
        subtitle={`회원 #${member.memberId} · ${member.name}`}
        showBack
      />
      <PageBody>
        <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
          <Card>
            <SectionLabel className="mb-3">기본정보</SectionLabel>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="회원_명" required error={errors.name}>
                <TextField
                  value={values.name}
                  onChange={(e) => editor.set({ name: e.target.value })}
                  invalid={!!errors.name}
                  placeholder="필수"
                />
              </Field>
              <Field label="기수_번호" error={errors.generationNumber}>
                <TextField
                  value={values.generationNumber}
                  onChange={(e) => editor.set({ generationNumber: e.target.value })}
                  invalid={!!errors.generationNumber}
                  inputMode="numeric"
                  placeholder="비우면 미배정"
                />
              </Field>
              <Field
                label="학과_명"
                required={academicRequired}
                error={errors.departmentName}
              >
                <TextField
                  value={values.departmentName}
                  onChange={(e) => editor.set({ departmentName: e.target.value })}
                  invalid={!!errors.departmentName}
                  placeholder={academicRequired ? "필수" : "선택"}
                />
              </Field>
              <Field
                label="학년_번호"
                required={academicRequired}
                error={errors.academicYear}
              >
                <TextField
                  value={values.academicYear}
                  onChange={(e) => editor.set({ academicYear: e.target.value })}
                  invalid={!!errors.academicYear}
                  inputMode="numeric"
                  placeholder={academicRequired ? "필수 · 1~4" : "선택 · 1~4"}
                />
              </Field>
              <Field label="전화번호" error={errors.phoneNumber}>
                <TextField
                  value={values.phoneNumber}
                  onChange={(e) => editor.set({ phoneNumber: e.target.value })}
                  invalid={!!errors.phoneNumber}
                  placeholder="010-0000-0000"
                />
              </Field>
              <Field label="이메일" error={errors.email}>
                <TextField
                  value={values.email}
                  onChange={(e) => editor.set({ email: e.target.value })}
                  invalid={!!errors.email}
                  placeholder="선택"
                />
              </Field>
            </div>

            <div className="mt-4 text-[13px] leading-[1.6] text-n500">
              {academicRequired
                ? "재학 회원은 학과_명 · 학년_번호가 필수입니다. "
                : "학과_명 · 학년_번호는 선택입니다. "}
              비워 둔 칸은 저장할 때 <b>지워집니다</b> — 이 화면은 여섯 항목을 통째로 저장합니다.
            </div>

            {editor.saveErrorMessage && (
              <div className="mt-3 rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] leading-[1.6] text-danger">
                {editor.saveErrorMessage}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">이 화면에서 바꿀 수 없는 항목</SectionLabel>
              <div className="grid grid-cols-[84px_1fr] gap-y-[9px] text-[15px]">
                <div className="text-[14px] text-n500">학생번호</div>
                <div>{member.studentNumber || "학번 미확인"}</div>
                <div className="text-[14px] text-n500">가입일</div>
                <div>{member.joinDate}</div>
                <div className="text-[14px] text-n500">현재 기수</div>
                <div>{generationText(member.generationNumber)}</div>
              </div>
              <div className="mt-3 text-[13px] leading-[1.6] text-n500">
                학번과 가입일은 가입 시점의 사실이라 수정할 수 없습니다. 학번이 잘못 적혔다면
                운영진에게 문의해주세요.
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center">
                <SectionLabel>등급 · 상태</SectionLabel>
                <div className="flex-1" />
                {/*
                  등급·상태 변경은 이력을 함께 남기는 전용 API다(서버 #78 · 웹 #48). 이 화면의
                  저장과 섞지 않고 상세 화면의 변경 시트로 보낸다 — 사유와 적용 일자를 받아야
                  하는 조작이라 입력칸도 다르다.
                */}
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.memberDetail(member.memberId))}
                  className="cursor-pointer text-[14px] text-accent"
                >
                  상세에서 변경 ›
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-[7px]">
                {/* 색은 코드로 고르고 글자는 서버가 준 명칭을 쓴다 (entities/member/api/members.ts) */}
                <Badge tone={mbrGrdTone(member.membershipGradeCode)}>
                  {member.membershipGradeName}
                </Badge>
                <Badge tone={mbrSttsTone(member.membershipStatusCode)}>
                  {member.membershipStatusName}
                </Badge>
              </div>
              <div className="mt-3 text-[13px] leading-[1.6] text-n500">
                등급 · 상태는 변경 이력을 남겨야 해 이 화면에서 바꾸지 않습니다. 상세 화면에서
                사유와 함께 변경합니다.
              </div>
            </Card>

            <Button
              block
              className="py-[13px]"
              onClick={() => void save()}
              disabled={editor.saving || !editor.dirty}
              title={editor.dirty ? undefined : "변경된 내용이 없습니다"}
            >
              {editor.saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
