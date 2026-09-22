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
  /**
   * 묶음 안의 구분 제목 (#639 · ssccops#463). 같은 값이 이어지는 동안 한 번만 찍히고, 권한 필터로
   * 항목이 빠진 뒤 **보이는 항목 기준**으로 찍는다(빈 구분 제목 없음). «설정» 묶음이 화면 9개를
   * 한 줄로 이어 무엇의 설정인지 갈리지 않아 뒀다 — 다른 묶음은 비워 둔다. 클릭되지 않는다.
   */
  section?: string;
}

export interface NavGroup {
  /** 아코디언 저장(localStorage)·aria-controls 키 — 라벨이 바뀌어도 기억이 남게 라벨과 따로 둔다 */
  id: string;
  label: string;
  /**
   * 묶음 아이콘 — 이모지 한 글자 (ssccops#462 · 사용자 결정 2026-09-22). 그리는 곳은 `@ssccops/ui`
   * `GroupIcon` 한 군데다 — SVG로 바꿀 때 여기 값은 아이콘 이름으로 읽으면 된다.
   */
  emoji: string;
  items: NavItem[];
}

const starts = (prefix: string) => (p: string) => p.startsWith(prefix);

/*
 * 묶음 재편 (#635 · ssccops#462 규칙 표 · 2026-09-22).
 *
 * 묶음 7개·항목 25개를 전부 펼쳐 놓아 한 화면을 넘겼고, 접힌 레일은 «운·회·폼» 글자 하나였다.
 * 재편의 기준은 **«매일 하는 일»과 «가끔 만지는 기준정보»를 가르는 것**이다 — 유형·역할·권한·라벨·
 * 템플릿·분류·지운 폼·RAG처럼 한 학기에 몇 번 여는 화면은 맨 아래 «설정» 묶음에 모으고, 각 도메인
 * 묶음에는 운영진이 오늘 열 화면만 남긴다. **주소는 하나도 바뀌지 않았다** — 북마크·공유 링크는
 * 그대로다. RAG 묶음은 «설정» 안의 «RAG 설정» 한 줄이 됐다(항목 하나짜리 묶음을 없앤 것이지 화면이
 * 없어진 것이 아니다).
 *
 * 묶음 순서 = 운영 · 회원 · 폼 · 학술 · 행사 · 콘텐츠 · 설정(맨 아래). «설정»은 권한 필터
 * (`visibleGroups`)를 똑같이 타므로 안의 항목이 하나도 안 보이면 묶음도 없다.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "ops",
    label: "운영",
    emoji: "📋",
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
        label: "운영 등록",
        href: ROUTES.operationNew,
        isActive: starts("/operations/new"),
        requires: CAPABILITY.WORK_MANAGE,
      },
    ],
  },
  {
    id: "members",
    label: "회원",
    emoji: "👥",
    items: [
      /*
       * 회원 명부 (#52 · 서버 #76).
       *
       * 조회(GET /v1/members)부터 MEMBER_MANAGE 를 요구한다 — 학번·연락처·이메일이 담긴
       * 실제 명부라 목록 자체가 보호 대상이다. 그래서 requires 를 둔다.
       * 상세·수정·등록은 목록에서 들어가므로 목차에 따로 올리지 않는다.
       * 역할·권한·CSV 이관은 «설정» 묶음이다(#635) — 명부를 보는 일과 조직 구조를 만지는 일을 가른다.
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
    ],
  },
  {
    id: "forms",
    label: "폼",
    emoji: "📝",
    items: [
      {
        label: "폼 목록",
        href: ROUTES.forms,
        isActive: (p) =>
          p.startsWith("/forms") &&
          !p.startsWith("/forms/labels") &&
          !p.startsWith("/forms/templates") &&
          // 지운 폼은 폼 목록의 부분집합이 아니라 다른 모집단이다 — 두 줄이 함께 켜지지 않게 뺀다
          !p.startsWith("/forms/deleted") &&
          // 시스템 폼도 같은 이유로 다른 모집단이다 (#553)
          !p.startsWith("/forms/system"),
        requires: CAPABILITY.FORM_READ,
      },
      /*
       * 시스템 폼 (#553 · ssccops#415). 코드가 가리키는 폼(기획안)만 모은 화면이다 — 폼 목록에서
       * 뺐으므로 목차에 자리가 있어야 찾아갈 수 있다. requires 는 목록과 같은 FORM_READ 다 —
       * 첫 조회가 같은 GET /v1/forms 이고, 화면이 `sysYn`으로 가를 뿐이다.
       */
      {
        label: "시스템 폼",
        href: ROUTES.formsSystem,
        isActive: starts("/forms/system"),
        requires: CAPABILITY.FORM_READ,
      },
    ],
  },
  {
    id: "academic",
    label: "학술",
    emoji: "🎓",
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
       * 기획안 검토 (#164 · 자리 이동은 #201). 학술국장이 제출된 기획안을 승인·수정요청·반려한다.
       *
       * ── 왜 폼이 아니라 학술 묶음인가 ──────────────────────────────
       * #164는 이 항목을 폼 묶음에 두었고 그때는 그것이 맞았다 — 기획안은 시스템 폼
       * (`sys_form_cd = 'PROPOSAL'`) 한 벌의 응답이고 화면이 부르는 API도 전부 폼·응답
       * 계열이라, "구현이 폼 위에 서 있으니 묶음도 폼"이었다. 그 판단을 뒤집는 것이 아니라
       * **전제가 달라졌다**: 그 뒤 #127·#129·#130으로 학술 화면이 여섯으로 늘면서, 목차의
       * 기준이 '무슨 API를 부르는가'에서 '누가 무슨 일을 하러 오는가'로 옮겨갔다. 학술국장이
       * 쓰는 화면 한 벌 중 다섯이 학술에 모여 있는데 이것만 폼에 남으면 목차가 두 군데로
       * 갈린다. 승인이 곧 학술 활동의 생성이므로(서버 #150) 소속은 학술이다.
       *
       * ── 왜 학술 묶음인데 ACADEMIC_PROGRAM_MANAGE 가 아닌가 ────────
       * 이 묶음의 나머지 다섯과 달리 requires 가 RESPONSE_REVIEW 다. 통일 누락이 아니다 —
       * nav.ts의 규칙은 **화면이 첫 조회에 부르는 API가 요구하는 권한**을 적는 것이고, 이
       * 화면의 본문은 여전히 GET /v1/forms/{formId}/responses 라 RESPONSE_REVIEW 없이는
       * 통째로 403이다. ACADEMIC_PROGRAM_MANAGE 로 바꾸면 그 권한만 있고 RESPONSE_REVIEW 가
       * 없는 회원에게 **메뉴는 보이는데 눌러 봐야 403인** 자리가 생긴다. 시드상 학술국장은
       * 두 권한을 다 가지므로 실제 노출은 달라지지 않는다.
       * (첫 요청은 폼을 코드로 찾는 GET /v1/forms(FORM_READ)지만 그것은 번호를 알아내는 준비
       * 단계일 뿐이다. 폼 조회 권한만 없는 경우는 화면 안에서 요구 권한을 이름으로 밝힌다 —
       * features/form 의 PROPOSAL_FORM_READ_DENIED.)
       *
       * 주소는 /proposals/review 그대로다 — 화면이 실제로 다루는 것은 폼 응답이고 식별자도
       * formRspnsId 라, 목차에서의 자리가 바뀐다고 주소까지 옮길 이유는 없다.
       *
       * ── 왜 모집 관리보다 위인가 ───────────────────────────────────
       * 학술 묶음은 활동이 거쳐 가는 순서대로 선다: 기획안 검토(개설 판단) → 모집 관리(사람
       * 모으기) → 활동 목록(운영) → 회차·출석 승인 → 회차 이력·출석 통계. 기획안 승인이
       * 곧 활동 생성이고(서버 #150) 모집 시작은 그 뒤에야 가능한 전이라(APPROVED → ONGOING),
       * 목차 순서가 실제 일 순서와 같아야 국장이 지금 어느 단계를 보는지 목차에서 읽힌다.
       */
      {
        label: "기획안 검토",
        href: ROUTES.proposalReviews,
        isActive: starts("/proposals/review"),
        requires: CAPABILITY.RESPONSE_REVIEW,
      },
      /*
       * 모집 관리 (#127 · 서버 #133·#138).
       *
       * 학술국장이 승인된 활동의 모집을 시작하고 신청자를 선발한다. 모집 시작(전이)·선발
       * 확정 모두 ACADEMIC_PROGRAM_MANAGE 다. 신청자 목록 조회만 소유권 또는 이 권한으로
       * 열리지만, 이 화면은 국장 전용이라(스터디장은 선발에 관여하지 않는다) 회차·출석 승인과
       * 같은 판단으로 감춘다.
       *
       * `isActive`에서 다른 학술 화면 경로를 뺀다 — 회차 승인·이력·출석과 같은 이유로,
       * 그 화면에서 이 메뉴까지 켜지면 목차가 지금 어디인지 알려주지 못한다.
       */
      {
        label: "모집 관리",
        href: ROUTES.academicProgramRecruitment,
        isActive: starts("/academic-programs/recruitment"),
        requires: CAPABILITY.ACADEMIC_PROGRAM_MANAGE,
      },
      /*
       * 프로그램 목록 (#125 · 서버 #131·#134).
       *
       * 라벨이 «스터디·프로젝트»였는데 유형이 셋이 되어(트랙 · 서버 #510) 사실과 달라졌다.
       * 셋을 나열하지 않은 것은 좁은 화면에서 목차가 깨지고 유형이 또 늘면 같은 일이 되풀이되기
       * 때문이며, «학술 활동»으로 하지 않은 것은 묶음 이름이 이미 «학술»이라 같은 말이 되기
       * 때문이다 (#568). «활동 목록»이던 것을 «프로그램 목록»으로 — 프로그램 하나는 «프로그램»이다
       * (#592 · ssccops#439 어휘 표 · ADR-0043).
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
        label: "프로그램 목록",
        href: ROUTES.academicPrograms,
        isActive: (p) =>
          p.startsWith("/academic-programs") &&
          !p.startsWith("/academic-programs/dashboard") &&
          !p.startsWith("/academic-programs/recruitment") &&
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
    id: "events",
    label: "행사",
    emoji: "🎉",
    items: [
      /*
       * 행사 관리 (#136). 행사·분류 관리 API는 **조회까지 전부 EVENT_MANAGE**라(서버 판정) 권한
       * 없이 들어가면 첫 조회부터 403이다 — 그래서 requires 를 둔다. 등록·수정은 목록에서
       * 들어가므로 목차에 따로 올리지 않고, 분류 관리는 «설정» 묶음이다(#635).
       */
      {
        label: "행사 목록",
        href: ROUTES.events,
        isActive: (p) => p.startsWith("/events") && !p.startsWith("/events/categories"),
        requires: CAPABILITY.EVENT_MANAGE,
      },
    ],
  },
  {
    /*
     * 콘텐츠 (#521 · ssccops#383 · ADR-0038) — 홍보국이 공개 사이트의 페이지·포스트를 쓴다.
     *
     * 항목이 하나뿐인데 묶음을 여는 것은 다루는 것(공개 사이트에 실리는 글)이 폼·행사·학술 어디에도
     * 속하지 않기 때문이다. 페이지·포스트를 두 줄로 나누지 않고 한 화면의 탭으로 둔 근거는
     * routes.ts의 `content` 주석.
     *
     * 어드민 API는 **목록 조회까지 전부** CONTENT_MANAGE다(서버 클래스 레벨 `@RequireAuthority`).
     * 권한이 없으면 첫 조회부터 403이라 감추지 않으면 갈 수 없는 곳이 목차에 남는다 — 행사·RAG와
     * 같은 판단. 만들기·편집은 목록에서 들어가므로 목차에 따로 올리지 않는다.
     */
    id: "content",
    label: "콘텐츠",
    emoji: "📰",
    items: [
      {
        label: "페이지 · 포스트",
        href: ROUTES.content,
        isActive: starts("/content"),
        requires: CAPABILITY.CONTENT_MANAGE,
      },
    ],
  },
  {
    /*
     * 설정 (#635 · ssccops#462) — 한 학기에 몇 번 여는 기준정보 화면을 맨 아래 한 묶음에 모은다.
     *
     * 각 항목의 requires 근거는 그 항목의 주석에 있고, 원래 있던 묶음(운영·회원·폼·행사·RAG)에서
     * 그대로 옮겼다 — 권한 판정은 자리와 무관하다. 도메인이 사라진 라벨에는 앞말을 붙였다(«라벨
     * 관리» → «폼 라벨 관리») — «설정» 안에서 «라벨»이 폼의 것인지 역할의 것인지 이름만으로 갈리게.
     */
    id: "settings",
    label: "설정",
    emoji: "⚙️",
    items: [
      {
        section: "운영",
        label: "하위 업무 유형 관리",
        href: ROUTES.subWorkTypes,
        isActive: starts("/operations/types"),
        // 화면 진입은 목록 조회다 — 등록·수정만 SUB_WORK_TYPE_MANAGE 로 따로 잠근다
        requires: CAPABILITY.SUB_WORK_TYPE_READ,
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
        section: "회원",
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
        section: "회원",
        label: "권한 관리",
        href: ROUTES.authorities,
        isActive: starts("/members/authorities"),
        requires: CAPABILITY.ROLE_MANAGE,
      },
      /* 회원 명부를 통째로 만들어 넣는 화면이다 — 회원 목록과 같은 권한으로 잠근다 (#52) */
      {
        section: "회원",
        label: "CSV 회원 이관",
        href: ROUTES.csvImport,
        isActive: starts("/members/csv-import"),
        requires: CAPABILITY.MEMBER_MANAGE,
      },
      /*
       * 폼 라벨 관리에는 requires 를 두지 않는다. 목록 조회(GET /v1/form-labels)에는 서버가
       * 권한을 걸지 않았고 추가·비활성화만 FORM_LABEL_MANAGE 를 요구한다 — 이슈에도
       * "조회는 허용"으로 적혀 있다. 메뉴를 감추면 볼 수 있는 것까지 막게 된다.
       */
      // 앞말 «폼»은 구분 제목이 대신한다 (#639) — #635가 붙였던 «폼 라벨 관리»를 원래 이름으로
      { section: "폼", label: "라벨 관리", href: ROUTES.formLabels, isActive: starts("/forms/labels") },
      /*
       * 폼 템플릿 관리 (#134). 라벨 관리와 달리 requires 를 둔다 — 템플릿 API는 **조회까지 전부
       * FORM_WRITE**다(서버 FormTemplateController 의 클래스 레벨 @RequireAuthority). 권한 없이
       * 들어가면 첫 조회부터 403이라, 감추지 않으면 갈 수 없는 곳이 목차에 남는다.
       * 등록·수정은 목록에서 들어가므로 목차에 따로 올리지 않는다.
       */
      {
        section: "폼",
        label: "템플릿 관리",
        href: ROUTES.formTemplates,
        isActive: starts("/forms/templates"),
        requires: CAPABILITY.FORM_WRITE,
      },
      /*
       * 지운 폼 (ssccops-web#359). **목차에 올리는 것 자체가 이 작업의 요건이다.**
       *
       * 응답이 들어온 폼도 지운다는 결정(ssccops#261)이 감당 가능한 것은 되돌릴 수 있기
       * 때문인데, 되돌리는 자리를 삭제 직후의 토스트로만 알리면 그 토스트가 사라진 뒤에는
       * 아무도 찾지 못한다 — 그때부터는 하드 삭제와 구별되지 않는다.
       *
       * requires 는 목록과 같은 FORM_READ 다. nav.ts 의 규칙은 **화면이 첫 조회에 부르는 API가
       * 요구하는 권한**을 적는 것이고, 이 화면의 첫 조회는 GET /v1/forms/deleted 인데 서버가
       * 그것을 FORM_READ 로 확정했다(ssccops-server PR #330 — 휴지통은 목록이 이미 보여주던
       * 값에 지운 시각 하나가 붙은 것이라 목록을 볼 수 있는 사람에게 숨길 것이 없다).
       * 복구만 FORM_WRITE 라 그것은 화면 안에서 버튼을 잠근다 — 라벨 관리가 조회는 열고
       * 추가만 잠그는 것과 같은 판단이다.
       */
      {
        section: "폼",
        label: "지운 폼",
        href: ROUTES.formsDeleted,
        isActive: starts("/forms/deleted"),
        requires: CAPABILITY.FORM_READ,
      },
      /* 행사 분류 관리 — 행사 목록과 같이 조회까지 EVENT_MANAGE 다 (#136) */
      {
        section: "행사",
        label: "분류 관리",
        href: ROUTES.eventCategories,
        isActive: starts("/events/categories"),
        requires: CAPABILITY.EVENT_MANAGE,
      },
      /*
       * RAG 설정 (#432 · 서버 #399·#401) — 규정 도우미가 무엇을 근거로 답하는가를 정한다.
       *
       * 코퍼스 API는 **목록 조회까지 전부** RAG_DOCUMENT_MANAGE다(서버 클래스 레벨
       * `@RequireAuthority`). 권한이 없으면 첫 조회부터 403이라 감추지 않으면 갈 수 없는 곳이
       * 목차에 남는다 — 템플릿 관리·권한 관리와 같은 판단이다.
       */
      {
        section: "규정 도우미",
        label: "RAG 설정",
        href: ROUTES.ragSettings,
        isActive: starts("/ragsettings"),
        requires: CAPABILITY.RAG_DOCUMENT_MANAGE,
      },
    ],
  },
];

/*
 * «계정» 묶음(내 계정·로그아웃)은 여기 없다 (#614 · ssccops#452). 목차는 «이 앱의 화면»이고,
 * 계정·테마·다른 앱·설치·로그아웃은 발치의 계정 메뉴(`@ssccops/ui` `AccountMenu`)가 든다 —
 * `sidebar.tsx`·`mobile-nav.tsx`의 `ACCOUNT_LINKS`.
 */

/** 이 회원이 항목을 열 수 있는가 — 목차 감추기(`visibleGroups`)와 전체 메뉴의 잠금 표시가 같은 판정을 쓴다 */
export function itemAllowed(member: MemberProfile | null, item: NavItem): boolean {
  return !item.requires || hasCapability(member, item.requires);
}

/*
 * 권한이 없는 메뉴를 걷어낸다 (#29).
 *
 * ── 왜 감추는가 ────────────────────────────────────────────────
 * 사이드바는 "여기서 무엇을 할 수 있는가"의 목차다. 잠긴 항목을 남기면 눌러도 아무 일이
 * 없고 이유를 물어볼 곳도 없다(툴팁은 마우스를 올려야 보이고 터치에서는 아예 안 보인다).
 * 무엇보다 **그 뒤의 화면이 실제로 쓸 수 없다** — 업무 목록은 조회부터 WORK_MANAGE 로 막혀
 * 있어 들어가 봐야 오류 화면뿐이다. 갈 수 없는 곳을 목차에 남기면 목차 전체를 믿을 수 없게
 * 된다. 화면 **안**의 동작 버튼은 반대로 잠근다 — 근거는 features/auth/model/use-can.ts.
 * 감춰진 항목이 «있기는 한지»를 알 자리는 전체 메뉴(/sitemap · #635)다 — 거기서는 잠금 표시와
 * 필요한 권한명으로 보인다.
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
  const allowed = (item: NavItem) => itemAllowed(member, item);

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
    // 항목이 하나도 남지 않은 묶음은 제목만 떠 있게 두지 않는다 (접힌 레일의 아이콘도 같다)
    .filter((group) => group.items.length > 0);
}

export function groupHasActive(group: NavGroup, pathname: string): boolean {
  return group.items.some(
    (i) => i.isActive(pathname) || i.children?.some((k) => k.isActive(pathname)),
  );
}
