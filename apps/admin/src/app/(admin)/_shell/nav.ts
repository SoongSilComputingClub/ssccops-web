import { CAPABILITY, hasCapability, type Capability, type MemberProfile } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";

export interface NavItem {
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
  children?: NavItem[];
  /**
   * 이 메뉴를 보려면 필요한 권한. 없으면 누구에게나 보인다 (#29).
   *
   * 값은 그 화면이 **첫 조회에 부르는 API가 요구하는 권한**이다. 버튼이 아니라 화면 진입에
   * 필요한 것을 적어야 한다 — 목록은 볼 수 있고 등록만 못 하는 화면(라벨 관리)을 감추면
   * 조회조차 막게 된다.
   */
  requires?: Capability;
}

export interface NavGroup {
  label: string;
  /** 미니 사이드바 타일 글자 */
  mono: string;
  items: NavItem[];
}

const starts = (prefix: string) => (p: string) => p.startsWith(prefix);

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "운영",
    mono: "운",
    items: [
      {
        label: "운영 대시보드",
        href: ROUTES.dashboard,
        isActive: starts("/dashboard"),
        // GET /v1/dashboard는 WORK_READ만 있어도 된다(#71) — 국원도 내 업무·다가오는 마감은
        // 볼 수 있다. 승인 대기 영역만 서버가 WORK_MANAGE 여부로 따로 가려서 내려준다.
        requires: CAPABILITY.WORK_READ,
      },
      {
        label: "운영 통합",
        href: ROUTES.operations,
        isActive: (p) => p === "/operations",
        /*
         * GET /v1/operations 자체는 WORK_MANAGE다(#71, 대시보드와 같은 이유로 이번 요청
         * 범위 밖) — 그래서 부모 행에도 이 requires를 그대로 건다. 국원처럼 부모는 못 열어도
         * 자식(업무·하위 업무·회의)은 열 수 있는 경우, visibleGroups가 부모 행 없이 자식만
         * 최상위로 끌어올려 보여준다 — 부모를 안 보여준다고 자식까지 같이 감추지 않는다.
         */
        requires: CAPABILITY.WORK_MANAGE,
        children: [
          {
            label: "업무",
            href: ROUTES.works,
            isActive: starts("/operations/works"),
            // 조회는 WORK_MANAGE가 아니라 그 자식인 WORK_READ다(서버 #101) — WORK_MANAGE
            // 보유자는 트리 펼침으로 이미 포함되므로 국장 이상은 그대로 보인다
            requires: CAPABILITY.WORK_READ,
          },
          {
            label: "하위 업무",
            href: ROUTES.subWorks,
            isActive: starts("/operations/sub-works"),
            requires: CAPABILITY.WORK_READ,
          },
          {
            label: "회의",
            href: ROUTES.meetings,
            isActive: starts("/operations/meetings"),
            // 조회는 MEETING_MANAGE가 아니라 그 자식인 MEETING_READ다(서버 #101)
            requires: CAPABILITY.MEETING_READ,
          },
        ],
      },
      /*
       * 승인함 (#71). 승인·반려 자체는 여전히 권한 코드로 표현되지 않지만(건별 승인자
       * 판정, ApprovalAuthorityPolicy), 승인함 화면에 들어갈 수 있는지는 서버가 이제
       * WORK_MANAGE로 가드한다(ApprovalController 클래스 애노테이션) — 이전엔 이 가드가
       * 아예 없어 운영진이 아닌 회원도 승인함을 볼 수 있었다.
       */
      {
        label: "승인함",
        href: ROUTES.approvals,
        isActive: starts("/approvals"),
        requires: CAPABILITY.WORK_MANAGE,
      },
      {
        label: "하위 업무 유형 관리",
        href: ROUTES.subWorkTypes,
        isActive: starts("/operations/types"),
        // 화면 진입은 목록 조회다 — 등록·수정만 SUB_WORK_TYPE_MANAGE 로 따로 잠근다
        requires: CAPABILITY.SUB_WORK_TYPE_READ,
      },
      {
        label: "운영 등록",
        href: ROUTES.operationNew,
        isActive: starts("/operations/new"),
        requires: CAPABILITY.WORK_MANAGE,
      },
    ],
  },
  {
    label: "회원",
    mono: "회",
    items: [
      /*
       * 회원 명부 (#52 · 서버 #76).
       *
       * 조회(GET /v1/members)부터 MEMBER_MANAGE 를 요구한다 — 학번·연락처·이메일이 담긴
       * 실제 명부라 목록 자체가 보호 대상이다. 그래서 requires 를 둔다.
       * 상세·수정·등록은 목록에서 들어가므로 목차에 따로 올리지 않는다.
       */
      {
        label: "회원 목록",
        href: ROUTES.members,
        isActive: (p) =>
          p.startsWith("/members") &&
          !p.startsWith("/members/roles") &&
          !p.startsWith("/members/role-labels") &&
          !p.startsWith("/members/authorities") &&
          !p.startsWith("/members/csv-import"),
        requires: CAPABILITY.MEMBER_MANAGE,
      },
      /*
       * 역할 관리에는 requires 를 두지 않는다 (#52).
       *
       * 역할·역할 분류 조회는 서버가 권한 없이 열어 두었고 등록·수정·삭제만 ROLE_MANAGE 를
       * 요구한다 — 라벨 관리와 같은 모양이다. 메뉴를 감추면 볼 수 있는 것까지 막게 되므로
       * 화면 안의 변경 버튼만 useCan 으로 잠근다(views/role-list 가 이미 그렇게 한다).
       * 바로 아래 권한 관리와 갈리는 지점이 여기다 — 그쪽은 조회부터 막혀 있다.
       */
      {
        label: "역할 관리",
        href: ROUTES.roles,
        isActive: (p) =>
          p.startsWith("/members/roles") || p.startsWith("/members/role-labels"),
      },
      /*
       * 권한 트리 관리 (#32 · 서버 #65).
       *
       * 조회(GET /v1/authorities)부터 ROLE_MANAGE 를 요구한다 — 어떤 묶음 권한이 있는지 자체가
       * 운영 구조를 드러내기 때문이다. 그래서 라벨 관리와 달리 requires 를 반드시 둔다.
       * 역할별 권한 부여(/members/roles/{roleId}/authorities)는 역할 목록에서 들어가므로
       * 목차에 따로 올리지 않는다 — 역할을 먼저 고르지 않으면 갈 수 없는 화면이다.
       */
      {
        label: "권한 관리",
        href: ROUTES.authorities,
        isActive: starts("/members/authorities"),
        requires: CAPABILITY.ROLE_MANAGE,
      },
      /* 회원 명부를 통째로 만들어 넣는 화면이다 — 회원 목록과 같은 권한으로 잠근다 (#52) */
      {
        label: "CSV 회원 이관",
        href: ROUTES.csvImport,
        isActive: starts("/members/csv-import"),
        requires: CAPABILITY.MEMBER_MANAGE,
      },
    ],
  },
  {
    label: "폼",
    mono: "폼",
    items: [
      {
        label: "폼 목록",
        href: ROUTES.forms,
        isActive: (p) =>
          p.startsWith("/forms") &&
          !p.startsWith("/forms/labels") &&
          !p.startsWith("/forms/templates"),
        requires: CAPABILITY.FORM_READ,
      },
      /*
       * 라벨 관리에는 requires 를 두지 않는다. 목록 조회(GET /v1/form-labels)에는 서버가
       * 권한을 걸지 않았고 추가·비활성화만 FORM_LABEL_MANAGE 를 요구한다 — 이슈에도
       * "조회는 허용"으로 적혀 있다. 메뉴를 감추면 볼 수 있는 것까지 막게 된다.
       */
      { label: "라벨 관리", href: ROUTES.formLabels, isActive: starts("/forms/labels") },
      /*
       * 템플릿 관리 (#134). 라벨 관리와 달리 requires 를 둔다 — 템플릿 API는 **조회까지 전부
       * FORM_WRITE**다(서버 FormTemplateController 의 클래스 레벨 @RequireAuthority). 권한 없이
       * 들어가면 첫 조회부터 403이라, 감추지 않으면 갈 수 없는 곳이 목차에 남는다.
       * 등록·수정은 목록에서 들어가므로 목차에 따로 올리지 않는다.
       */
      {
        label: "템플릿 관리",
        href: ROUTES.formTemplates,
        isActive: starts("/forms/templates"),
        requires: CAPABILITY.FORM_WRITE,
      },
      /*
       * 기획안 (#163). 주소는 /forms 아래가 아니지만 묶음은 폼이다 — 기획안 접수는 시스템 폼
       * 한 건(`sys_form_cd = 'PROPOSAL'`)으로 이뤄지고, 화면이 하는 일도 그 폼을 찾아 여는 것이다.
       *
       * requires 가 FORM_READ 인 것은 규칙 그대로다 — **화면이 첫 조회에 부르는 API가 요구하는
       * 권한**을 적는다. 기획안 화면은 번호를 하드코딩하지 않으려고 폼 목록에서 코드로 폼을
       * 찾으므로(entities/form/api/proposal-form.ts) 첫 요청이 GET /v1/forms 다. 제출·자동 저장은
       * 권한을 묻지 않지만 그 앞의 조회가 막히면 화면이 서지 않는다.
       */
      {
        label: "기획안",
        href: ROUTES.proposals,
        /*
         * 검토 화면(/proposals/review)은 뺀다 (#164). 주소는 이웃이지만 하는 일이 반대라
         * (내가 내는 곳 · 남의 것을 심사하는 곳), 검토 화면에서 '기획안'까지 함께 켜지면
         * 목차가 지금 어디에 있는지를 알려주지 못한다 — 폼 목록이 라벨·템플릿을 빼는 것과 같다.
         */
        isActive: (p) => p.startsWith("/proposals") && !p.startsWith("/proposals/review"),
        requires: CAPABILITY.FORM_READ,
      },
      /*
       * 기획안 검토 (#164). 학술국장이 제출된 기획안을 승인·수정요청·반려하는 화면이다.
       *
       * requires 가 RESPONSE_REVIEW 인 것은 **이 화면이 실제로 여는 것이 응답 목록**이기
       * 때문이다. 첫 요청은 폼을 코드로 찾는 GET /v1/forms(FORM_READ)지만 그것은 번호를
       * 알아내는 준비 단계일 뿐이고, 화면의 본문인 GET /v1/forms/{formId}/responses 는
       * RESPONSE_REVIEW 없이는 통째로 403이다 — 그 권한이 없는 회원에게 이 메뉴를 남기면
       * 눌러 봐야 빈 화면뿐인 곳이 목차에 남는다. 반대로 폼 조회 권한만 없는 경우는 화면
       * 안에서 요구 권한을 이름으로 밝힌다(features/form 의 PROPOSAL_FORM_READ_DENIED).
       */
      {
        label: "기획안 검토",
        href: ROUTES.proposalReviews,
        isActive: starts("/proposals/review"),
        requires: CAPABILITY.RESPONSE_REVIEW,
      },
    ],
  },
  {
    label: "학술",
    mono: "학",
    items: [
      /*
       * 학술 대시보드 (#126 · 서버 #131·#136).
       *
       * 학술 그룹의 첫 화면이다 — 전체 활동 현황·이번 주 회차·승인 대기·최근 활동. 이슈가
       * 최상단 배치와 `requires: ACADEMIC_PROGRAM_MANAGE`를 명시했다. 첫 조회 셋이 모두 그
       * 권한을 요구하므로(활동 목록·회차 이력·승인 대기), 권한이 없으면 감춘다 — 회차 이력·
       * 승인 화면과 같은 판단이다.
       */
      {
        label: "학술 대시보드",
        href: ROUTES.academicProgramDashboard,
        isActive: starts("/academic-programs/dashboard"),
        requires: CAPABILITY.ACADEMIC_PROGRAM_MANAGE,
      },
      /*
       * 스터디·프로젝트 (#125 · 서버 #131·#134).
       *
       * 조회 API(목록·상세·커리큘럼)에는 권한이 없지만(가입한 회원 누구나 본다) 이 메뉴는
       * 학술국장이 전체 활동을 감독하는 화면이다 — nav.ts의 규칙은 "화면 진입에 필요한
       * 권한"을 적는 것이고, 이 화면을 실제로 쓰는 사람은 ACADEMIC_PROGRAM_MANAGE 보유자다.
       * 상세는 목록에서 들어가므로 목차에 따로 올리지 않는다.
       *
       * `isActive`에서 `/academic-programs/reviews`를 뺀다 — 회차·출석 승인은 아래 별도
       * 항목이라, 그 화면에서 이 메뉴까지 켜지면 목차가 지금 어디인지 알려주지 못한다
       * (폼 목록이 라벨·템플릿을, 기획안이 검토를 빼는 것과 같은 판단).
       */
      {
        label: "스터디·프로젝트",
        href: ROUTES.academicPrograms,
        isActive: (p) =>
          p.startsWith("/academic-programs") &&
          !p.startsWith("/academic-programs/dashboard") &&
          !p.startsWith("/academic-programs/reviews") &&
          !p.startsWith("/academic-programs/sessions") &&
          !p.startsWith("/academic-programs/attendance"),
        requires: CAPABILITY.ACADEMIC_PROGRAM_MANAGE,
      },
      /*
       * 회차·출석 승인 (#129 · 서버 #136).
       *
       * 학술국장이 여러 활동의 제출된 회차 기록을 한 화면에서 승인·수정요청한다. 목록·전이
       * 모두 서버가 ACADEMIC_PROGRAM_MANAGE 로 가드하므로(선택 항목 상세만 인증), 권한이
       * 없으면 첫 조회부터 403이다 — 감추지 않으면 갈 수 없는 곳이 목차에 남는다.
       */
      {
        label: "회차·출석 승인",
        href: ROUTES.academicProgramSessionReviews,
        isActive: starts("/academic-programs/reviews/sessions"),
        requires: CAPABILITY.ACADEMIC_PROGRAM_MANAGE,
      },
      /*
       * 회차 이력 (#130 · 서버 #136).
       *
       * 학술국장이 전체 활동의 회차 진행을 한 화면에서 훑는다(활동 횡단 조회 —
       * GET /v1/academic-programs/sessions). 승인 대기 목록과 달리 상태를 가리지 않는다.
       * 목록·조회 모두 ACADEMIC_PROGRAM_MANAGE 를 요구한다 — 권한이 없으면 첫 조회부터
       * 403이라 감추지 않으면 갈 수 없는 곳이 목차에 남는다. 회차 상세는 이력에서
       * 들어가므로 목차에 따로 올리지 않는다.
       *
       * isActive 는 `/academic-programs/reviews/sessions`(승인 대기)를 뺀다 — 주소는
       * 비슷하지만 다른 화면이다.
       */
      {
        label: "회차 이력",
        href: ROUTES.academicProgramSessions,
        isActive: (p) =>
          p.startsWith("/academic-programs/sessions"),
        requires: CAPABILITY.ACADEMIC_PROGRAM_MANAGE,
      },
      /*
       * 출석 통계 (#130).
       *
       * 출석 통계 전용 엔드포인트가 없어 회차 이력·출석부 응답을 웹에서 집계한다
       * (features/academic-session/model/use-attendance-stats). 이력 조회가
       * ACADEMIC_PROGRAM_MANAGE 를 요구하므로 이 메뉴도 같은 권한으로 잠근다.
       */
      {
        label: "출석 통계",
        href: ROUTES.academicProgramAttendance,
        isActive: starts("/academic-programs/attendance"),
        requires: CAPABILITY.ACADEMIC_PROGRAM_MANAGE,
      },
    ],
  },
  {
    label: "행사",
    mono: "행",
    items: [
      /*
       * 행사 관리 (#136). 폼과 달리 두 메뉴 모두 requires 를 둔다 — 행사·분류 관리 API는
       * **조회까지 전부 EVENT_MANAGE**라(서버 판정) 권한 없이 들어가면 첫 조회부터 403이다.
       * 등록·수정·분류 편집은 목록에서 들어가므로 목차에 따로 올리지 않는다.
       */
      {
        label: "행사 목록",
        href: ROUTES.events,
        isActive: (p) => p.startsWith("/events") && !p.startsWith("/events/categories"),
        requires: CAPABILITY.EVENT_MANAGE,
      },
      {
        label: "분류 관리",
        href: ROUTES.eventCategories,
        isActive: starts("/events/categories"),
        requires: CAPABILITY.EVENT_MANAGE,
      },
    ],
  },
];

