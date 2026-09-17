"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Hero from "./Hero";
import TrailingCursor from "./TrailingCursor";
import { ConfigProvider } from "./useConfig";
import styles from "./ClientShell.module.css";
import { introOptions } from "./options";

type Phase = "intro" | "hero";
type IntroStage = "booting" | "transitioned";

const POST_BOOT_HOLD_MS = 350;   
const TRANSITION_DURATION_MS = 1100; 
const INTRO_FADE_OUT_MS = 900;   

const INTRO_COOKIE = "viewedIntro";

const HERO_SESSION_KEY = "heroSession";

const BOOT_LINES: { text: string; delay: number }[] = [
  { text: "BOOTING SYSTEM...",            delay: 80 },
  { text: "",                                       delay: 220 },
  { text: "Commencing System Check",                delay: 200 },
  { text: "Memory Unit: Green",                     delay: 140 },
  { text: "Initializing Tactics Log",               delay: 150 },
  { text: "Loading Geographic Data",                delay: 180 },
  { text: "Vitals: Green",                          delay: 130 },
  { text: "Remaining MP: 100%",                     delay: 150 },
  { text: "Black Box Temperature: Normal",          delay: 180 },
  { text: "Black Box internal Pressure: Normal",    delay: 180 },
  { text: "Activating IFF",                         delay: 130 },
  { text: "Activating FCS",                         delay: 130 },
  { text: "Initializing Pod Connection",            delay: 160 },
  { text: "Launching DBU Setup",                    delay: 150 },
  { text: "Activating Inertia Control System",      delay: 180 },
  { text: "Activating Environmental Sensors",       delay: 180 },
  { text: "Equipmnent Authentification: Complete",  delay: 200 },
  { text: "Equipment Status: Green",                delay: 150 },
  { text: "All Systems Green",                      delay: 130 },
  { text: "Combat Preparations Complete",           delay: 200 },
];

function setViewedIntroCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${INTRO_COOKIE}=1; max-age=31536000; path=/; samesite=lax`;
}

function setHeroSessionFlag(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HERO_SESSION_KEY, "1");
  } catch {
    
  }
}

function readHeroSessionFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(HERO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function decideSkipIntro(hasViewedIntro: boolean): boolean {
  if (!introOptions.includeIntro) return true;
  if (introOptions.rememberIntroSeen && hasViewedIntro) return true;
  return false;
}

interface ClientShellProps {
  
  hasViewedIntro: boolean;
}

export default function ClientShell({ hasViewedIntro }: ClientShellProps) {
  return (
    <ConfigProvider>
      <ClientShellInner hasViewedIntro={hasViewedIntro} />
    </ConfigProvider>
  );
}

function ClientShellInner({ hasViewedIntro }: ClientShellProps) {
  const [skipIntro] = useState<boolean>(() => decideSkipIntro(hasViewedIntro));

  const [phase, setPhase] = useState<Phase>("intro");
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [introStage, setIntroStage] = useState<IntroStage>(
    skipIntro ? "transitioned" : "booting"
  );
  const [introMounted, setIntroMounted] = useState(true);
  const [introFadingOut, setIntroFadingOut] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  
  const [bootGate, setBootGate] = useState<boolean>(true);

  useEffect(() => {
    const onScroll = () => {
      const vh = (window.scrollY / window.innerHeight) * 100;
      console.log(`scroll: ${vh.toFixed(1)}vh`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!introOptions.rememberHeroSession) {
      setBootGate(false);
      return;
    }
    if (readHeroSessionFlag()) {
      setPhase("hero");
      setIntroMounted(false);
      setBootGate(false);
      window.requestAnimationFrame(() => setHeroVisible(true));
    } else {
      setBootGate(false);
    }
  }, []);

  useEffect(() => {
    if (phase !== "intro" || skipIntro) return;
    let cancelled = false;
    const timeouts: number[] = [];
    let cumulative = 0;

    BOOT_LINES.forEach((line) => {
      cumulative += line.delay;
      const t = window.setTimeout(() => {
        if (cancelled) return;
        setBootLines((prev) => [...prev, line.text]);
      }, cumulative);
      timeouts.push(t);
    });

    cumulative += POST_BOOT_HOLD_MS;
    timeouts.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setIntroStage("transitioned");
      }, cumulative)
    );

    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [phase, skipIntro]);

  useEffect(() => {
    if (
      introStage === "transitioned" &&
      !skipIntro &&
      introOptions.rememberIntroSeen
    ) {
      setViewedIntroCookie();
    }
  }, [introStage, skipIntro]);

  const continueReady = introStage === "transitioned";

  const handleContinue = useCallback(() => {
    if (phase !== "intro" || !continueReady) return;
    if (introOptions.rememberHeroSession) {
      setHeroSessionFlag();
    }
    setIntroFadingOut(true);
    setPhase("hero");
    window.requestAnimationFrame(() => setHeroVisible(true));
    window.setTimeout(
      () => setIntroMounted(false),
      INTRO_FADE_OUT_MS + 100
    );
  }, [phase, continueReady]);

  const onContinueKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleContinue();
      }
    },
    [handleContinue]
  );

  return (
    <>
      {phase === "hero" && <Hero visible={heroVisible} />}
      {phase === "hero" && <TrailingCursor />}
      {introMounted && (
        <IntroScreen
          lines={bootLines}
          stage={introStage}
          skip={skipIntro}
          fadingOut={introFadingOut}
          gated={bootGate}
          onContinue={handleContinue}
          onKey={onContinueKey}
          transitionDuration={TRANSITION_DURATION_MS}
        />
      )}
    </>
  );
}

function renderBootLineText(text: string): React.ReactNode {
  if (!text) return "\u00A0";
  if (!text.includes("Green")) return text;

  const parts = text.split(/(Green)/g);
  return parts.map((part, i) =>
    part === "Green" ? (
      <span key={i} className={styles.green}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function IntroScreen({
  lines,
  stage,
  skip,
  fadingOut,
  gated,
  onContinue,
  onKey,
  transitionDuration,
}: {
  lines: string[];
  stage: IntroStage;
  skip: boolean;
  fadingOut: boolean;
  gated: boolean;
  onContinue: () => void;
  onKey: (e: React.KeyboardEvent) => void;
  transitionDuration: number;
}) {
  const consoleRef = useRef<HTMLDivElement>(null);
  const interactive = stage === "transitioned" && !fadingOut && !gated;

  useEffect(() => {
    const el = consoleRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <section
      className={[
        styles.introScreen,
        skip ? styles.introSkip : "",
        stage === "transitioned" ? styles.introTransitioned : "",
        fadingOut ? styles.introFadingOut : "",
        gated ? styles.introGated : "",
        interactive ? styles.introScreenInteractive : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        { "--intro-transition-ms": `${transitionDuration}ms` } as React.CSSProperties
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={interactive ? "click to continue" : undefined}
      onClick={interactive ? onContinue : undefined}
      onKeyDown={interactive ? onKey : undefined}
    >
      {}
      {!skip && <div className={styles.yorhaBg} aria-hidden="true" />}

      {}
      <div className={styles.nierBg} aria-hidden="true" />

      {!skip && (
        <div ref={consoleRef} className={styles.bootConsole}>
          {lines.map((line, i) => (
            <div key={i} className={styles.bootLine}>
              {renderBootLineText(line)}
            </div>
          ))}
          <div className={styles.bootCursor}>
            <span>_</span>
          </div>
        </div>
      )}

      <div className={styles.continueInner}>
        <Image
          src="/images/signature.png"
          alt="signature"
          width={320}
          height={96}
          priority
          className={styles.signatureImg}
          draggable={false}
        />
        <span className={styles.continueText}>click to continue</span>
      </div>
    </section>
  );
}
