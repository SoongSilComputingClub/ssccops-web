"use client";

import { useState } from "react";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useFormLabels } from "@/features/form";
import {
  Button,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  TextField,
  Toggle,
  flash,
} from "@/shared/ui";

/*
 * 폼_라벨 관리 (ssccops-server #34).
 *
 * 조회·추가·토글은 features/form(useFormLabels)이 전담한다. 이 파일은 목록을 그리고 입력을
 * 훅으로 넘기는 일만 한다.
 *
 * ── 이 화면에 "삭제"가 없는 이유 ────────────────────────────────
 * 라벨은 지우지 않고 사용_여부로 비활성화한다. 비활성 라벨은 신규 지정 후보와 목록 필터에서만
 * 빠지고, 이미 그 라벨이 걸린 폼의 지정은 그대로 남는다 — 지우면 과거 폼이 어떤 분류였는지가
 * 사라지기 때문이다. 그래서 목록에는 비활성 라벨도 취소선으로 계속 보인다(되돌릴 수 있어야 한다).
 *
 * "사용 중인 폼 N건"은 **서버 집계값(usageCount)** 이다. 예전에는 메모리의 formLblRels를 세었는데,
 * 그 배열은 이 브라우저가 들고 있는 목 데이터일 뿐이라 실제 지정 수와 무관했다.
 *
 * ── 권한 (#29 · 서버 #9) ───────────────────────────────────────
 * 목록 조회에는 서버가 권한을 걸지 않았고 추가·비활성화만 FORM_LABEL_MANAGE 를 요구한다.
 * 그래서 **화면은 누구에게나 열되 두 조작만 잠근다** — 감추면 라벨이 무엇무엇 있는지조차
 * 볼 수 없게 되는데, 폼 목록 필터의 분류 축을 알아야 할 사람은 관리 권한자보다 훨씬 많다.
 */

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_MANAGE = "라벨을 추가하거나 사용_여부를 바꿀 권한이 없습니다 — 조회만 할 수 있습니다";

export function FormLabelsPage() {
  const admin = useFormLabels();
  const canManage = useCan(CAPABILITY.FORM_LABEL_MANAGE);
  const [newLblNm, setNewLblNm] = useState("");

  const add = async () => {
    const lblNm = newLblNm.trim();
    if (await admin.add(newLblNm)) {
      setNewLblNm("");
      flash(`${lblNm} 라벨 추가됨`);
    }
  };

  return (
    <>
      <PageHeader title="라벨 관리" subtitle="사용_여부 토글" />
      <PageBody>
        <div className="mb-4 max-w-[640px]">
          <div className="flex items-center gap-2">
            <TextField
              value={newLblNm}
              onChange={(e) => setNewLblNm(e.target.value)}
              // 엔터로도 추가한다 — 여러 개를 이어서 넣는 화면이라 매번 버튼까지 가지 않게
              onKeyDown={(e) => {
                if (e.key === "Enter" && canManage) void add();
              }}
              disabled={!canManage}
              invalid={Boolean(admin.addErrorMessage)}
              placeholder="새 라벨_명"
              /*
               * input은 min-width:auto가 기본 size(약 20자)로 잡혀 플렉스 안에서 그
               * 아래로 줄지 않는다 — 260px 고정과 겹치면 좁은 화면에서 '추가' 버튼을
               * 화면 밖으로 밀어낸다. 상한만 남기고 min-w-0으로 줄 수 있게 푼다.
               */
              /*
               * iOS Safari는 16px 미만 입력란에 포커스가 가면 화면을 통째로 확대하고
               * 되돌리지 않는다 — TextField의 기본값 15.5px가 여기 걸린다. 데스크톱은
               * lg:text-[15.5px]로 기본값과 같은 값을 되돌려 둔다.
               */
              className="w-full max-w-[260px] min-w-0 text-[16px] lg:text-[15.5px]"
            />
            <Button
              onClick={() => void add()}
              disabled={admin.adding || !canManage}
              title={canManage ? undefined : NO_MANAGE}
            >
              {admin.adding ? "추가 중…" : "추가"}
            </Button>
          </div>
          {admin.addErrorMessage && (
            <div className="mt-[6px] text-[13px] text-danger">{admin.addErrorMessage}</div>
          )}
          {/*
            잠긴 입력란만 두면 왜 못 쓰는지가 툴팁에만 남는다 — 이 화면은 조작이 화면의
            전부라 사유를 한 줄로 밖에 꺼내 둔다.
          */}
          {!canManage && (
            <div className="mt-[6px] text-[13px] text-n500">{NO_MANAGE}</div>
          )}
        </div>

        {admin.status === "loading" && <EmptyState message="불러오는 중…" />}
        {admin.status === "error" && (
          <EmptyState
            message={admin.errorMessage || "라벨을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: admin.reload }}
          />
        )}

        {admin.status === "ready" &&
          (admin.labels.length === 0 ? (
            <EmptyState message="등록된 라벨이 없습니다." />
          ) : (
            <>
              {admin.toggleErrorMessage && (
                <div className="mb-3 max-w-[640px] text-[13.5px] text-danger">
                  {admin.toggleErrorMessage}
                </div>
              )}
              <Card className="max-w-[640px] px-5 pt-4 pb-[6px]">
                {/*
                  좁은 화면에서는 고정 열 두 개를 200px에서 152px로 줄인다 — 그만큼이
                  라벨_명 열로 가야 이름이 글자마다 접히지 않는다. 머리글("사용 중인 폼"
                  약 78px · "사용_여부" 약 59px)과 토글(38px)이 들어가는 하한이 이 값이다.
                */}
                <div className="grid grid-cols-[1fr_88px_64px] lg:grid-cols-[1fr_120px_80px]">
                  {["라벨_명", "사용 중인 폼", "사용_여부"].map((h) => (
                    <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                      {h}
                    </div>
                  ))}
                  {admin.labels.map((l) => (
                    <div key={l.formLblId} className="contents">
                      <div
                        className={
                          l.useYn
                            ? "border-t border-black/5 py-3 text-[15px] font-medium"
                            : "border-t border-black/5 py-3 text-[15px] text-n500 line-through"
                        }
                      >
                        {l.lblNm}
                      </div>
                      <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                        {l.usageCount}건
                      </div>
                      <div className="border-t border-black/5 py-3">
                        {/*
                          응답이 오기 전에 다시 눌리면 방금 바꾼 값을 되돌리게 된다 —
                          진행 중에는 훅이 요청을 막고, 여기서는 그 사실을 흐리게 보여 준다
                        */}
                        <Toggle
                          on={l.useYn}
                          onChange={() => void admin.toggle(l)}
                          disabled={!canManage}
                          title={canManage ? undefined : NO_MANAGE}
                          className={admin.isToggling(l.formLblId) ? "opacity-50" : undefined}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ))}
      </PageBody>
    </>
  );
}
