"use client";
import { useEffect, useRef, useState } from "react";
import { useLanyard } from "./useLanyard";
import { aboutSectionOptions as o, uiOptions } from "./options";
import AboutCard from "./AboutCard";
import SocialsCard from "./SocialsCard";
import styles from "./ContentSections.module.css";

const WOBBLE_PX = 16;

export default function ContentSections() {
  const lanyardData = useLanyard();
  const sectionRef = useRef<HTMLDivElement>(null);
  const aboutWrapRef = useRef<HTMLDivElement>(null);
  const socialsWrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const smoothRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return;
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };

    const tick = () => {
      const t = mouseRef.current;
      const s = smoothRef.current;
      const ease = uiOptions.wobbleSmoothness;
      s.x += (t.x - s.x) * ease;
      s.y += (t.y - s.y) * ease;

      const tx = s.x * WOBBLE_PX * uiOptions.wobbleXStrength;
      const ty = s.y * WOBBLE_PX * uiOptions.wobbleYStrength;

      if (aboutWrapRef.current) {
        aboutWrapRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
      }
      if (socialsWrapRef.current) {
        socialsWrapRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
      }

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
    <section className={styles.section} ref={sectionRef} aria-label="About and socials">
      <div
        className={styles.grid}
        style={{ gap: o.cardsGap, paddingLeft: o.rowPaddingLeft }}
      >
        <div
          ref={aboutWrapRef}
          className={styles.aboutWrap}
          style={{ marginTop: o.aboutCardTopOffset, marginLeft: -o.aboutCardLeftNudge }}
        >
          <div className={styles.aboutScale} style={{ transform: `scale(${o.aboutCardScale})`, transformOrigin: "top left" }}>
            <AboutCard lanyardData={lanyardData} inView={inView} />
          </div>
        </div>
        <div
          ref={socialsWrapRef}
          className={styles.socialsWrap}
          style={{ marginTop: o.socialsCardTopOffset, marginLeft: o.socialsCardRightNudge }}
        >
          <SocialsCard lanyardData={lanyardData} inView={inView} />
        </div>
      </div>
    </section>
  );
}
