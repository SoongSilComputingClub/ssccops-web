"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoleStore } from "@/entities/role";
import { ROUTES } from "@/shared/config/routes";
import {
  Button,
  Card,
  PageBody,
  PageHeader,
  Segmented,
  TextField,
  flash,
} from "@/shared/ui";

export function RoleLabelsPage() {
  const router = useRouter();
  const { roles, roleClsfs, addRoleClsf, renameRoleClsf, removeRoleClsf } =
    useRoleStore();
  const [newNm, setNewNm] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editNm, setEditNm] = useState("");

  const rolesOf = (roleClsfCd: string) =>
    roles.filter((r) => r.roleClsfCd === roleClsfCd);

  const add = () => {
    const nm = newNm.trim();
    if (!nm) {
      flash("분류명을 입력하세요");
      return;
    }
    if (roleClsfs.some((c) => c.roleClsfNm === nm)) {
      flash("이미 있는 분류입니다");
      return;
    }
    addRoleClsf(nm);
    setNewNm("");
    flash(`${nm} 분류 추가됨`);
  };

  const saveEdit = (roleClsfCd: string, oldNm: string) => {
    const nm = editNm.trim();
    if (!nm) {
      flash("분류명을 입력하세요");
      return;
    }
    if (nm !== oldNm && roleClsfs.some((c) => c.roleClsfNm === nm)) {
      flash("이미 있는 분류입니다");
      return;
    }
    renameRoleClsf(roleClsfCd, nm);
    setEditing(null);
    flash(`${oldNm} → ${nm}`);
  };

  const remove = (roleClsfCd: string, roleClsfNm: string) => {
    const used = rolesOf(roleClsfCd).length;
    if (used > 0) {
      flash(`${used}개 역할이 사용 중입니다`);
      return;
    }
    removeRoleClsf(roleClsfCd);
    flash(`${roleClsfNm} 삭제됨`);
  };

  return (
    <>
      <PageHeader title="역할 관리" subtitle="분류 추가 · 이름 변경 · 삭제" />
      <PageBody>
        <div className="mb-4 flex items-center gap-3">
          <Segmented
            options={["역할 목록", "역할 분류"] as const}
            value="역할 분류"
            onChange={(v) => {
              if (v === "역할 목록") router.push(ROUTES.roles);
            }}
            className="w-[400px]"
          />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <TextField
            value={newNm}
            onChange={(e) => setNewNm(e.target.value)}
            placeholder="새 분류명"
            className="w-[240px]"
          />
          <Button onClick={add}>추가</Button>
        </div>

        <Card className="max-w-[820px] px-5 pt-4 pb-[6px]">
          <div className="grid grid-cols-[60px_200px_1fr_130px]">
            {["표시_순번", "역할_분류_명", "지정된 역할", "관리"].map((h) => (
              <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                {h}
              </div>
            ))}
            {roleClsfs.map((c) => {
              const assigned = rolesOf(c.roleClsfCd);
              const isEditing = editing === c.roleClsfCd;
              return (
                <div key={c.roleClsfCd} className="contents">
                  <div className="border-t border-black/5 py-3 text-[15px]">
                    {c.indctSeqno}
                  </div>
                  <div className="border-t border-black/5 py-3 text-[15px]">
                    {isEditing ? (
                      <input
                        value={editNm}
                        onChange={(e) => setEditNm(e.target.value)}
                        className="w-[160px] rounded-[8px] border border-accent bg-bg px-2 py-1 text-[14.5px] outline-none"
                      />
                    ) : (
                      <>
                        <span className="font-semibold">{c.roleClsfNm}</span>
                        <span className="ml-2 text-[13px] text-n500">
                          {assigned.length}개 역할
                        </span>
                      </>
                    )}
                  </div>
                  <div className="min-w-0 truncate border-t border-black/5 py-3 text-[15px] text-n400">
                    {assigned.map((r) => r.roleNm).join(" · ") || "지정된 역할 없음"}
                  </div>
                  <div className="flex gap-3 border-t border-black/5 py-3 text-[14px]">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(c.roleClsfCd, c.roleClsfNm)}
                          className="cursor-pointer text-accent"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="cursor-pointer text-n400"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(c.roleClsfCd);
                            setEditNm(c.roleClsfNm);
                          }}
                          className="cursor-pointer text-accent"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c.roleClsfCd, c.roleClsfNm)}
                          className="cursor-pointer text-n400 hover:text-danger"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="mt-3 text-[13.5px] text-n500">
          사용 중인 분류는 삭제할 수 없습니다. 분류명을 바꿔도 역할_분류_코드는
          그대로 유지됩니다.
        </div>
      </PageBody>
    </>
  );
}
