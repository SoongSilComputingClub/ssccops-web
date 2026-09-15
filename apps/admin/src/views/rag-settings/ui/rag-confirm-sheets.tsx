"use client";

import { RAG_APPLY_STATUS_NM, type RagDocument } from "@/entities/rag-document";
import { Sheet } from "@/shared/ui";

/*
 * 삭제·적용 전환 확인 (#432).
 *
 * **재색인에는 확인이 없다** — 되돌릴 것이 없고 결과가 같다. 확인을 받는 것은 되돌릴 수 없거나
 * (삭제) 그 사이의 답변이 바뀌는(시행 전환) 조작 둘뿐이다.
 */

/** 문서를 한 줄로 가리킨다 — 판본이 여러 줄인 표라 이름만으로는 어느 줄인지 갈리지 않는다 */
function describe(doc: RagDocument): string {
  const name = doc.name || doc.originalFileName || "이름 없는 문서";
  return `${name} (v${doc.version})`;
}

/**
 * 삭제 — **하드 삭제**다. 행·청크·R2 원본이 함께 사라지고 되살리는 길은 같은 파일을 다시
 * 올리는 것뿐이다.
 *
 * **«시행 중» 문서면 문구를 달리한다**(#432). 지우는 순간 그 규정에 대한 답이 사라지는데,
 * 개정안·옛 판본을 지우는 것과 같은 문장으로 물으면 그 차이가 화면에서 드러나지 않는다.
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
            <span className="text-danger">지금 시행 중인 판본입니다.</span> 지우면 도우미가 이
            규정에 대해 더 이상 답하지 못합니다 — 대신할 판본을 먼저 시행한 뒤 지우는 것을
            권합니다.
          </>
        ) : (
          <>
            문서와 색인된 내용, 올린 원본 파일이 함께 사라집니다.
          </>
        )}
        <div className="mt-2">
          되살리는 길은 같은 파일을 새 판본으로 다시 올리는 것뿐입니다.
        </div>
      </div>
    </Sheet>
  );
}

/**
 * 적용 전환 — `DRAFT → EFFECTIVE`(시행) · `EFFECTIVE → SUPERSEDED`(내리기).
 *
 * 시행 전환에 확인을 받는 것은 **되돌릴 수는 있지만 그 사이의 답변이 바뀌기** 때문이다.
 * 같은 문서에 이미 시행본이 있으면 그것이 같은 트랜잭션에서 옛 판본으로 내려간다 — 한 번의
 * 확인이 두 행을 움직이므로 그 사실을 문구가 밝힌다.
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
      title={down ? "옛 판본으로 내릴까요?" : "시행 중으로 올릴까요?"}
      hint={describe(target)}
      onClose={onClose}
      onOk={() => onConfirm(target)}
      okLabel={down ? "내리기" : "시행"}
    >
      <div className="text-[14px] leading-[1.8] text-n400">
        {down ? (
          <>
            내리면 이 판본은 답변 근거에서 빠지고 색인된 내용도 지워집니다. 다시 시행할 수는
            없으므로, 되돌리려면 같은 파일을 새 판본으로 올려야 합니다.
          </>
        ) : (
          <>
            오늘부터 이 판본이 답변의 근거가 됩니다. 같은 문서에 이미 시행 중인 판본이 있으면
            그 판본은 «{RAG_APPLY_STATUS_NM.SUPERSEDED}»으로 함께 내려갑니다.
          </>
        )}
      </div>
    </Sheet>
  );
}
