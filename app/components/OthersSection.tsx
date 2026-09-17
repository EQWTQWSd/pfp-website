"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./OthersSection.module.css";
import { webButtons } from "./buttons.config";
import { othersOptions as oo, projectsOptions as po } from "./options";
import VoiceWaveHUD from "./VoiceWaveHUD";
import VorlehreGame from "./VorlehreGame";

export default function OthersSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [copiedSrc, setCopiedSrc] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const smoothRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  function handleCopy(href: string | null | undefined, src: string) {
    if (!href) return;
    navigator.clipboard.writeText(href).catch(() => {});
    setCopiedSrc(src);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedSrc(null), 1400);
  }

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 768) return;
    const PX = po.parallaxStrength;
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    const tick = () => {
      const t = mouseRef.current;
      const s = smoothRef.current;
      s.x += (t.x - s.x) * po.parallaxSmoothness;
      s.y += (t.y - s.y) * po.parallaxSmoothness;
      if (wrapRef.current)
        wrapRef.current.style.transform = `translate(${s.x * PX}px, ${s.y * PX}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section id="others" className={styles.section} ref={sectionRef} aria-label="Others">
      <div ref={wrapRef} style={{ willChange: "transform" }}>
        <div className={`${styles.labelRow} ${inView ? styles.inView : ""}`}>
          <span className={styles.labelRule} />
          <span className={styles.labelText}>others</span>
        </div>

        <div className={`${styles.content} ${inView ? styles.contentInView : ""}`}>
          {}
          <div className={styles.panel}>
            <VoiceWaveHUD />
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>culinary preview</span>
            </div>

            <div
              className={styles.buttonGrid}
              style={{
                "--btn-w": `${88 * oo.buttonScale}px`,
                "--btn-h": `${31 * oo.buttonScale}px`,
                "--btn-cols": String(oo.buttonColumns),
                "--btn-overlay-fs": `${oo.buttonOverlayFontSize}px`,
              } as React.CSSProperties}
            >
              {webButtons.map((btn) => {
                const copied = copiedSrc === btn.src;
                const hasLink = !!btn.href;
                return (
                  <button
                    key={btn.src}
                    type="button"
                    className={`${styles.btnWrap} ${hasLink ? styles.btnHasLink : styles.btnNoLink} ${copied ? styles.btnCopied : ""}`}
                    onClick={() => handleCopy(btn.href, btn.src)}
                    title={btn.alt}
                  >
                    {}
                    <img src={btn.src} alt={btn.alt} className={styles.webBtn} width={88} height={31} />
                    {hasLink && (
                      <span className={styles.btnOverlay}>
                        {copied ? "COPIED!" : "COPY LINK"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {}
        <div className={`${styles.gameRow} ${inView ? styles.contentInView : ""}`}>
          <VorlehreGame />
        </div>
      </div>
    </section>
  );
}
