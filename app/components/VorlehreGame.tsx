"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./VorlehreGame.module.css";

interface IngredientTarget {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  decay: number;
  type: "prep" | "special" | "gourmet";
  label: string;
  color: string;
  icon: string;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const INGREDIENTS = [
  { label: "STEAK", icon: "🥩", color: "#b18dd0", type: "prep" as const },
  { label: "SALMON", icon: "🐟", color: "#8968ae", type: "prep" as const },
  { label: "TRUFFLE", icon: "🍄", color: "#e5d4f5", type: "special" as const },
  { label: "SAUCE", icon: "🍷", color: "#d8a3ed", type: "prep" as const },
  { label: "GOURMET DISH", icon: "🍽️", color: "#23a55a", type: "gourmet" as const },
];

export default function VorlehreGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "ended">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [streak, setStreak] = useState(1);
  const [rank, setRank] = useState("APPRENTICE");

  const targetsRef = useRef<IngredientTarget[]>([]);
  const particlesRef = useRef<EmberParticle[]>([]);
  const nextTargetId = useRef(1);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("__vorlehreHighScore");
      if (saved) setHighScore(parseInt(saved, 10));
    } catch {}
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState("ended");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    if (gameState === "ended") {
      let earnedRank = "VORLEHRE APPRENTICE";
      if (score >= 4000) earnedRank = "EXECUTIVE MASTER CHEF 👨‍🍳";
      else if (score >= 2500) earnedRank = "CHEF DE CUISINE 🏆";
      else if (score >= 1200) earnedRank = "CHEF DE PARTIE ✨";
      setRank(earnedRank);

      setHighScore((prev) => {
        const updated = Math.max(prev, score);
        try {
          localStorage.setItem("__vorlehreHighScore", String(updated));
        } catch {}
        return updated;
      });
    }
  }, [gameState, score]);

  function startGame() {
    setScore(0);
    setStreak(1);
    setTimeLeft(30);
    setRank("APPRENTICE");
    targetsRef.current = [];
    particlesRef.current = [];
    setGameState("playing");
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastSpawn = 0;

    const render = (time: number) => {
      animationRef.current = requestAnimationFrame(render);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(177, 141, 208, 0.08)";
      ctx.lineWidth = 1;
      const step = 24;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (gameState === "playing") {
        if (time - lastSpawn > 550 && targetsRef.current.length < 5) {
          lastSpawn = time;
          const item = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
          const radius = item.type === "gourmet" ? 26 : 22;
          const padding = 40;

          targetsRef.current.push({
            id: nextTargetId.current++,
            x: padding + Math.random() * (width - padding * 2),
            y: padding + Math.random() * (height - padding * 2),
            radius,
            maxRadius: radius,
            life: 1,
            decay: item.type === "gourmet" ? 0.016 : 0.011,
            type: item.type,
            label: item.label,
            color: item.color,
            icon: item.icon,
          });
        }
      }

      targetsRef.current.forEach((t) => {
        t.life -= t.decay;
        if (t.life <= 0) {
          setStreak(1);
        }

        const alpha = Math.max(0, t.life);
        ctx.save();
        ctx.translate(t.x, t.y);

        ctx.beginPath();
        ctx.arc(0, 0, t.maxRadius * (1 + (1 - t.life)), 0, Math.PI * 2);
        ctx.strokeStyle = t.color;
        ctx.globalAlpha = alpha * 0.7;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, t.maxRadius * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(20, 11, 36, 0.75)";
        ctx.strokeStyle = t.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();

        ctx.font = `${t.maxRadius * 0.95}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = alpha;
        ctx.fillText(t.icon, 0, 1);

        ctx.restore();
      });

      targetsRef.current = targetsRef.current.filter((t) => t.life > 0);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.035;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fill();
        ctx.restore();
      });

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let hit = false;

    targetsRef.current = targetsRef.current.filter((t) => {
      const dist = Math.hypot(t.x - clickX, t.y - clickY);
      if (dist <= t.maxRadius * 1.5) {
        hit = true;

        for (let i = 0; i < 14; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.2 + Math.random() * 4;
          particlesRef.current.push({
            x: t.x,
            y: t.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            color: t.color,
            size: 1.5 + Math.random() * 2.5,
          });
        }

        const basePts = t.type === "gourmet" ? 300 : t.type === "special" ? 200 : 100;
        setScore((prev) => prev + basePts * streak);
        setStreak((prev) => Math.min(prev + 1, 5));

        return false;
      }
      return true;
    });

    if (!hit) {
      setStreak(1);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.gridBg} />

      {}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.hudDot} />
          <span className={styles.title}>VORLEHRE KITCHEN PREP HUD</span>
        </div>
        <div className={styles.statsGroup}>
          <span className={styles.badge}>PREP SCORE: {score}</span>
          <span className={styles.badge}>TOP SCORE: {highScore}</span>
        </div>
      </div>

      {}
      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onClick={handleCanvasClick}
        />

        {gameState !== "playing" && (
          <div className={styles.overlayStart}>
            <span className={styles.startTitle}>
              {gameState === "ended" ? "PREP SERVICE COMPLETE" : "VORLEHRE CULINARY CHALLENGE"}
            </span>
            <span className={styles.startSub}>
              {gameState === "ended"
                ? `RANK: ${rank} | SCORE: ${score} PTS`
                : "BBZ CFP KITCHEN PREP — SLICE INGREDIENTS BEFORE EXPIRATION"}
            </span>
            <button type="button" className={styles.startBtn} onClick={startGame}>
              {gameState === "ended" ? "NEXT PREP SHIFT" : "START KITCHEN SHIFT"}
            </button>
          </div>
        )}
      </div>

      {}
      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <span>SHIFT TIME:</span>
          <span className={styles.valueHighlight}>{timeLeft}S</span>
        </div>
        <div className={styles.metaItem}>
          <span>COOKING STREAK:</span>
          <span className={styles.valueHighlight}>{streak}X MULTIPLIER</span>
        </div>
      </div>
    </div>
  );
}
