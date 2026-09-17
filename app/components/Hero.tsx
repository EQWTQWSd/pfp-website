"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GlitchName from "./GlitchName";
import MusicPlayer from "./MusicPlayer";
import ContentSections from "./ContentSections";
import ProjectsSection from "./ProjectsSection";
import OthersSection from "./OthersSection";
import ScrollNavbar from "./ScrollNavbar";
import styles from "./Hero.module.css";
import {
  buildVideoFilter,
  buildOverlay,
  videoOptions,
  uiStyleVars,
} from "./options";

interface HeroProps {
  visible: boolean;
}

export default function Hero({ visible }: HeroProps) {
  const ticRef = useRef<HTMLAudioElement | null>(null);
  const tacRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const parallaxRootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = parallaxRootRef.current;
    if (!root) return;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const EASE = 0.055; 

    const onMouseMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      targetX = (e.clientX / w) * 2 - 1;
      targetY = (e.clientY / h) * 2 - 1;
    };

    const tick = () => {
      currentX += (targetX - currentX) * EASE;
      currentY += (targetY - currentY) * EASE;
      root.style.setProperty("--mx", currentX.toFixed(4));
      root.style.setProperty("--my", currentY.toFixed(4));
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafId);
      root.style.removeProperty("--mx");
      root.style.removeProperty("--my");
    };
  }, []);

  useEffect(() => {
    ticRef.current = new Audio("/sfx/tic.mp3");
    tacRef.current = new Audio("/sfx/tac.mp3");

    if (ticRef.current) ticRef.current.volume = 0.35;
    if (tacRef.current) tacRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (!visible) return;

    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.play().catch(() => {});
    }
  }, [visible]);

  const playTic = useCallback(() => {
    const a = ticRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {
      
    }
  }, []);

  const playTac = useCallback(() => {
    const a = tacRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {
      
    }
  }, []);

  const handleNoop = useCallback(
    (e: React.MouseEvent) => {
      playTac();
      e.preventDefault();
    },
    [playTac]
  );

  const handleProjects = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      playTac();
      document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
    },
    [playTac]
  );

  const handleOthers = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      playTac();
      document.getElementById("others")?.scrollIntoView({ behavior: "smooth" });
    },
    [playTac]
  );

  const handleAboutMe = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      playTac();
      window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
    },
    [playTac]
  );

  const handleLogout = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      playTac();
      try { window.sessionStorage.removeItem("heroSession"); } catch {  }
      window.location.reload();
    },
    [playTac]
  );

  const handleScrollCta = useCallback(() => {
    playTac();
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  }, [playTac]);

  return (
    <>
      {}
      <div className={styles.bgLayer} aria-hidden="true">
        <video
          ref={videoRef}
          className={styles.video}
          src="/videos/background_small.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{ filter: buildVideoFilter() }}
        />
        <div
          className={styles.overlay}
          style={{ background: buildOverlay() }}
        />
        <div
          className={styles.grain}
          style={{ opacity: videoOptions.grainOpacity }}
        />
      </div>

      <main ref={parallaxRootRef} className={styles.main}>
        <section id="home" className={styles.hero}>
          <div className={styles.content}>
            <div className={styles.leftStack} style={uiStyleVars()}>
              <div className={styles.nameBlock}>
                <GlitchName />
                <p className={styles.tagline}>
                  CULINARY &middot; CREATOR &middot; APPRENTICE
                </p>
              </div>

              <nav className={styles.menu}>
                <div className={styles.rule} />

                <button
                  type="button"
                  className={styles.menuBtn}
                  onMouseEnter={playTic}
                  onFocus={playTic}
                  onClick={handleAboutMe}
                >
                  <MenuRow num="01" label="About Me" />
                </button>

                <button
                  type="button"
                  className={styles.menuBtn}
                  onMouseEnter={playTic}
                  onFocus={playTic}
                  onClick={handleProjects}
                >
                  <MenuRow num="02" label="Projects" />
                </button>

                <button
                  type="button"
                  className={styles.menuBtn}
                  onMouseEnter={playTic}
                  onFocus={playTic}
                  onClick={handleNoop}
                >
                  <MenuRow num="03" label="Photos" />
                </button>

                <button
                  type="button"
                  className={styles.menuBtn}
                  onMouseEnter={playTic}
                  onFocus={playTic}
                  onClick={handleOthers}
                >
                  <MenuRow num="04" label="Others" />
                </button>

                <button
                  type="button"
                  className={`${styles.menuBtn} ${styles.menuBtnLogout}`}
                  onMouseEnter={playTic}
                  onFocus={playTic}
                  onClick={handleLogout}
                >
                  <MenuRow num="05" label="Reboot" />
                </button>

                <div className={styles.rule} />
              </nav>

              <button
                type="button"
                className={styles.cta}
                onMouseEnter={playTic}
                onClick={handleScrollCta}
              >
                <span className={styles.ctaText}>scroll to explore</span>
              </button>
            </div>

            <MusicPlayer
              visible={visible}
              onHoverSfx={playTic}
              onClickSfx={playTac}
            />

            <div className={styles.counter}>
              <span
                className={styles.counterBadge}
                onMouseEnter={playTic}
                onClick={playTac}
                role="button"
                tabIndex={0}
              >
                <span className={styles.musicDot} />
                𝐊𝐡𝐚𝐦𝐏𝐚𝐧_̶𝐓̶𝐨̶𝐱̶𝐢̶𝐜̶̶ visited
              </span>
              <span className={styles.counterSep}>/</span>
              <span
                className={styles.counterVersion}
                onMouseEnter={playTic}
                onClick={playTac}
                role="button"
                tabIndex={0}
              >
                v5.1
              </span>
            </div>
          </div>
        </section>

        <ContentSections />
        <ProjectsSection />
        <OthersSection />
      </main>
      <ScrollNavbar />
    </>
  );
}

function MenuRow({ num, label }: { num: string; label: string }) {
  return (
    <div className={styles.item}>
      <span className={styles.num}>{num}</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.arrow}>&#9654;</span>
    </div>
  );
}
