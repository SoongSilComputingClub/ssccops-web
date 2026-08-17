"use client";

import { mbrGrdTone, mbrSttsTone } from "@/entities/member";
import { useMyProfileEdit } from "@/features/member";
import {
  Badge,
  Button,
  Card,
  Field,
  KeyValueGrid,
  PageBody,
  PageHeader,
  Pill,
  SectionLabel,
  TextField,
  flash,
} from "@/shared/ui";
import { FIELD_LABEL } from "@/shared/config/labels";

/*
 * 내 계정 — 서버 세션(GET /v1/auth/session)의 회원 정보를 보여 주고, 본인이 고칠 수 있는
 * 네 항목을 여기서 고친다 (#47 · 서버 #77 · PATCH /v1/members/me).
 *
 * ── 왜 고칠 수 있는 것이 넷뿐인가 ───────────────────────────────
 * 서버가 본인 경로의 요청 본문에 이름·학과·학년·연락처만 두었고, 그 DTO를 운영진 경로와 나눈
 * 것 자체가 권한 차이의 표현이다. 화면도 같은 경계를 그린다 — 여기서 기수나 등급을 입력할 수
 * 있게 두면 저장은 되는데 값은 안 바뀌는 칸이 생긴다.
 *
 *  - 이메일   Supabase 인증 계정에서 오는 값이다. 여기서 바꾸면 로그인 계정과 갈린다.
 *  - 학번     가입 후 변경 불가로 확정됐다(데이터사전 ssccops#74).
 *  - 기수·등급·상태·역할  운영진이 정하는 값이라 '운영진만 변경할 수 있는 항목' 카드에 둔다.
 *
 * ── 저장 뒤 세션을 다시 조회하지 않는다 ─────────────────────────
 * 서버가 세션의 member와 같은 모양(`MemberProfileResponse`)을 돌려주므로 훅이 그대로 스토어에
 * 넣는다 — 사이드바 이름이 그 자리에서 바뀐다. 가입 응답을 그대로 쓰는 것과 같은 계약이다.
 *
 * 예전에는 목 회원 스토어를 고쳐 새로고침하면 사라지는 수정을 했고, 그것을 걷어낸 뒤로는
 * "프로필 수정은 회원 API 연동 이후에 열립니다"라고 적어 두었다. 그 API가 생겨 안내를 지운다.
 */
