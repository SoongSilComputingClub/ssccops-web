"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMeetingStore, type AgendaItem } from "@/entities/meeting";
import { useOpTypeStore } from "@/entities/op-type";
import { useSubWorkStore } from "@/entities/sub-work";
import { useWorkStore } from "@/entities/work";
import { AG_KINDS } from "@/shared/config/constants";
import { fromInput } from "@/shared/lib/date";
import { ROUTES } from "@/shared/config/routes";
import {
  Button,
  Card,
  Chip,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  SelectField,
  TextArea,
  TextField,
  flash,
} from "@/shared/ui";

type Kind = "WORK" | "SUB_WORK" | "MEETING";

const KIND_META: Record<Kind, { label: string; table: string; note: string }> = {
  WORK: {
    label: "업무",
    table: "work",
    note: "행사·상시·정례 운영처럼 여러 하위 업무를 묶는 단위",
  },
  SUB_WORK: {
    label: "하위 업무",
    table: "sub_work",
    note: "실제 실행 단위. 승인·체크리스트가 붙습니다",
  },
  MEETING: {
    label: "회의",
    table: "meeting",
    note: "정례·주제 회의. 안건과 처리 결과를 기록합니다",
  },
};

const DEFAULT_CHECKLIST = ["세부 계획 수립", "진행", "결과 정리", "보고"].map(
  (label) => ({ label, done: false }),
);

type AgendaDraft = Omit<AgendaItem, "no" | "result">;

