"use client";
import { useEffect, useState, useRef } from "react";
import styles from "./ScrollNavbar.module.css";
import { scrollOverlayOptions as ov } from "./options";

type Phase = "hidden" | "entering" | "visible" | "leaving";

export default function ScrollNavbar() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const phaseRef = useRef<Phase>("hidden");
  const [pastHero, setPastHero] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    const SHOW_THRESHOLD = window.innerHeight * 0.95;
    const HIDE_THRESHOLD = window.innerHeight * 0.75;

    const onScroll = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const current = phaseRef.current;

      setPastHero(y > HIDE_THRESHOLD);

      const pos = y / vh;
      const stops = ov.fadeStops;
      let opacity = 0;
      if (stops.length > 0) {
        if (pos <= stops[0].vh) {
          opacity = stops[0].opacity;
        } else if (pos >= stops[stops.length - 1].vh) {
          opacity = stops[stops.length - 1].opacity;
        } else {
          for (let i = 0; i < stops.length - 1; i++) {
            const a = stops[i], b = stops[i + 1];
            if (pos >= a.vh && pos <= b.vh) {
              const t = (pos - a.vh) / (b.vh - a.vh);
              opacity = a.opacity + t * (b.opacity - a.opacity);
              break;
            }
          }
        }
      }
      const maxOpacity = stops.length ? stops[stops.length - 1].opacity : 1;
      const t = maxOpacity > 0 ? opacity / maxOpacity : 0;
      setOverlayOpacity(opacity);
      window.dispatchEvent(new CustomEvent("overlaychange", { detail: t }));

      if (y > SHOW_THRESHOLD && current === "hidden") {
        setPhaseSync("entering");
        setTimeout(() => {
          if (phaseRef.current === "entering") setPhaseSync("visible");
        }, 550);
      } else if (y < HIDE_THRESHOLD && (current === "visible" || current === "entering")) {
        setPhaseSync("leaving");
        setTimeout(() => {
          if (phaseRef.current === "leaving") setPhaseSync("hidden");
        }, 450);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    setPhaseSync("leaving");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setPhaseSync("hidden"), 800);
    }, 380);
  };

  return (
    <>
      {}
      <div
        className={styles.leftOverlay}
        style={{
          opacity: overlayOpacity,
          background: `rgb(${ov.color[0]}, ${ov.color[1]}, ${ov.color[2]})`,
        }}
        aria-hidden="true"
      />

      {phase !== "hidden" && (
        <nav
          className={`${styles.nav} ${
            phase === "entering" || phase === "visible" ? styles.in : styles.out
          }`}
        >
          <button
            className={styles.btn}
            onClick={handleClick}
            aria-label="Back to top"
          >
            {}
            <img
              src="/images/signature_c.png"
              alt="cosmin"
              className={styles.sig}
            />
          </button>
        </nav>
      )}
    </>
  );
}
