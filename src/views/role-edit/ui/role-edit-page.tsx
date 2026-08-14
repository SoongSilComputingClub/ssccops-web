"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currentRoleRels, genNoText, mbrGrdNm, useMbrStore } from "@/entities/member";
import { useRoleStore } from "@/entities/role";
import { ROUTES } from "@/shared/config/routes";
import {
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

export function RoleEditPage({ roleId }: { roleId?: number }) {
  const router = useRouter();
  const { roles, roleClsfs, addRole, renameRole, setRoleClsf } = useRoleStore();
  const { mbrs, mbrRoleRels } = useMbrStore();
  const existing = roleId ? roles.find((r) => r.roleId === roleId) : undefined;

  const [roleNm, setRoleNm] = useState(existing?.roleNm ?? "");
  const [roleClsfCd, setRoleClsfCd] = useState(
    existing?.roleClsfCd ?? roleClsfs[0]?.roleClsfCd ?? "POSITION",
  );

  const holders = existing
    ? mbrs.filter((m) =>
        currentRoleRels(mbrRoleRels, m.mbrId).some((r) => r.roleId === existing.roleId),
      )
    : [];

  const save = () => {
    const next = roleNm.trim();
    if (!next) {
      flash("역할_명을 입력하세요");
      return;
    }
    if (roles.some((r) => r.roleNm === next && r.roleId !== existing?.roleId)) {
      flash("이미 있는 역할입니다");
      return;
    }
    if (existing) {
      if (next === existing.roleNm && roleClsfCd === existing.roleClsfCd) {
        flash("변경된 내용이 없습니다");
        return;
      }
      if (next !== existing.roleNm) {
        renameRole(existing.roleId, next);
        flash(`${existing.roleNm} → ${next}`);
      }
      if (roleClsfCd !== existing.roleClsfCd) setRoleClsf(existing.roleId, roleClsfCd);
      router.replace(ROUTES.roles);
      return;
    }
    addRole(next, roleClsfCd);
    flash(`${next} 추가됨`);
    router.replace(ROUTES.roles);
  };

  return (
    <>
      <PageHeader
        title={existing ? "역할 수정" : "역할 추가"}
        subtitle="역할_명 · 역할_분류"
        showBack
      />
      <PageBody maxWidth={1040}>
        <div className="grid grid-cols-[1.2fr_1fr] items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">
                {existing ? "역할 수정" : "새 역할 추가"}
              </SectionLabel>
              <div className="mb-[6px] text-[13.5px] text-n400">역할_명</div>
              <TextField
                value={roleNm}
                onChange={(e) => setRoleNm(e.target.value)}
                placeholder="역할명"
              />
              <div className="mt-2 text-[13.5px] text-n500">
                {existing ? `${holders.length}명 재임` : "저장 후 집계됩니다"}
              </div>
              <Button className="mt-4 px-[22px] py-3" onClick={save}>
                저장
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
              <div className="flex flex-wrap gap-[7px]">
                {roleClsfs.map((c) => (
                  <Chip
                    key={c.roleClsfCd}
                    active={roleClsfCd === c.roleClsfCd}
                    onClick={() => setRoleClsfCd(c.roleClsfCd)}
                  >
                    {c.roleClsfNm}
                  </Chip>
                ))}
              </div>
              <div className="mt-3 text-[13.5px] text-n500">
                분류는 하나만 지정됩니다. 역할 목록에서 분류로 필터할 수 있습니다.
              </div>
            </Card>
          </div>

          <Card>
            <SectionLabel className="mb-3">재임 회원</SectionLabel>
            {holders.length === 0 ? (
              <EmptyState message="재임 중인 회원이 없습니다." padding="sm" />
            ) : (
              <div className="flex flex-col">
                {holders.map((m) => (
                  <div
                    key={m.mbrId}
                    onClick={() => router.push(ROUTES.memberDetail(m.mbrId))}
                    className="cursor-pointer border-t border-black/5 py-3 first:border-t-0"
                  >
                    <div className="text-[15.5px] font-semibold hover:text-accent">
                      {m.mbrNm}
                    </div>
                    <div className="mt-[2px] text-[13.5px] text-n500">
                      {genNoText(m)} · {mbrGrdNm(m.mbrGrdCd)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </PageBody>
    </>
  );
}
