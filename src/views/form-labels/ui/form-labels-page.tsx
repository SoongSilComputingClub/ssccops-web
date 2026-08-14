"use client";

import { useState } from "react";
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
 * 권한: 추가·비활성화는 최고운영자 전용이지만 역할 인가(#9)가 아직 없다. 화면을 미리 막지 않고
 * 서버가 403으로 거절하면 그 사유를 그대로 보여 준다.
 */

export function FormLabelsPage() {
  const admin = useFormLabels();
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
                if (e.key === "Enter") void add();
              }}
              invalid={Boolean(admin.addErrorMessage)}
              placeholder="새 라벨_명"
              className="w-[260px]"
            />
            <Button onClick={() => void add()} disabled={admin.adding}>
              {admin.adding ? "추가 중…" : "추가"}
            </Button>
          </div>
          {admin.addErrorMessage && (
            <div className="mt-[6px] text-[13px] text-danger">{admin.addErrorMessage}</div>
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
                <div className="grid grid-cols-[1fr_120px_80px]">
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