export function MyAccountPage() {
  const editor = useMyProfileEdit();
  const { member, values, errors, academicRequired } = editor;

  // AuthGate가 ready일 때만 이 화면이 열리므로 member는 사실상 항상 있다
  if (!member) return null;

  const genText = member.generationNumber ? `${member.generationNumber}기` : "미배정";

  const save = async () => {
    const saved = await editor.save();
    if (!saved) return;
    flash("프로필이 저장되었습니다");
  };

  return (
    <>
      <PageHeader title="내 계정" subtitle="프로필" />
      <PageBody>
        <Card className="mb-4">
          <div className="flex items-center gap-[10px]">
            <div className="text-[25px] font-medium">{member.name}</div>
            <Badge tone={mbrGrdTone(member.membershipGradeCode)}>
              {member.membershipGradeName}
            </Badge>
            <Badge tone={mbrSttsTone(member.membershipStatusCode)}>
              {member.membershipStatusName}
            </Badge>
            <div className="flex-1" />
            <div className="text-[14px] text-n500">
              회원 #{member.memberId} · {genText} ·{" "}
              {member.departmentName || "학과 미입력"}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
          <Card>
            <div className="mb-3 flex items-center">
              <SectionLabel>회원 정보</SectionLabel>
              <div className="flex-1" />
              {!editor.editing && (
                <button
                  type="button"
                  onClick={editor.start}
                  className="cursor-pointer text-[14px] text-accent"
                >
                  프로필 수정
                </button>
              )}
            </div>

            {editor.editing ? (
              <>
                <div className="grid grid-cols-2 gap-[14px]">
                  <Field label={FIELD_LABEL.memberName} required error={errors.name}>
                    <TextField
                      value={values.name}
                      onChange={(e) => editor.set({ name: e.target.value })}
                      invalid={!!errors.name}
                      placeholder="필수"
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
                  <Field
                    label={FIELD_LABEL.departmentName}
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
                    label={FIELD_LABEL.academicYear}
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

                  {/* 학번과 이메일은 고칠 수 없다 — 이유는 각 칸 아래 한 줄로 적는다 */}
                  <Field label={FIELD_LABEL.studentNumber}>
                    <div className="rounded-[12px] bg-bg px-[11px] py-[9px] text-[15.5px] text-n300">
                      {member.studentNumber || "미입력"}
                    </div>
                    <div className="mt-1 text-[12.5px] text-n500">
                      학번은 가입 후 바꿀 수 없습니다 — 잘못 적혔다면 운영진에게 문의해주세요
                    </div>
                  </Field>
                  <Field label="이메일">
                    <div className="rounded-[12px] bg-bg px-[11px] py-[9px] text-[15.5px] text-n300">
                      {member.email || "미입력"}
                    </div>
                    <div className="mt-1 text-[12.5px] text-n500">
                      로그인에 쓰는 소셜 계정에서 가져온 값이라 여기서 바꾸면 로그인 계정과
                      갈립니다
                    </div>
                  </Field>
                </div>

                <div className="mt-4 text-[13px] leading-[1.6] text-n500">
                  {academicRequired
                    ? "재학 회원은 학과 · 학년이 필수입니다. "
                    : "학과 · 학년은 선택입니다. "}
                  비워 둔 칸은 저장할 때 <b>지워집니다</b> — 네 항목을 통째로 저장합니다.
                </div>

                {editor.saveErrorMessage && (
                  <div className="mt-3 rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] leading-[1.6] text-danger">
                    {editor.saveErrorMessage}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" disabled={editor.saving} onClick={editor.cancel}>
                    취소
                  </Button>
                  <Button
                    className="flex-1 py-3"
                    onClick={() => void save()}
                    disabled={editor.saving || !editor.dirty}
                    title={editor.dirty ? undefined : "변경된 내용이 없습니다"}
                  >
                    {editor.saving ? "저장 중…" : "저장"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <KeyValueGrid
                  items={[
                    { k: FIELD_LABEL.memberName, v: member.name },
                    { k: FIELD_LABEL.studentNumber, v: member.studentNumber || "미입력" },
                    {
                      k: FIELD_LABEL.academicYear,
                      v: member.academicYear ? `${member.academicYear}학년` : "미입력",
                    },
                    { k: FIELD_LABEL.departmentName, v: member.departmentName || "미입력" },
                    { k: "전화번호", v: member.phoneNumber || "미입력" },
                    { k: "이메일", v: member.email || "미입력" },
                  ]}
                />
                <div className="mt-4 text-[13px] leading-[1.6] text-n500">
                  회원명 · 학과 · 학년 · 전화번호를 직접 고칠 수 있습니다. 이메일은
                  로그인에 쓰는 소셜 계정에서 가져온 값이라 여기서 바꾸지 않습니다.
                </div>
              </>
            )}
          </Card>

          <Card>
            <SectionLabel className="mb-3">운영진만 변경할 수 있는 항목</SectionLabel>
            <KeyValueGrid
              items={[
                {
                  k: FIELD_LABEL.generationNumber,
                  v: genText === "미배정" ? "미배정 · 운영진이 배정합니다" : genText,
                },
                {
                  k: FIELD_LABEL.membershipGrade,
                  v: (
                    <Badge tone={mbrGrdTone(member.membershipGradeCode)}>
                      {member.membershipGradeName}
                    </Badge>
                  ),
                },
                {
                  k: FIELD_LABEL.membershipStatus,
                  v: (
                    <Badge tone={mbrSttsTone(member.membershipStatusCode)}>
                      {member.membershipStatusName}
                    </Badge>
                  ),
                },
                {
                  // 대표 역할 하나가 아니라 지금 유효한 역할 전부를 보여준다 — 권한은
                  // 그 전부를 합쳐서 계산되므로(AuthorityPolicy) 대표 하나만 보이면 실제로
                  // 뭘 할 수 있는지를 이 화면만 보고는 알 수 없다
                  k: FIELD_LABEL.currentRoles,
                  v:
                    member.roles.length === 0 ? (
                      "없음"
                    ) : (
                      <div className="flex flex-wrap gap-[6px]">
                        {member.roles.map((role) => (
                          <span key={role.roleId} className="flex items-center gap-1">
                            <Badge tone="grey">{role.roleName}</Badge>
                            {role.representative && <Pill tone="blue">대표</Pill>}
                          </span>
                        ))}
                      </div>
                    ),
                },
                { k: FIELD_LABEL.joinDate, v: member.joinDate },
              ]}
            />
          </Card>
        </div>
      </PageBody>
    </>
  );
}
