import type { QitemCpstCn, RspnsCn } from "@ssccops/form-renderer";
import { Card } from "@/shared/ui";

/*
 * 내가 낸 답 — 읽기 전용 (ssccops-web#358).
 *
 * ── 왜 필요한가 ────────────────────────────────────────────
 * 이 화면은 재제출 폼만 그리고 있었다. 재제출이 열리지 않는 응답(최종 제출·승인·반려)에서는
 * 답을 그릴 자리가 아예 없어, 상세로 들어와도 **자기가 무엇을 냈는지 볼 수 없었다.** 조회를
 * 여는 것이 이 작업의 요점이므로 그 자리를 여기서 만든다.
 *
 * 재제출이 열린 응답에는 그리지 않는다 — `ResubmitForm`이 같은 답을 프리필로 이미 보여준다.
 *
 * ── 낸 답만 그린다 ─────────────────────────────────────────
 * 서버는 빈 값인 key를 뺀 뒤의 답을 준다(`rspnsCn` 주석). 그래서 **답이 있는 문항만** 남기는
 * 것이 곧 서버가 보관한 것 그대로다. 분기로 지나지 않은 문항까지 "답하지 않음"으로 늘어놓으면
 * 실제로 낸 답이 그 사이에 묻힌다.
 *
 * 값은 손대지 않는다 — 다중선택만 배열이라 줄로 나눠 그릴 뿐이고, 날짜도 서버가 준 문자열
 * 그대로다(표기를 여기서 지어내면 제출한 값과 다른 것이 보인다).
 */
export function ResponseAnswers({
  composition,
  answers,
}: Readonly<{
  composition: QitemCpstCn;
  answers: RspnsCn;
}>) {
  const answered = composition.qitems.filter((qitem) => hasAnswer(answers[qitem.qitemId]));

  if (answered.length === 0) {
    return (
      <Card>
        <div className="text-[15px] font-semibold">낸 답</div>
        <p className="mt-[6px] text-[14px] text-n300">
          {composition.qitems.length === 0
            ? "이 폼의 문항을 불러오지 못했습니다 — 화면을 새로고침해주세요"
            : "저장된 답이 없습니다."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-[12px]">
      <div className="text-[15px] font-semibold">낸 답</div>

      <dl className="flex flex-col gap-[12px]">
        {answered.map((qitem) => (
          <div key={qitem.qitemId} className="flex flex-col gap-[3px]">
            <dt className="text-[13.5px] text-n500">{qitem.qitemLblNm}</dt>
            <dd className="text-[15px] leading-[1.7] whitespace-pre-line">
              {toLines(answers[qitem.qitemId]).join("\n")}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function toLines(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter((line) => line.trim() !== "");
}

function hasAnswer(value: string | string[] | undefined): boolean {
  return toLines(value).length > 0;
}
