"use client";

import { useState } from "react";
import {
  findAuthority,
  flattenAuthorities,
  parentCandidates,
  type AuthorityNode,
} from "@/entities/authority";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useAuthorityTree, type AuthorityTreeAdmin } from "@/features/authority";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  SelectField,
  TextArea,
  TextField,
  flash,
} from "@/shared/ui";

/*
 * 권한 트리 관리 (#32 · 서버 #65).
 *
 * 사용자 정의 묶음 권한을 만들고 이름·설명·상위·순번을 고치고 지운다. 이 화면이 있어야
 * "배포 없이 유연한 권한 체계" 가 실제로 체감된다 — 그전까지 묶음 하나 만드는 일이 SQL 작업이다.
 *
 * ── 시스템 권한을 감추지 않고 잠근다 ────────────────────────────
 * `sysYn` 권한은 코드(`@RequireAuthority`)가 직접 가리키는 값이라 삭제·코드 변경이 막혀 있다.
 * 그렇다고 목록에서 빼면 트리의 절반이 사라져 묶음이 무엇을 포함하는지 볼 수 없게 된다. 그래서
 * 보이되 **무엇이 잠겼는지가 화면에 드러나게** 한다 — 이름·설명·상위·순번 입력란은 열려 있고,
 * 코드는 읽기 전용, 삭제 버튼은 사유가 붙은 채 잠긴다.
 *
 * ── 상위 후보에서 자기 자신·자손을 뺀다 ──────────────────────────
 * 서버도 400 AUTHORITY_CYCLE_DETECTED 로 막지만, 고를 수 없는 값을 목록에 남겨 두면 사용자는
 * 고르고 저장하고 나서야 거절당한다 (entities/authority/model/tree.ts 의 parentCandidates).
 *
 * ── 접근 제어 ──────────────────────────────────────────────────
 * 조회(GET /v1/authorities)부터 ROLE_MANAGE 를 요구하므로 권한이 없으면 화면을 열지 않는다.
 * 판정은 #29 의 useCan 하나만 쓴다.
 */

const NO_MANAGE =
  "권한 관리(ROLE_MANAGE) 권한이 없어 권한 트리를 볼 수 없습니다 — 최고운영자에게 요청해주세요";

const SYS_LOCKED = "시스템 권한은 코드를 바꾸거나 삭제할 수 없습니다 — 코드가 직접 참조합니다";

