"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./GlitchName.module.css";

const ORIGINAL = ["p", "a", "n", "."] as const;
const GLITCH_CHARS = "!<>-_/[]{}—=+*^?#$%&01pan".split("");
const GLITCH_EVERY_MS = 4000;
const FRAMES = 8;
const FRAME_MS = 55;

export default function GlitchName() {
  const [letters, setLetters] = useState<string[]>([...ORIGINAL]);
  const [glitching, setGlitching] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const first = window.setTimeout(() => runGlitch(), 1500);
    timers.current.push(first);

    const interval = window.setInterval(runGlitch, GLITCH_EVERY_MS);
    timers.current.push(interval);

    return () => {
      timers.current.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
      timers.current = [];
    };
  }, []);

  function runGlitch() {
    setGlitching(true);
    let i = 0;

    const tick = () => {
      setLetters((prev) =>
        prev.map((_, idx) =>
          Math.random() < 0.75
            ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            : ORIGINAL[idx]
        )
      );
      i++;
      if (i < FRAMES) {
        const t = window.setTimeout(tick, FRAME_MS);
        timers.current.push(t);
      } else {
        setLetters([...ORIGINAL]);
        const t = window.setTimeout(() => setGlitching(false), 120);
        timers.current.push(t);
      }
    };

    tick();
  }

  return (
    <div
      className={`${styles.name} ${glitching ? styles.glitching : ""}`}
      aria-label="pan."
    >
      {letters.map((ch, idx) => (
        <span key={idx}>{ch}</span>
      ))}
    </div>
  );
}
