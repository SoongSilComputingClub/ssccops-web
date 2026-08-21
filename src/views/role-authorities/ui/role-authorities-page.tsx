"use client";

import { useRouter } from "next/navigation";
import { flattenAuthorities } from "@/entities/authority";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useRoleAuthorities, type RoleAuthoritiesEditor } from "@/features/authority";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  SectionLabel,
  flash,
} from "@/shared/ui";

/*
 * 역할별 권한 부여 (#32 · 서버 #65 · 상위 ssccops#70).
 *
 * ── 트리를 그대로 그린다 ────────────────────────────────────────
 * 평면 목록으로 펴면 묶음 권한의 의미가 사라진다. "운영진" 이 무엇을 포함하는 묶음인지가
 * 목록에서는 보이지 않아, 운영자는 묶음을 주고도 자손을 하나씩 다시 찾아 체크하게 된다.
 *
 * ── 하향 상속을 화면에 드러내는 방법 ─────────────────────────────
 * 상위를 체크하면 그 아래 전부가 **체크된 채 잠긴다.** 잠긴 줄에는 어느 상위에서 왔는지를
 * 이름으로 붙여, 풀고 싶으면 어느 줄의 체크를 풀어야 하는지가 바로 보이게 한다. 자손을 그냥
 * 꺼진 채로 두면 사용자는 "상위를 줬는데 왜 자손은 안 켜지지" 하며 하나씩 다시 체크하고,
 * 그렇게 만들어진 직접 부여는 나중에 상위를 회수해도 조용히 살아남는다.
 *
 * ── 저장된 상태의 근거는 언제나 서버다 ───────────────────────────
 * "지금 열려 있는 권한" 은 서버가 준 effectiveAuthrtCds 다. 화면이 계산하는 것은 **아직 저장하지
 * 않은 체크 상태의 미리 보기**뿐이고, 저장하면 다시 서버의 답으로 되돌아간다
 * (entities/authority/model/tree.ts 의 previewGrants 주석).
 *
 * ── 접근 제어 ──────────────────────────────────────────────────
 * ROLE_MANAGE 가 없으면 화면을 열지 않는다. 조회(GET)부터 서버가 막으므로 열어 봐야 오류
 * 화면뿐이고, 판정은 #29 의 useCan 하나만 쓴다.
 */

const NO_MANAGE =
  "권한 관리(ROLE_MANAGE) 권한이 없어 역할의 권한을 볼 수 없습니다 — 최고관리자에게 요청해주세요";

