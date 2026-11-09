import type { QitemCpstCn, RspnsCn } from "@ssccops/form-renderer";
import { rspnsValueText } from "@/entities/response";
import { Card } from "@/shared/ui";

/*
 * 지원서 답변 — 문항 순서대로 읽기 전용으로 그린다 (#826 · ssccops#625).
 *
 * **답이 없는 문항도 자리를 남긴다**(«(응답 없음)»). 어드민 응답 상세와 같은 규칙이다 — 지원서를
 * 읽는 사람에게는 «무엇을 비워 냈는가»도 읽을거리다. 기획안 상세(`proposal-detail`)가 답한 문항만
 * 그리는 것과 갈리는 자리인데, 그쪽은 낸 사람이 자기 것을 다시 보는 화면이다.
 *
 * 페이지가 둘 이상인 폼은 페이지 제목으로 묶는다 — 지원자가 본 순서 그대로다. 분기로 건너뛴 페이지의
 * 문항은 «(응답 없음)»으로 남는다(화면이 분기 경로를 다시 계산하지 않는다).
 */

interface AnswerRow {
  qitemId: string;
  label: string;
  value: string;
}

interface PageGroup {
  key: string;
  title: string | null;
  rows: AnswerRow[];
}

function toGroups(composition: QitemCpstCn, rspnsCn: RspnsCn): PageGroup[] {
  const rowOf = (q: QitemCpstCn["qitems"][number]): AnswerRow => ({
    qitemId: q.qitemId,
    label: q.qitemLblNm,
    value: rspnsValueText(rspnsCn, q.qitemId),
  });

  if (composition.pages.length <= 1) {
    return [{ key: "all", title: null, rows: composition.qitems.map(rowOf) }];
  }

  return composition.pages
    .map((page, index) => ({
      key: `page-${index}`,
      title: page.pageTtl || `페이지 ${index + 1}`,
      rows: composition.qitems.filter((q) => (q.pageSeq ?? 0) === index).map(rowOf),
    }))
    .filter((group) => group.rows.length > 0);
}

function AnswerList({ rows }: Readonly<{ rows: AnswerRow[] }>) {
  return (
    <dl className="flex flex-col gap-[14px]">
      {rows.map((row) => (
        <div key={row.qitemId}>
          <dt className="text-[13px] text-n500">{row.label || "-"}</dt>
          {/* 자유 입력이라 띄어쓰기 없는 링크·이메일이 카드 밖으로 밀리지 않게 끊는다 */}
          <dd className="mt-[3px] text-[15px] leading-[1.7] whitespace-pre-wrap break-words">
            {row.value || <span className="text-n500">(응답 없음)</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ApplicationAnswers({
  composition,
  rspnsCn,
}: Readonly<{ composition: QitemCpstCn; rspnsCn: RspnsCn }>) {
  const groups = toGroups(composition, rspnsCn);

  return (
    <Card>
      <div className="text-[13px] tracking-[.3px] text-n400">지원서 답변</div>
      {composition.qitems.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-n500">지원서에 문항이 없습니다.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-[20px]">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-[10px]">
              {group.title && (
                <h2 className="text-[14.5px] font-semibold text-ink">{group.title}</h2>
              )}
              <AnswerList rows={group.rows} />
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
