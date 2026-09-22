import Link from "next/link";
import { CONTACT } from "@/shared/config/contact";
import { ROUTES } from "@/shared/config/routes";
import { ThemeToggle } from "@/shared/ui";
import { externalNavLinks } from "./nav-links";

/**
 * 푸터 — 문의 블록 + 법적 페이지 + 테마 + 고지 (#520 · ssccops#382).
 *
 * 서버 컴포넌트다 — 세션도 경로도 보지 않는다(`ThemeToggle`은 클라이언트 컴포넌트지만 세션이 아니라
 * `localStorage`를 본다). **테마 라디오는 여기가 로그아웃 상태의 유일한 자리다** (#614 · ssccops#452)
 * — 상단 바에서 뺐고, 로그인한 사람은 계정 메뉴 안에서도 고른다. 둘은 같은 상태를 본다.
 * 문의 블록(`id="contact"`)이 위에 서는 것은
 * «모든 화면 끝에 문의»(제안 §6) 때문이다 — 지원자가 어느 화면에서 멈춰도 다음 행동이 있다.
 * 상단 바의 «문의»는 #524부터 화면(`/contact`)으로 가고, 이 블록은 그 화면과 같은 값을 그린다 —
 * 두 자리가 같은 `contact.ts`를 읽으므로 갈리지 않는다.
 *
 * 주소·SNS 값은 `shared/config/contact.ts`(옛 사이트 `footer.tsx`에서 옮김). 메일은 정해지지
 * 않아 null이고, 그때는 줄을 그리지 않는다.
 *
 * 값을 링크로 그릴 때 `rel="noreferrer"`는 외부 링크의 기본이다(본문 렌더러와 같다).
 */
export function SiteFooter() {
  return (
    <footer className="mt-[40px] border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-[22px] px-[20px] py-[28px] lg:px-[28px]">
        <section id="contact" className="flex flex-col gap-[8px] scroll-mt-[20px]">
          <h2 className="text-[15px] font-semibold">문의</h2>
          <address className="flex flex-col gap-[4px] text-[14px] not-italic text-n300">
            <span>{CONTACT.address}</span>
            {CONTACT.email && (
              <a href={`mailto:${CONTACT.email}`} className="text-accent-strong">
                {CONTACT.email}
              </a>
            )}
            <span className="flex gap-[12px]">
              <a
                href={CONTACT.instagram}
                target="_blank"
                rel="noreferrer"
                className="text-accent-strong"
              >
                Instagram
              </a>
              <a
                href={CONTACT.github}
                target="_blank"
                rel="noreferrer"
                className="text-accent-strong"
              >
                GitHub
              </a>
              {/* 학술 LMS — 누구에게나 닿는 자리는 여기뿐이다 (#577 → #614: 상단 바에서는 계정 메뉴 안으로) */}
              {externalNavLinks().map((link) => (
                <a key={link.href} href={link.href} className="text-accent-strong">
                  {link.label}
                </a>
              ))}
            </span>
          </address>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <nav aria-label="안내 문서" className="flex flex-wrap gap-x-[14px] gap-y-[6px] text-[13.5px]">
            <Link href={ROUTES.privacy} className="text-n300 hover:text-ink">
              개인정보처리방침
            </Link>
            <Link href={ROUTES.photoNotice} className="text-n300 hover:text-ink">
              사진 게재 안내
            </Link>
            <Link href={ROUTES.terms} className="text-n300 hover:text-ink">
              이용약관
            </Link>
          </nav>
          <ThemeToggle fit />
        </div>

        <div className="flex flex-col gap-[4px] text-[12.5px] text-n500">
          <p>숭실대학교 공식 사이트가 아닌 학생 동아리 운영 사이트입니다.</p>
          <p>© SSCC 숭실컴퓨팅클럽</p>
        </div>
      </div>
    </footer>
  );
}
