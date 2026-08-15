"use client";

import { useRouter } from "next/navigation";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useRoleEditor } from "@/features/role";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  SectionLabel,
  TextField,
  flash,
} from "@/shared/ui";
import type { RoleMember } from "@/entities/role";

/*
 * 역할 추가·수정 (/members/roles/new · /members/roles/{roleId}/edit · #49 · 서버 #79).
 *
 * ── 화면 안에서 권한을 한 번 더 막는다 ──────────────────────────
 * 역할 API 는 조회까지 ROLE_MANAGE 를 요구하는데(서버 #79 · VR-M12) 사이드바의 '역할 관리'
 * 메뉴에는 `requires` 가 없다 — 어긋남의 자세한 사정은 views/role-list 의 주석에 있다.
 *
 * ── 이름 중복을 화면이 판정하지 않는다 ──────────────────────────
 * 예전에는 목 스토어의 목록을 훑어 같은 이름을 찾았다. 그 목록은 이 브라우저가 마지막으로
 * 받은 것이라 그 사이에 만들어진 역할을 알지 못한다. 판정은 서버의 409 ROLE_NAME_DUPLICATED
 * 하나이고, 화면은 그 응답을 입력란 아래에 그대로 옮긴다.
 *
 * ── 표시 순번 입력란을 두지 않는다 ──────────────────────────────
 * `indctSeqno` 를 보내지 않으면 서버가 같은 분류 안의 최대값 + 1 로 채운다. 순번은 분류
 * 안에서만 뜻이 있는 값이라(VR-M11) 사용자가 숫자를 직접 넣으면 다른 역할과 겹치거나 빈
 * 자리가 생기는데, 그것을 화면에서 다시 정리할 방법이 없다. 순서를 옮기는 화면이 따로
 * 필요해지면 그때 연다.
 *
 * ── 삭제 버튼을 열지 않는다 ─────────────────────────────────────
 * 서버는 **한 번이라도 배정된 적이 있으면**(종료된 배정도 이력으로 본다) 또는 권한이 붙어
 * 있으면 409 ROLE_IN_USE 로 거절한다. 실제로 쓰이던 역할은 사실상 전부 여기 걸리므로 버튼을
 * 두면 사용자는 누를 때마다 실패만 보게 되고, "왜 어떤 역할은 지워지고 어떤 역할은 안 되는가"
 * 를 화면이 설명할 방법도 없다(재임자 수 0 은 삭제 가능의 근거가 아니다 — 기준이 다르다).
 * 잘못 만든 역할은 이름을 고쳐 계속 쓰는 편이 낫다. entities/role/api/roles.ts 에 deleteRole
 * 계약만 남겨 두었다.
 *
 * ── '재임 회원' 은 단건 응답에서 받는다 ─────────────────────────
 * 목 회원 스토어를 훑지 않는다. 서버가 오늘이 배정 기간 안에 드는 배정만 골라 내려주며,
 * 그 기준은 목록의 `memberCount` 와 같아 두 화면의 숫자가 갈리지 않는다.
 */

const NO_MANAGE =
  "역할을 다룰 권한(ROLE_MANAGE)이 없습니다 — 최고운영자에게 요청해주세요";

