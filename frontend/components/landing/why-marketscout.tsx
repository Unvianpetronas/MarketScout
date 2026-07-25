"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/providers/language-provider";

/**
 * "Why MarketScout?" impact section — numeral-led, asymmetric layout.
 * The giant stats (8 / 190+ / <60s) ARE the visual, replacing icon cards.
 * Recreated from design_handoff_why_marketscout, adapted to the site's
 * Sora display font + brand-green accent. Scoped styles via `.wms-*`.
 */
export function WhyMarketScout() {
  const { t } = useLanguage();
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="features"
      className={`wms scroll-mt-16 ${visible ? "is-visible" : ""}`}
    >
      <style>{WMS_CSS}</style>
      <span className="wms-blob" aria-hidden="true" />

      <div className="wms-inner">
        <div className="wms-head">
          <div className="wms-ghost3" aria-hidden="true">3</div>

          <div className="wms-eyebrow">
            <span className="wms-rule" />
            <span className="wms-eyebrow-label">{t("landing.features.eyebrow")}</span>
          </div>

          <h2 className="wms-h2">
            {t("landing.features.titlePrefix")}
            <span>Market</span>
            <span className="wms-accent">Scout</span>
            {t("landing.features.titleSuffix")}
          </h2>

          <p className="wms-sub">{t("landing.features.subtitle")}</p>
        </div>

        <div className="wms-grid">
          {/* Column 1 — 8 pillars */}
          <div className="wms-col wms-col1">
            <div className="wms-anim">
              <div className="wms-numwrap">
                <div className="wms-ghost wms-ghost1" aria-hidden="true">8</div>
                <div className="wms-mark" />
                <div className="wms-num wms-num1">8</div>
              </div>
              <h3 className="wms-label">{t("landing.feature.pillars.label")}</h3>
              <p className="wms-body wms-body1">{t("landing.feature.pillars.desc")}</p>
            </div>
          </div>

          {/* Column 2 — 190+ countries */}
          <div className="wms-col wms-col2">
            <span className="wms-divider" aria-hidden="true" />
            <div className="wms-anim">
              <div className="wms-numwrap">
                <div className="wms-ghost wms-ghost2" aria-hidden="true">190</div>
                <div className="wms-mark" />
                <div className="wms-num wms-num2">190+</div>
              </div>
              <h3 className="wms-label">{t("landing.feature.countries.label")}</h3>
              <p className="wms-body wms-body2">{t("landing.feature.countries.desc")}</p>
            </div>
          </div>

          {/* Column 3 — <60s */}
          <div className="wms-col wms-col3">
            <span className="wms-divider" aria-hidden="true" />
            <div className="wms-anim">
              <div className="wms-numwrap">
                <div className="wms-ghost wms-ghost3n" aria-hidden="true">60</div>
                <div className="wms-mark" />
                <div className="wms-num wms-num3">&lt;60s</div>
              </div>
              <h3 className="wms-label">{t("landing.feature.instant.label")}</h3>
              <p className="wms-body wms-body3">{t("landing.feature.instant.desc")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const WMS_CSS = `
.wms { position:relative; width:100%; background:#f7f8fb; padding:120px 48px 140px; overflow:hidden; }
.wms-blob { position:absolute; top:-220px; right:-180px; width:640px; height:640px; border-radius:50%;
  background:radial-gradient(circle, rgba(0,168,89,0.14) 0%, rgba(0,168,89,0) 70%); filter:blur(30px); pointer-events:none; }
.wms-inner { position:relative; max-width:1360px; margin:0 auto; z-index:1; }

.wms-head { position:relative; max-width:660px; margin-bottom:96px; }
.wms-ghost3 { position:absolute; bottom:calc(100% + 14px); right:0; font-family:var(--font-display),sans-serif;
  font-weight:800; font-size:90px; line-height:1; color:#10162b; opacity:.05; z-index:0; user-select:none; pointer-events:none; }
.wms-eyebrow { position:relative; z-index:1; display:inline-flex; align-items:center; gap:10px; margin-bottom:20px; }
.wms-rule { width:22px; height:2px; border-radius:1px; background:#059669; display:inline-block; }
.wms-eyebrow-label { font-size:13px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#059669; }
.wms-h2 { position:relative; z-index:1; margin:0 0 20px; font-family:var(--font-display),sans-serif; font-weight:800;
  font-size:clamp(34px,4.6vw,60px); line-height:1.06; letter-spacing:-.02em; color:#10162b; }
.wms-accent { color:#059669; }
.wms-sub { position:relative; z-index:1; margin:0; font-size:18px; line-height:1.65; color:#5b6474; max-width:600px; }

.wms-grid { display:grid; grid-template-columns:1.3fr .85fr 1fr; align-items:start; }
.wms-col { position:relative; border-radius:20px; background-color:transparent;
  transition:transform .45s cubic-bezier(.16,1,.3,1), background-color .45s ease; }
.wms-col:hover { background-color:rgba(16,22,43,.03); }
.wms-col1 { padding:40px 40px 40px 0; transform:translateY(0); }
.wms-col1:hover { transform:translateY(-10px); }
.wms-col2 { padding:40px 44px; transform:translateY(64px); }
.wms-col2:hover { transform:translateY(54px); }
.wms-col3 { padding:40px 0 40px 44px; transform:translateY(24px); }
.wms-col3:hover { transform:translateY(14px); }
.wms-divider { position:absolute; left:0; top:10%; bottom:10%; width:1px; background:rgba(16,22,43,.1); }

.wms-anim { position:relative; z-index:1; opacity:0; transform:translateY(26px);
  transition:opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1); }
.wms.is-visible .wms-col1 .wms-anim { opacity:1; transform:translateY(0); transition-delay:.05s; }
.wms.is-visible .wms-col2 .wms-anim { opacity:1; transform:translateY(0); transition-delay:.15s; }
.wms.is-visible .wms-col3 .wms-anim { opacity:1; transform:translateY(0); transition-delay:.25s; }

.wms-numwrap { position:relative; }
.wms-ghost { position:absolute; bottom:0; font-family:var(--font-display),sans-serif; font-weight:800; line-height:1;
  color:#10162b; opacity:.045; z-index:0; user-select:none; pointer-events:none; white-space:nowrap; }
.wms-ghost1 { left:-8px; font-size:250px; }
.wms-ghost2 { left:-6px; font-size:170px; }
.wms-ghost3n { left:-6px; font-size:200px; }
.wms-mark { position:relative; z-index:1; width:32px; height:3px; border-radius:2px; background:#059669; margin-bottom:24px; }
.wms-num { position:relative; z-index:1; font-family:var(--font-display),sans-serif; font-weight:800; line-height:.95; color:#10162b; }
.wms-num1 { font-size:clamp(96px,11vw,168px); letter-spacing:-.04em; }
.wms-num2 { font-size:clamp(64px,7vw,92px); letter-spacing:-.03em; }
.wms-num3 { font-size:clamp(72px,8vw,108px); letter-spacing:-.03em; }
.wms-label { position:relative; z-index:1; margin:16px 0 12px; font-family:var(--font-display),sans-serif;
  font-weight:700; font-size:23px; color:#10162b; }
.wms-body { position:relative; z-index:1; margin:0; font-size:16.5px; line-height:1.65; color:#5b6474; }
.wms-body1 { max-width:340px; }
.wms-body2 { max-width:280px; }
.wms-body3 { max-width:320px; }

@media (prefers-reduced-motion: reduce) {
  .wms-anim { transition:none; opacity:1; transform:none; }
}

@media (max-width: 900px) {
  .wms { padding:72px 24px 84px; }
  .wms-head { margin-bottom:56px; }
  .wms-grid { grid-template-columns:1fr; gap:12px; }
  .wms-col1, .wms-col2, .wms-col3 { transform:none; padding:28px 0; }
  .wms-col1:hover, .wms-col2:hover, .wms-col3:hover { transform:translateY(-6px); }
  .wms-divider { display:none; }
  .wms-ghost1 { font-size:190px; }
  .wms-ghost2 { font-size:140px; }
  .wms-ghost3n { font-size:160px; }
}
`;