export function RoleAuthoritiesPage({ roleId }: { roleId: number }) {
  const canManage = useCan(CAPABILITY.ROLE_MANAGE);

  /*
   * 훅을 조건부로 부를 수 없으므로 편집기를 별도 컴포넌트로 뺀다. 이렇게 해야 권한이 없을 때
   * 조회 자체가 나가지 않는다 — 어차피 403 인 요청을 보내고 오류 문구로 덮는 것보다 정직하다.
   */
  if (!canManage) {
    return (
      <>
        <PageHeader title="역할 권한" showBack />
        <PageBody>
          <EmptyState message={NO_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <RoleAuthoritiesEditorView roleId={roleId} />;
}

function RoleAuthoritiesEditorView({ roleId }: { roleId: number }) {
  const router = useRouter();
  const editor = useRoleAuthorities(roleId);

  const save = async () => {
    if (await editor.save()) flash("역할 권한을 저장했습니다");
  };

  return (
    <>
      <PageHeader
        title={editor.roleNm ? `${editor.roleNm} 권한` : "역할 권한"}
        subtitle="체크한 권한이 이 역할에 부여됩니다 · 저장하면 기존 권한은 체크한 것으로 모두 바뀝니다"
        showBack
        action={{
          label: editor.saving ? "저장 중…" : "저장",
          onClick: () => void save(),
          disabled: editor.saving || !editor.dirty || editor.status !== "ready",
          title: editor.dirty ? undefined : "변경된 내용이 없습니다",
        }}
      />
      <PageBody maxWidth={1040}>
        {editor.status === "loading" && <EmptyState message="불러오는 중…" />}
        {editor.status === "error" && (
          <EmptyState
            message={editor.errorMessage || "역할 권한을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: editor.reload }}
          />
        )}

        {editor.status === "ready" && (
          <>
            <ChangeSummary editor={editor} onSave={() => void save()} />
            <AuthorityCheckTree editor={editor} />
            <div className="mt-3 text-[13.5px] text-n500">
              권한 트리 자체(묶음 만들기·이름·상위 변경)는{" "}
              <button
                type="button"
                onClick={() => router.push(ROUTES.authorities)}
                className="cursor-pointer text-accent"
              >
                권한 관리
              </button>
              에서 다룹니다.
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}

/**
 * 저장 전후 비교.
 *
 * 직접 부여의 차이(추가·회수)와 **실제로 열리는 권한 수의 변화**를 함께 보여 준다. 묶음을 하나
 * 체크했을 뿐인데 열리는 권한이 12개 늘어나는 일이 이 화면의 요점이라, 직접 부여만 보여 주면
 * 사용자는 자기가 얼마나 큰 것을 눌렀는지 모른 채 저장한다.
 */
function ChangeSummary({
  editor,
  onSave,
}: {
  editor: RoleAuthoritiesEditor;
  onSave: () => void;
}) {
  return (
    <Card className="mb-4">
      <div className="flex items-baseline gap-[10px]">
        <SectionLabel>변경분</SectionLabel>
        <div className="flex-1" />
        <div className="text-[13.5px] text-n500">
          실제 부여 권한 {editor.savedEffective.size}개
          {editor.dirty && ` → ${editor.preview.effective.size}개`}
        </div>
      </div>

      {editor.dirty ? (
        <div className="mt-3 flex flex-col gap-2">
          {editor.added.length > 0 && (
            <DiffLine tone="add" label="부여" items={editor.added} />
          )}
          {editor.removed.length > 0 && (
            <DiffLine tone="remove" label="회수" items={editor.removed} />
          )}
        </div>
      ) : (
        <div className="mt-3 text-[14.5px] text-n500">
          저장된 상태와 같습니다. 체크를 바꾸면 여기에 변경분이 나타납니다.
        </div>
      )}

      {editor.selfLockout && (
        <div className="mt-3 rounded-[12px] bg-danger/10 px-[14px] py-3 text-[13.5px] leading-[1.6] text-danger">
          <strong>스스로를 잠그는 저장입니다.</strong> 당신은 이 역할을 맡고 있고, 이 저장은 이
          역할에서 권한 관리(ROLE_MANAGE)를 회수합니다. 권한 관리 화면 자체가 이 권한을 요구하므로
          다른 역할로 같은 권한을 갖고 있지 않다면 이 화면을 포함해 권한을 되돌릴 방법이 사라지고,
          복구하려면 데이터베이스를 직접 고쳐야 합니다. 서버도 이 저장을 거절합니다.
        </div>
      )}

      {editor.saveErrorMessage && (
        <div className="mt-3 text-[13.5px] leading-[1.6] text-danger">
          {editor.saveErrorMessage}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onSave} disabled={editor.saving || !editor.dirty}>
          {editor.saving ? "저장 중…" : "저장"}
        </Button>
        <Button variant="ghost" onClick={editor.reset} disabled={!editor.dirty}>
          되돌리기
        </Button>
      </div>
    </Card>
  );
}

function DiffLine({
  tone,
  label,
  items,
}: {
  tone: "add" | "remove";
  label: string;
  items: readonly { authrtCd: string; authrtNm: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-[6px]">
      <Badge tone={tone === "add" ? "blue" : "red"}>
        {label} {items.length}
      </Badge>
      {items.map((i) => (
        <span key={i.authrtCd} className="text-[14px] text-n300">
          {i.authrtNm}
          <span className="ml-1 font-mono text-[12.5px] text-n500">{i.authrtCd}</span>
        </span>
      ))}
    </div>
  );
}

/** 체크박스 트리 — 들여쓰기로 계층을, 배지로 상속·변경분을 드러낸다 */
function AuthorityCheckTree({ editor }: { editor: RoleAuthoritiesEditor }) {
  const rows = flattenAuthorities(editor.tree);

  if (rows.length === 0) {
    return <EmptyState message="등록된 권한이 없습니다." />;
  }

  return (
    <Card className="px-5 pt-4 pb-[10px]">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-n500">
        <span>
          <Badge tone="outline-accent">상위에서 부여</Badge> 상위를 체크해 함께 부여된 권한입니다
          — 따로 체크할 필요가 없어 잠겨 있습니다
        </span>
        <span>
          <Badge tone="outline">시스템</Badge> 코드가 직접 참조하는 권한입니다
        </span>
      </div>

      {rows.map(({ node, depth }) => {
        const inheritedFromNm = editor.preview.inheritedFrom.get(node.authrtCd);
        const inherited = inheritedFromNm !== undefined;
        const direct = editor.directCodes.has(node.authrtCd);
        const willGrant = editor.preview.effective.has(node.authrtCd);
        const wasGranted = editor.savedEffective.has(node.authrtCd);

        return (
          <label
            key={node.authrtCd}
            className={
              inherited
                ? "flex cursor-default items-start gap-3 border-t border-black/5 py-[10px]"
                : "flex cursor-pointer items-start gap-3 border-t border-black/5 py-[10px]"
            }
            style={{ paddingLeft: depth * 22 }}
          >
            <input
              type="checkbox"
              className="mt-[3px] size-[17px] flex-none accent-accent disabled:cursor-not-allowed disabled:opacity-60"
              checked={direct || inherited}
              disabled={inherited}
              onChange={() => editor.toggle(node.authrtCd)}
              title={
                inherited
                  ? `상위 권한 「${inheritedFromNm}」이(가) 부여되어 함께 부여됩니다. 회수하려면 「${inheritedFromNm}」의 체크를 푸세요`
                  : undefined
              }
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-[6px]">
                <span
                  className={
                    inherited
                      ? "text-[15px] text-n400"
                      : "text-[15px] font-medium text-ink"
                  }
                >
                  {node.authrtNm}
                </span>
                <span className="font-mono text-[12.5px] text-n500">{node.authrtCd}</span>
                {node.sysYn && <Badge tone="outline">시스템</Badge>}
                {inherited && (
                  <Badge tone="outline-accent">상위 「{inheritedFromNm}」에서 부여</Badge>
                )}
                {/*
                  상위에서 부여되는데 직접 부여도 남아 있는 경우. 지우지 않고 그대로 보내는 것은
                  상위 체크를 다시 풀었을 때 원래 상태로 돌아가야 하기 때문이다 — 그 사실이
                  화면에 안 보이면 저장 본문에만 있는 값이 된다.
                */}
                {inherited && direct && <Badge tone="grey">직접 부여도 유지</Badge>}
                {willGrant && !wasGranted && <Badge tone="blue">저장 시 부여</Badge>}
                {!willGrant && wasGranted && <Badge tone="red">저장 시 회수</Badge>}
              </div>
              {node.authrtExpln && (
                <div className="mt-[2px] text-[13px] text-n500">{node.authrtExpln}</div>
              )}
            </div>
          </label>
        );
      })}
    </Card>
  );
}