export function RoleEditPage({ roleId }: { roleId?: number }) {
  const canManageRole = useCan(CAPABILITY.ROLE_MANAGE);

  // 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 — 조회 자체가 나가지 않는다
  if (!canManageRole) {
    return (
      <>
        <PageHeader title="역할" showBack />
        <PageBody>
          <EmptyState message={NO_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <RoleEditorView roleId={roleId} />;
}

function RoleEditorView({ roleId }: { roleId?: number }) {
  const router = useRouter();
  const editor = useRoleEditor(roleId);

  const save = async () => {
    const saved = await editor.save();
    if (!saved) return;
    flash(editor.editing ? `${saved.roleNm} 저장됨` : `${saved.roleNm} 추가됨`);
    router.replace(ROUTES.roles);
  };

  return (
    <>
      <PageHeader
        title={editor.editing ? "역할 수정" : "역할 추가"}
        subtitle="역할_명 · 역할_분류"
        showBack
      />
      <PageBody maxWidth={1040}>
        {editor.status === "loading" && <EmptyState message="불러오는 중…" />}
        {editor.status === "error" && (
          <EmptyState
            message={editor.errorMessage || "역할을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: editor.reload }}
          />
        )}

        {editor.status === "ready" && (
          <div className="grid grid-cols-[1.2fr_1fr] items-start gap-4">
            <div className="flex flex-col gap-4">
              <Card>
                <SectionLabel className="mb-3">
                  {editor.editing ? "역할 수정" : "새 역할 추가"}
                </SectionLabel>
                <div className="mb-[6px] text-[13.5px] text-n400">역할_명</div>
                <TextField
                  value={editor.roleNm}
                  onChange={(e) => editor.setRoleNm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void save();
                  }}
                  invalid={Boolean(editor.saveErrorMessage)}
                  placeholder="역할명"
                />
                {editor.saveErrorMessage && (
                  <div className="mt-[6px] text-[13.5px] leading-[1.6] text-danger">
                    {editor.saveErrorMessage}
                  </div>
                )}
                <div className="mt-2 text-[13.5px] text-n500">
                  {editor.editing
                    ? `${editor.memberCount}명 재임`
                    : "표시 순번은 저장할 때 이 분류의 맨 뒤로 정해집니다"}
                </div>
                <Button
                  className="mt-4 px-[22px] py-3"
                  onClick={() => void save()}
                  disabled={editor.saving || !editor.dirty}
                  title={editor.dirty ? undefined : "변경된 내용이 없습니다"}
                >
                  {editor.saving ? "저장 중…" : "저장"}
                </Button>
              </Card>

              <Card>
                <div className="mb-3 flex items-center">
                  <SectionLabel>역할_분류</SectionLabel>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.roleLabels)}
                    className="cursor-pointer text-[14px] text-accent"
                  >
                    분류 관리 ›
                  </button>
                </div>
                {editor.classifications.length === 0 ? (
                  <EmptyState message="등록된 분류가 없습니다." padding="sm" />
                ) : (
                  <div className="flex flex-wrap gap-[7px]">
                    {editor.classifications.map((c) => (
                      <Chip
                        key={c.roleClsfCd}
                        active={editor.roleClsfCd === c.roleClsfCd}
                        onClick={() => editor.setRoleClsfCd(c.roleClsfCd)}
                      >
                        {c.roleClsfNm}
                      </Chip>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-[13.5px] leading-[1.6] text-n500">
                  분류는 하나만 지정됩니다. 역할 목록에서 분류로 필터할 수 있습니다.
                  {editor.editing &&
                    " 분류를 옮기면 표시 순번은 새 분류의 맨 뒤로 다시 매겨집니다."}
                </div>
              </Card>
            </div>

            <HoldersCard members={editor.members} editing={editor.editing} />
          </div>
        )}
      </PageBody>
    </>
  );
}

/**
 * 재임 회원.
 *
 * 배정 **행** 단위라 한 회원이 두 번 나올 수 있다 — 같은 역할이 기간이 겹치게 두 번 배정된
 * 데이터에서만 생기는데, 서버가 접어 감추지 않는 것은 화면에 보여야 고칠 수 있기 때문이다.
 * 그래서 key 도 mbrId 가 아니라 배정을 가르는 값들을 합쳐 만든다.
 */
function HoldersCard({
  members,
  editing,
}: {
  members: readonly RoleMember[];
  editing: boolean;
}) {
  const router = useRouter();

  return (
    <Card>
      <SectionLabel className="mb-3">재임 회원</SectionLabel>
      {members.length === 0 ? (
        <EmptyState
          message={editing ? "재임 중인 회원이 없습니다." : "저장 후 집계됩니다."}
          padding="sm"
        />
      ) : (
        <div className="flex flex-col">
          {members.map((m) => (
            <div
              key={`${m.mbrId}-${m.roleBgngYmd}-${m.roleEndYmd ?? ""}`}
              onClick={() => router.push(ROUTES.memberDetail(m.mbrId))}
              className="cursor-pointer border-t border-black/5 py-3 first:border-t-0"
            >
              <div className="flex items-center gap-[6px]">
                <span className="text-[15.5px] font-semibold hover:text-accent">
                  {m.mbrNm}
                </span>
                {/* 대표 역할은 그 회원이 프로필에 내거는 역할이라는 표시일 뿐이다 —
                    인가 판정은 이 값을 보지 않는다 (BR-M26) */}
                {m.rprsRoleYn && <Badge tone="outline-accent">대표</Badge>}
              </div>
              <div className="mt-[2px] text-[13.5px] text-n500">
                {m.stdntNo} · {m.roleBgngYmd} ~ {m.roleEndYmd ?? "무기한"}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 text-[13.5px] leading-[1.6] text-n500">
        지금 이 역할을 맡고 있는 회원입니다. 지난 재임은 여기 나오지 않습니다.
      </div>
    </Card>
  );
}