export const NAV_FOOT: NavGroup = {
  label: "계정",
  mono: "계",
  items: [
    { label: "내 계정", href: ROUTES.my, isActive: starts("/my") },
    { label: "로그아웃", href: ROUTES.login, isActive: () => false },
  ],
};

/*
 * 권한이 없는 메뉴를 걷어낸다 (#29).
 *
 * ── 왜 감추는가 ────────────────────────────────────────────────
 * 사이드바는 "여기서 무엇을 할 수 있는가"의 목차다. 잠긴 항목을 남기면 눌러도 아무 일이
 * 없고 이유를 물어볼 곳도 없다(툴팁은 마우스를 올려야 보이고 터치에서는 아예 안 보인다).
 * 무엇보다 **그 뒤의 화면이 실제로 쓸 수 없다** — 업무 목록은 조회부터 WORK_MANAGE 로 막혀
 * 있어 들어가 봐야 오류 화면뿐이다. 갈 수 없는 곳을 목차에 남기면 목차 전체를 믿을 수 없게
 * 된다. 화면 **안**의 동작 버튼은 반대로 잠근다 — 근거는 features/auth/model/use-can.ts.
 *
 * ── 왜 useCan 이 아니라 hasCapability 인가 ──────────────────────
 * 메뉴는 데이터라 항목 수만큼 판정이 필요한데 훅은 반복문 안에서 부를 수 없다. 그래서 세션
 * 회원 한 번만 읽고(호출부가 이미 읽고 있다) 판정 함수를 직접 쓴다 — useCan 도 같은
 * hasCapability 를 부르므로 판정 규칙은 여전히 한 곳이다.
 *
 * 감추기는 어디까지나 안내다. 주소를 직접 치면 화면은 열리고, 실제 차단은 서버가 한다.
 *
 * ── 부모를 못 열어도 자식은 최상위로 끌어올린다 ──────────────────
 * "운영 통합"은 자신은 더 넓은 권한(WORK_MANAGE)을 요구하는 화면(GET /v1/operations)으로
 * 이어지지만, 그 아래 자식(업무·하위 업무·회의)은 각자 더 좁은 권한(WORK_READ·MEETING_READ)
 * 으로 따로 열린다(#71). 국원처럼 부모의 requires는 못 채워도 일부 자식은 채우는 경우,
 * 부모 행을 감춘다고 자식까지 같이 감추면 국원에게 업무·하위 업무·회의 메뉴가 전부 사라진다.
 * 그래서 부모가 막히면 부모 행 없이 **통과한 자식만 최상위로 끌어올려** 보여준다. 부모가
 * 열리면(WORK_MANAGE 보유) 기존처럼 자식을 부모 아래 중첩해 보여준다. 자식이 있던 항목의
 * 자식이 전부(또는 애초에 하나도) 걸러지면 그 항목은 통째로 사라진다 — 죽은 링크를 남기지
 * 않기 위해서다.
 */
export function visibleGroups(
  groups: NavGroup[],
  member: MemberProfile | null,
): NavGroup[] {
  const allowed = (item: NavItem) => !item.requires || hasCapability(member, item.requires);

  const visibleItems = (item: NavItem): NavItem[] => {
    if (!item.children) {
      return allowed(item) ? [item] : [];
    }
    const children = item.children.filter(allowed);
    if (allowed(item)) {
      return [{ ...item, children }];
    }
    return children;
  };

  return groups
    .map((group) => ({
      ...group,
      items: group.items.flatMap(visibleItems),
    }))
    // 항목이 하나도 남지 않은 묶음은 제목만 떠 있게 두지 않는다 (접힌 사이드바의 타일도 같다)
    .filter((group) => group.items.length > 0);
}

export function groupHasActive(group: NavGroup, pathname: string): boolean {
  return group.items.some(
    (i) => i.isActive(pathname) || i.children?.some((k) => k.isActive(pathname)),
  );
}
