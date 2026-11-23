import { useNavigate } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { BrandMark, ScButton, Screen } from "@/components/sc/ui";
import { Seo } from "@/components/Seo";

export function ErrorScene({ code, title, body, primary, secondary }: { code: string; title: string; body: string; primary: { label: string; onClick: () => void }; secondary?: { label: string; onClick: () => void } }) {
  return (
    <Screen>
      <main className="min-h-[100dvh] px-6 pt-[max(env(safe-area-inset-top),2rem)] pb-10 flex flex-col">
        <BrandMark size={44} />
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
          <div className="relative w-[240px] h-[170px]" aria-hidden="true">
            <svg viewBox="0 0 240 170" width="240" height="170" fill="none">
              <rect x="6" y="20" width="228" height="140" rx="22" fill="#16A34A" />
              <g stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3">
                <path d="M120 20V160" />
                <circle cx="120" cy="90" r="26" />
                <rect x="6" y="58" width="34" height="64" />
                <rect x="200" y="58" width="34" height="64" />
              </g>
              <path d="M188 46c18-20 34-22 44-14" stroke="#0E1411" strokeWidth="3" strokeDasharray="3 8" strokeLinecap="round" />
              <circle cx="226" cy="22" r="14" fill="#FFFFFF" stroke="#0E1411" strokeWidth="3" />
              <path d="M226 14l6 4-2 7h-8l-2-7z" fill="#0E1411" />
            </svg>
            <span className="absolute left-1/2 -translate-x-1/2 top-[66px] text-[44px] leading-none font-extrabold text-white tracking-[-0.04em]">{code}</span>
          </div>
          <h1 className="m-0 text-[30px] leading-[34px] font-extrabold tracking-[-0.03em] max-w-[320px]">{title}</h1>
          <p className="m-0 text-[15px] leading-[22px] text-sc-ink2 max-w-[300px]">{body}</p>
        </div>
        <div className="flex flex-col gap-2.5">
          <ScButton icon={Home} onClick={primary.onClick}>{primary.label}</ScButton>
          {secondary && <ScButton kind="soft" icon={Search} onClick={secondary.onClick}>{secondary.label}</ScButton>}
        </div>
      </main>
    </Screen>
  );
}

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <>
      <Seo title="Page not found | SportCliq" description="This page is out of bounds." url={window.location.href} image={undefined} children={<meta name="robots" content="noindex" />} />
      <ErrorScene
        code="404"
        title="That ball went out of play"
        body="The page you want has moved or never existed. Let's get you back in the game."
        primary={{ label: "Back to home", onClick: () => navigate("/") }}
        secondary={{ label: "Search SportCliq", onClick: () => navigate("/search") }}
      />
    </>
  );
}