export function OperationCreatePage({ parent }: { parent?: string }) {
  const router = useRouter();
  const works = useWorkStore((s) => s.works);
  const addWork = useWorkStore((s) => s.addWork);
  const attachSub = useWorkStore((s) => s.attachSub);
  const addTask = useSubWorkStore((s) => s.addTask);
  const tasks = useSubWorkStore((s) => s.tasks);
  const addMeeting = useMeetingStore((s) => s.addMeeting);
  const opTypes = useOpTypeStore((s) => s.opTypes.filter((t) => t.on));

  const kinds: Kind[] = parent ? ["SUB_WORK"] : ["WORK", "MEETING"];
  const [kind, setKind] = useState<Kind>(kinds[0]);

  // 공통 속성
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("이민우 · 회장");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // WORK 확장
  const [wtype, setWtype] = useState("행사");
  const [note, setNote] = useState("");

  // SUB_WORK 확장
  const [stype, setStype] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(parent ?? null);
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");

  // MEETING 확장
  const [mkind, setMkind] = useState("정례");
  const [target, setTarget] = useState("전체");
  const [place, setPlace] = useState("");
  const [chair, setChair] = useState("이민우");
  const [agenda, setAgenda] = useState<AgendaDraft[]>([]);

  const rule = stype ? opTypes.find((t) => t.name === stype) : null;
  const opRefs = [
    ...works.map((w) => ({ id: w.id, label: `업무 · ${w.name}` })),
    ...tasks.map((t) => ({ id: t.id, label: `하위 업무 · ${t.title}` })),
  ];

  const submit = () => {
    if (!title.trim() || !start) {
      flash("제목 · 시작 일시는 필수입니다");
      return;
    }
    if (kind === "WORK") {
      const work = addWork({
        name: title.trim(),
        type: wtype,
        status: "기획",
        term: "제38대",
        dept: "회장단",
        owner: owner.split(" · ")[0],
        start: fromInput(start).slice(0, 10),
        end: end ? fromInput(end).slice(0, 10) : "",
        note: note.trim(),
        subs: [],
      });
      flash("업무을(를) 등록했습니다");
      router.replace(ROUTES.workDetail(work.id));
      return;
    }
    if (kind === "SUB_WORK") {
      if (!parentId) {
        flash("상위 업무를 선택하세요");
        return;
      }
      const task = addTask({
        title: title.trim(),
        owner,
        collab: "-",
        due: end ? fromInput(end).slice(5, 10).replace("-", "월 ") + "일" : "-",
        dday: "-",
        type: stype ?? "행사",
        stage: 1,
        progress: 0,
        flag: "",
        content: content.trim(),
        link: link.trim(),
        approval: "",
        checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c })),
      });
      attachSub(parentId, task.id);
      flash("하위 업무을(를) 등록했습니다");
      router.replace(ROUTES.taskDetail(task.id));
      return;
    }
    const meeting = addMeeting({
      kind: mkind,
      title: title.trim(),
      date: fromInput(start),
      place: place.trim() || "동아리방",
      chair: chair.trim() || "이민우",
      status: "예정",
      target,
      agenda: agenda.map((a, i) => ({ ...a, no: i + 1, result: "-" })),
    });
    flash("회의을(를) 등록했습니다");
    router.replace(ROUTES.meetingDetail(meeting.id));
  };

  return (
    <>
      <PageHeader title="운영 등록" subtitle="유형별 등록 폼" showBack={!!parent} />
      <PageBody>
        <Card className="mb-4">
          <SectionLabel className="mb-3">등록할 운영 유형</SectionLabel>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${kinds.length},1fr)` }}
          >
            {kinds.map((k) => (
              <div
                key={k}
                onClick={() => setKind(k)}
                className={
                  kind === k
                    ? "cursor-pointer rounded-[12px] bg-accent/8 p-[14px] shadow-[inset_0_0_0_1px_#3182f6]"
                    : "cursor-pointer rounded-[12px] border border-line p-[14px] hover:border-accent"
                }
              >
                <div className="flex items-center gap-2">
                  <div className="text-[16px] font-semibold">{KIND_META[k].label}</div>
                  <span className="font-mono text-[12.5px] text-n500">
                    {KIND_META[k].table}
                  </span>
                </div>
                <div className="mt-1 text-[13px] leading-[1.5] text-n500">
                  {KIND_META[k].note}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-[1.1fr_1fr] items-start gap-4">
          <Card>
            <SectionLabel className="mb-3">공통 속성 · operation</SectionLabel>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="제목" required className="col-span-2">
                <TextField
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    kind === "MEETING"
                      ? "예: 9월 1차 정기회의"
                      : "예: 동아리 박람회 부스 운영"
                  }
                />
              </Field>
              <Field label="담당자">
                <TextField value={owner} onChange={(e) => setOwner(e.target.value)} />
              </Field>
              <div />
              <Field label="시작 일시" required>
                <TextField
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field label="종료 일시">
                <TextField
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-3">
              확장 속성 · {KIND_META[kind].table}
            </SectionLabel>

            {kind === "WORK" && (
              <>
                <div className="mb-2 text-[13.5px] text-n400">업무 유형</div>
                <div className="mb-4 flex gap-[7px]">
                  {["행사", "상시", "정례운영"].map((t) => (
                    <Chip key={t} active={wtype === t} onClick={() => setWtype(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
                <Field label="회고 내용">
                  <TextArea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="운영 종료 후 회고 · 지금은 비워도 됩니다"
                  />
                </Field>
                <div className="mt-3 text-[13px] text-n500">
                  등록 후 하위 업무를 이 운영에 연결하면 진행률이 자동으로 집계됩니다.
                </div>
              </>
            )}

            {kind === "SUB_WORK" && (
              <>
                <div className="mb-2 text-[13.5px] text-n400">업무 유형</div>
                <div className="mb-3 flex flex-wrap gap-[7px]">
                  {opTypes.map((t) => (
                    <Chip
                      key={t.name}
                      active={stype === t.name}
                      onClick={() => setStype(t.name)}
                    >
                      {t.name}
                    </Chip>
                  ))}
                </div>
                {rule ? (
                  <div className="mb-4 rounded-[12px] bg-bg p-3">
                    <div className="text-[13.5px] font-semibold">
                      {rule.name}유형 규칙
                    </div>
                    <div className="mt-2 grid grid-cols-[76px_1fr] gap-y-[6px] text-[13.5px]">
                      <div className="text-n500">승인</div>
                      <div className={rule.approval ? "text-danger" : undefined}>
                        {rule.approval ? `${rule.role} 승인 필요` : "승인 없이 진행"}
                      </div>
                      <div className="text-n500">정족수</div>
                      <div>
                        {rule.quorum ? `의결 정족수 ${rule.quorumN}명 동의` : "해당 없음"}
                      </div>
                      <div className="text-n500">금액 기준</div>
                      <div>{rule.amount}</div>
                      <div className="text-n500">확인 사항</div>
                      <div>{rule.check}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-[13.5px] text-n500">
                    업무 유형을 선택하면 승인 규칙이 표시됩니다
                  </div>
                )}
                <div className="mb-2 text-[13.5px] text-n400">상위 업무 연결</div>
                {parent ? (
                  <>
                    <Chip active>
                      {works.find((w) => w.id === parent)?.name ?? parent} 고정
                    </Chip>
                    <div className="mt-2 mb-4 text-[13px] text-n500">
                      하위 업무는 상위 업무 안에서만 생성됩니다
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2 flex flex-wrap gap-[7px]">
                      {works.map((w) => (
                        <Chip
                          key={w.id}
                          active={parentId === w.id}
                          onClick={() => setParentId(w.id)}
                        >
                          {w.name}
                        </Chip>
                      ))}
                    </div>
                    <div className="mb-4 text-[13px] text-n500">
                      상위 업무를 반드시 선택하세요
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-[14px]">
                  <Field label="업무 내용">
                    <TextField
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="무엇을 하는 하위 업무인지"
                    />
                  </Field>
                  <Field label="외부 링크">
                    <TextField
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="문서 · 시트 URL"
                    />
                  </Field>
                </div>
                <div className="mt-3 text-[13px] text-n500">
                  완료 체크리스트 4항목이 기본 생성되며, 등록 직후 단계는 기획입니다.
                </div>
              </>
            )}

            {kind === "MEETING" && (
              <>
                <div className="mb-2 text-[13.5px] text-n400">회의 구분</div>
                <div className="mb-4 flex gap-[7px]">
                  {["정례", "주제"].map((k) => (
                    <Chip key={k} active={mkind === k} onClick={() => setMkind(k)}>
                      {k}
                    </Chip>
                  ))}
                </div>
                <div className="mb-2 text-[13.5px] text-n400">참석 대상</div>
                <div className="mb-4 flex gap-[7px]">
                  {["전체", "국장단", "임시소집"].map((t) => (
                    <Chip key={t} active={target === t} onClick={() => setTarget(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-[14px]">
                  <Field label="장소">
                    <TextField
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="예: 동아리방"
                    />
                  </Field>
                  <Field label="의장">
                    <TextField value={chair} onChange={(e) => setChair(e.target.value)} />
                  </Field>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {agenda.map((a, i) => (
                    <div key={i} className="rounded-[12px] border border-line p-3">
                      <div className="flex items-center">
                        <div className="text-[14px] font-semibold">안건 {i + 1}</div>
                        <div className="flex-1" />
                        <button
                          type="button"
                          onClick={() => setAgenda((list) => list.filter((_, j) => j !== i))}
                          className="cursor-pointer text-[13.5px] text-n400 hover:text-danger"
                        >
                          삭제
                        </button>
                      </div>
                      <div className="mt-2">
                        <div className="mb-[6px] text-[13.5px] text-n400">
                          연결 운영 <span className="text-accent">*</span>
                        </div>
                        <SelectField
                          value={a.op}
                          onChange={(e) => {
                            const op = e.target.value;
                            const label =
                              opRefs.find((o) => o.id === op)?.label.split(" · ")[1] ?? "";
                            setAgenda((list) =>
                              list.map((x, j) =>
                                j === i ? { ...x, op, name: label } : x,
                              ),
                            );
                          }}
                        >
                          <option value="">선택하세요</option>
                          {opRefs.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </SelectField>
                      </div>
                      <div className="mt-2 flex gap-[7px]">
                        {AG_KINDS.map((k) => (
                          <Chip
                            key={k}
                            active={a.kind === k}
                            onClick={() =>
                              setAgenda((list) =>
                                list.map((x, j) => (j === i ? { ...x, kind: k } : x)),
                              )
                            }
                          >
                            {k}
                          </Chip>
                        ))}
                      </div>
                      <TextArea
                        value={a.note === "-" ? "" : a.note}
                        onChange={(e) =>
                          setAgenda((list) =>
                            list.map((x, j) =>
                              j === i ? { ...x, note: e.target.value || "-" } : x,
                            ),
                          )
                        }
                        placeholder="안건 내용 (선택)"
                        className="mt-2"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setAgenda((list) => [
                        ...list,
                        { name: "", kind: "논의", op: "", note: "-" },
                      ])
                    }
                    className="cursor-pointer rounded-[12px] border border-dashed border-line-strong py-3 text-[14.5px] text-n400 hover:border-accent hover:text-accent"
                  >
                    + 안건 추가
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="mt-5">
          <Button className="px-[26px] py-[11px]" onClick={submit}>
            {KIND_META[kind].label} 등록
          </Button>
        </div>
      </PageBody>
    </>
  );
}