export function AuthorityTreePage() {
  const canManage = useCan(CAPABILITY.ROLE_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 — 권한이 없으면 조회도 나가지 않는다 */
  if (!canManage) {
    return (
      <>
        <PageHeader title="권한 관리" />
        <PageBody>
          <EmptyState message={NO_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <AuthorityTreeAdminView />;
}

/** 편집 폼의 값 — 서버가 받는 필드와 1:1 이다 */
interface AuthorityFormValues {
  authrtCd: string;
  authrtNm: string;
  upAuthrtCd: string;
  authrtExpln: string;
  indctSeqno: string;
}

const EMPTY_VALUES: AuthorityFormValues = {
  authrtCd: "",
  authrtNm: "",
  upAuthrtCd: "",
  authrtExpln: "",
  indctSeqno: "",
};

function toFormValues(node: AuthorityNode): AuthorityFormValues {
  return {
    authrtCd: node.authrtCd,
    authrtNm: node.authrtNm,
    upAuthrtCd: node.upAuthrtCd ?? "",
    authrtExpln: node.authrtExpln ?? "",
    indctSeqno: node.indctSeqno === null ? "" : String(node.indctSeqno),
  };
}

function AuthorityTreeAdminView() {
  const admin = useAuthorityTree();

  /** null 이면 "새 권한" 폼 */
  const [selected, setSelected] = useState<string | null>(null);
  /*
   * 폼 값을 조회 결과에서 **이펙트로 옮겨 심지 않는다.** 초안에 키를 달아 두고 키가 맞을 때만
   * 초안을 쓰면, 다른 노드를 고르거나 저장이 끝나 키가 바뀌는 순간 초안은 자동으로 "남의 것" 이
   * 되어 서버 값으로 되돌아간다 (react-hooks/set-state-in-effect 를 피하는 방법이기도 하다).
   */
  const [formRev, setFormRev] = useState(0);
  const [draft, setDraft] = useState<{ key: string; values: AuthorityFormValues } | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const node = selected === null ? null : findAuthority(admin.tree, selected);
  const formKey = `${selected ?? "*new*"}|${formRev}`;
  const base = node === null ? EMPTY_VALUES : toFormValues(node);
  const values = draft?.key === formKey ? draft.values : base;

  const setValue = (patch: Partial<AuthorityFormValues>) => {
    setDraft({ key: formKey, values: { ...values, ...patch } });
    admin.clearMutationError();
  };

  /** 폼을 서버 값으로 되돌린다 — 저장 성공·대상 변경 뒤에 부른다 */
  const resetForm = (next: string | null) => {
    setSelected(next);
    setDraft(null);
    setConfirmDelete(false);
    setFormRev((r) => r + 1);
    admin.clearMutationError();
  };

  /* 새 권한의 기본 순번은 형제 수 + 1 — 서버가 정하는 값이 아니라 사람이 고르는 값이다 */
  const siblingCount =
    values.upAuthrtCd === ""
      ? admin.tree.length
      : (findAuthority(admin.tree, values.upAuthrtCd)?.children.length ?? 0);

  const submit = async () => {
    const input = {
      authrtNm: values.authrtNm.trim(),
      upAuthrtCd: values.upAuthrtCd || null,
      authrtExpln: values.authrtExpln.trim(),
      indctSeqno: Number(values.indctSeqno || siblingCount + 1),
    };

    if (node === null) {
      const authrtCd = values.authrtCd.trim().toUpperCase();
      if (await admin.create({ ...input, authrtCd })) {
        flash(`${input.authrtNm} 권한을 만들었습니다`);
        resetForm(authrtCd);
      }
      return;
    }

    if (await admin.update(node.authrtCd, input)) {
      flash(`${input.authrtNm} 권한을 수정했습니다`);
      resetForm(node.authrtCd);
    }
  };

  const remove = async () => {
    if (node === null) return;
    if (await admin.remove(node.authrtCd)) {
      flash(`${node.authrtNm} 권한을 삭제했습니다`);
      resetForm(null);
    }
    setConfirmDelete(false);
  };

  return (
    <>
      <PageHeader
        title="권한 관리"
        subtitle="사용자 정의 묶음 권한 생성 · 이름/설명/상위 변경 · 삭제"
        action={{ label: "+ 새 권한", onClick: () => resetForm(null) }}
      />
      <PageBody maxWidth={1100}>
        {admin.status === "loading" && <EmptyState message="불러오는 중…" />}
        {admin.status === "error" && (
          <EmptyState
            message={admin.errorMessage || "권한 트리를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: admin.reload }}
          />
        )}

        {admin.status === "ready" && (
          /*
           * 좁은 화면에서는 1열로 쌓는다 — 트리가 위, 고른 권한의 편집 폼이 아래다.
           * 트리에서 무엇을 골랐는지는 배경색으로 드러나므로 폼이 아래로 내려가도
           * 대상이 흐려지지 않는다. 펼침 계산은 서버 규칙 그대로이고 여기서 손대지 않는다.
           */
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
            <AuthorityList
              admin={admin}
              selected={selected}
              onSelect={(cd) => resetForm(cd)}
            />
            <AuthorityForm
              admin={admin}
              node={node}
              values={values}
              setValue={setValue}
              siblingCount={siblingCount}
              onSubmit={() => void submit()}
              confirmDelete={confirmDelete}
              onAskDelete={() => setConfirmDelete(true)}
              onCancelDelete={() => setConfirmDelete(false)}
              onDelete={() => void remove()}
            />
          </div>
        )}
      </PageBody>
    </>
  );
}

function AuthorityList({
  admin,
  selected,
  onSelect,
}: {
  admin: AuthorityTreeAdmin;
  selected: string | null;
  onSelect: (authrtCd: string) => void;
}) {
  const rows = flattenAuthorities(admin.tree);

  return (
    <Card className="px-5 pt-4 pb-[10px]">
      <SectionLabel className="mb-2">권한 트리 · {rows.length}개</SectionLabel>
      {rows.length === 0 ? (
        <EmptyState message="등록된 권한이 없습니다." padding="sm" />
      ) : (
        rows.map(({ node, depth }) => (
          <button
            key={node.authrtCd}
            type="button"
            onClick={() => onSelect(node.authrtCd)}
            className={
              selected === node.authrtCd
                ? "block w-full cursor-pointer border-t border-black/5 bg-accent-soft py-[10px] text-left"
                : "block w-full cursor-pointer border-t border-black/5 py-[10px] text-left hover:bg-bg"
            }
            style={{ paddingLeft: 8 + depth * 22, paddingRight: 8 }}
          >
            <div className="flex flex-wrap items-center gap-[6px]">
              <span className="text-[15px] font-medium">{node.authrtNm}</span>
              <span className="font-mono text-[12.5px] text-n500">{node.authrtCd}</span>
              {node.sysYn && <Badge tone="outline">시스템</Badge>}
              {node.children.length > 0 && (
                <Badge tone="grey">하위 {node.children.length}</Badge>
              )}
            </div>
            {node.authrtExpln && (
              <div className="mt-[2px] text-[13px] text-n500">{node.authrtExpln}</div>
            )}
          </button>
        ))
      )}
    </Card>
  );
}

function AuthorityForm({
  admin,
  node,
  values,
  setValue,
  siblingCount,
  onSubmit,
  confirmDelete,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  admin: AuthorityTreeAdmin;
  /** null 이면 새 권한 */
  node: AuthorityNode | null;
  values: AuthorityFormValues;
  setValue: (patch: Partial<AuthorityFormValues>) => void;
  siblingCount: number;
  onSubmit: () => void;
  confirmDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const isNew = node === null;
  const sys = node?.sysYn ?? false;
  const candidates = parentCandidates(admin.tree, node?.authrtCd ?? null);

  return (
    <Card>
      <SectionLabel className="mb-3">
        {isNew ? "새 묶음 권한" : sys ? "시스템 권한 수정" : "권한 수정"}
      </SectionLabel>

      {sys && (
        <div className="mb-3 rounded-[12px] bg-bg px-[14px] py-[10px] text-[13px] leading-[1.6] text-n400">
          <Badge tone="outline">시스템</Badge> {SYS_LOCKED} 이름·설명·상위·순번은 바꿀 수 있습니다.
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Field label="권한 코드" required={isNew}>
          <TextField
            value={values.authrtCd}
            onChange={(e) => setValue({ authrtCd: e.target.value.toUpperCase() })}
            /*
             * 수정 화면에서는 읽기 전용이다. 시스템 권한이든 사용자 정의든 코드는 PK 이고
             * role_authrt_rel·자식 권한이 FK 로 가리키므로 값 하나를 갈아 끼우는 조작이 아니다.
             */
            readOnly={!isNew}
            disabled={!isNew}
            placeholder="STUDY_MANAGE"
            className="font-mono"
          />
          <div className="mt-[5px] text-[12.5px] text-n500">
            {isNew
              ? "대문자로 시작하고 대문자·숫자·밑줄만 씁니다. 서버 @RequireAuthority 가 가리키는 값과 같은 이름 공간입니다"
              : "코드는 PK 라 바꿀 수 없습니다 — 새로 만든 뒤 기존 권한을 삭제해주세요"}
          </div>
        </Field>

        <Field label="권한 이름" required>
          <TextField
            value={values.authrtNm}
            onChange={(e) => setValue({ authrtNm: e.target.value })}
            placeholder="스터디 관리"
          />
        </Field>

        <Field label="설명">
          <TextArea
            value={values.authrtExpln}
            onChange={(e) => setValue({ authrtExpln: e.target.value })}
            placeholder="이 권한이 무엇을 열어 주는지 적어 두면 역할에 부여할 때 판단이 쉽습니다"
          />
        </Field>

        <Field label="상위 권한">
          <SelectField
            value={values.upAuthrtCd}
            onChange={(e) => setValue({ upAuthrtCd: e.target.value })}
          >
            <option value="">(최상위 권한)</option>
            {candidates.map(({ node: c, depth }) => (
              <option key={c.authrtCd} value={c.authrtCd}>
                {"— ".repeat(depth)}
                {c.authrtNm} ({c.authrtCd})
              </option>
            ))}
          </SelectField>
        </Field>

        <Field label={`표시 순번 (비우면 ${siblingCount + 1})`}>
          <TextField
            type="number"
            value={values.indctSeqno}
            onChange={(e) => setValue({ indctSeqno: e.target.value })}
            placeholder={String(siblingCount + 1)}
          />
        </Field>
      </div>

      {admin.mutationErrorMessage && (
        <div className="mt-3 text-[13px] leading-[1.6] text-danger">
          {admin.mutationErrorMessage}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={onSubmit} disabled={admin.busy}>
          {admin.busy ? "저장 중…" : isNew ? "만들기" : "저장"}
        </Button>

        {!isNew &&
          (confirmDelete ? (
            <>
              <span className="text-[13.5px] text-danger">정말 삭제할까요?</span>
              <Button variant="ghost-danger" onClick={onDelete} disabled={admin.busy}>
                삭제
              </Button>
              <Button variant="ghost" onClick={onCancelDelete}>
                취소
              </Button>
            </>
          ) : (
            <Button
              variant="ghost-danger"
              onClick={onAskDelete}
              /*
               * 시스템 권한의 삭제는 감추지 않고 잠근다 — 버튼이 사라지면 "이 화면에 삭제가
               * 없는 것" 인지 "이 권한만 못 지우는 것" 인지 알 수 없다 (#29 의 판단과 같다).
               */
              disabled={sys || admin.busy}
              title={sys ? SYS_LOCKED : undefined}
            >
              삭제
            </Button>
          ))}
      </div>

      {!isNew && !sys && (
        <div className="mt-2 text-[13px] leading-[1.6] text-n500">
          역할에 부여돼 있거나 하위 권한이 달려 있으면 삭제할 수 없습니다 — 먼저 회수하거나
          하위를 다른 상위로 옮겨주세요.
        </div>
      )}
    </Card>
  );
}
