"use client";

import { type RagDocument } from "@/entities/rag-document";
import { Sheet } from "@/shared/ui";

/*
 * 삭제·적용 전환 확인 (#432).
 *
 * **재색인에는 확인이 없다** — 되돌릴 것이 없고 결과가 같다. 확인을 받는 것은 되돌릴 수 없거나
 * (삭제) 그 사이의 답변이 바뀌는(사용 전환) 조작 둘뿐이다.
 */

/**
 * 문서를 한 줄로 가리킨다.
 *
 * **판본 번호를 붙이던 자리다**(서버 ADR-0034). 표가 «문서 종류 × 판본»이던 시절에는 이름만으로
 * 어느 줄인지 갈리지 않아 `v1`을 함께 찍었는데, 문서 한 건이 곧 그 규정이 되며 그 구분이 필요
 * 없어졌다. 이름이 겹치면 원본 파일명이 그 자리를 맡는다.
 */
function describe(doc: RagDocument): string {
  return doc.name || doc.originalFileName || "이름 없는 문서";
}

/**
 * 삭제 — **하드 삭제**다. 행·청크·R2 원본이 함께 사라지고 되살리는 길은 같은 파일을 다시
 * 올리는 것뿐이다.
 *
 * **«답변에 사용 중»인 문서면 문구를 달리한다**(#432). 지우는 순간 그 규정에 대한 답이
 * 사라지는데, 미사용·제외된 문서를 지우는 것과 같은 문장으로 물으면 그 차이가 화면에서
 * 드러나지 않는다.
 */
export function RagDeleteConfirm({
  target,
  onClose,
  onConfirm,
}: Readonly<{
  target: RagDocument | null;
  onClose: () => void;
  onConfirm: (doc: RagDocument) => void;
}>) {
  if (!target) return null;
  const effective = target.applyStatus === "EFFECTIVE";

  return (
    <Sheet
      open
      title="규정 문서를 지울까요?"
      hint={describe(target)}
      onClose={onClose}
      onOk={() => onConfirm(target)}
      okLabel="삭제"
      okVariant="danger"
    >
      <div className="text-[14px] leading-[1.8] text-n400">
        {effective ? (
          <>
            <span className="text-danger">지금 답변에 쓰이는 문서입니다.</span> 지우면 도우미가
            이 규정에 대해 더 이상 답하지 못합니다 — 대신할 문서를 먼저 올려 사용한 뒤 지우는 것을
            권합니다.
          </>
        ) : (
          <>
            문서와 색인된 내용, 올린 원본 파일이 함께 사라집니다.
          </>
        )}
        <div className="mt-2">되살리는 길은 같은 파일을 다시 올리는 것뿐입니다.</div>
      </div>
    </Sheet>
  );
}

/**
 * 적용 전환 — `DRAFT → EFFECTIVE`(답변에 사용) · `EFFECTIVE → SUPERSEDED`(답변에서 영구 제외).
 *
 * ── 두 방향의 무게가 다르다 (#468) ────────────────────────────
 * **성립하는 전이는 위 둘뿐이고 `SUPERSEDED → EFFECTIVE`는 없다.** 제외하는 순간 색인된
 * 내용이 지워지므로 되돌리려면 같은 파일을 다시 올려 처음부터 색인해야 한다 — 상태만 되돌리는
 * 길이 없다.
 *
 * 그래서 제외 쪽만 `danger`로 세우고 첫 문장에서 그 사실을 말한다. 두 버튼 이름이
 * «답변에 사용 ↔ 답변에서 제외»로 **완벽히 대칭이라** 서로의 반대말로 읽히는데, 실제로는 한쪽만
 * 되돌아오기 때문이다(«내리기 ↔ 시행»이던 시절에도 같은 오해가 있었고, 어휘를 고르며 오히려
 * 짙어졌다). 버튼 이름에 «영구»가 들어간 것도 **누르기 전에** 그 비대칭을 알리기 위해서다.
 *
 * **다른 행은 움직이지 않는다**(서버 ADR-0034). 예전에는 사용 전환 하나가 같은 문서의 기존
 * 사용본을 함께 내려서 «한 번의 확인이 두 행을 움직인다»를 문구가 밝혀야 했는데, 판본 관리를
 * 걷어내며 그 연쇄가 사라졌다.
 */
export function RagApplyConfirm({
  target,
  onClose,
  onConfirm,
}: Readonly<{
  target: RagDocument | null;
  onClose: () => void;
  onConfirm: (doc: RagDocument) => void;
}>) {
  if (!target) return null;
  const down = target.applyStatus === "EFFECTIVE";

  return (
    <Sheet
      open
      title={down ? "답변에서 영구 제외할까요?" : "답변에 사용할까요?"}
      hint={describe(target)}
      onClose={onClose}
      onOk={() => onConfirm(target)}
      okLabel={down ? "영구 제외" : "사용"}
      okVariant={down ? "danger" : undefined}
    >
      <div className="text-[14px] leading-[1.8] text-n400">
        {down ? (
          <>
            <span className="text-danger">한 번 제외하면 다시 사용할 수 없습니다.</span> 이 문서는
            답변 근거에서 빠지고 색인된 내용도 지워집니다.
            <div className="mt-2">되돌리는 길은 같은 파일을 다시 올리는 것뿐입니다.</div>
          </>
        ) : (
          <>
            오늘부터 이 문서가 답변의 근거가 됩니다. 이미 사용 중인 다른 문서는 그대로
            남습니다 — 개정된 규정이라면 옛 문서를 따로 지워주세요.
          </>
        )}
      </div>
    </Sheet>
  );
}
