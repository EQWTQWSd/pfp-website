"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./VoiceWaveHUD.module.css";

export default function VoiceWaveHUD() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [peakDb, setPeakDb] = useState("-∞ dB");

  const [songTitle, setSongTitle] = useState("♪ PLAYLIST TRACK");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      animationId = requestAnimationFrame(render);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
      const analyser = win.__audioAnalyser as AnalyserNode | undefined;
      const audioEl = win.__audioElement as HTMLAudioElement | undefined;
      const currentTrack = win.__currentSongName as string | undefined;

      if (currentTrack && currentTrack !== songTitle) {
        setSongTitle(currentTrack);
      }

      const audioActive = !!(audioEl && !audioEl.paused && audioEl.currentTime > 0);
      setIsPlaying(audioActive);

      const bufferLength = analyser ? analyser.frequencyBinCount : 32;
      const dataArray = new Uint8Array(bufferLength);

      if (analyser && audioActive) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        phase += 0.05;
        for (let i = 0; i < bufferLength; i++) {
          const val = Math.sin(phase + i * 0.2) * 20 + 25 + Math.cos(phase * 0.8 + i * 0.1) * 15;
          dataArray[i] = Math.max(8, Math.min(255, val));
        }
      }

      let maxVal = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxVal) maxVal = dataArray[i];
      }
      if (audioActive && maxVal > 0) {
        const db = Math.round((maxVal / 255) * 100);
        setPeakDb(`${db}% LEVEL`);
      } else {
        setPeakDb("STANDBY");
      }

      const barCount = 28;
      const gap = 3;
      const barWidth = Math.max(2, (width - gap * (barCount + 1)) / barCount);
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * bufferLength);
        const val = dataArray[dataIdx] || 10;
        const percent = val / 255;
        const barHeight = Math.max(4, percent * (height * 0.7));

        const x = gap + i * (barWidth + gap);
        const y = centerY - barHeight / 2;

        const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
        if (audioActive) {
          grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          grad.addColorStop(0.5, "rgba(177, 141, 208, 0.9)");
          grad.addColorStop(1, "rgba(137, 104, 174, 0.45)");
        } else {
          grad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
          grad.addColorStop(1, "rgba(177, 141, 208, 0.2)");
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, barWidth, barHeight, 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = audioActive ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.25)";

      const waveStep = width / barCount;
      for (let i = 0; i <= barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * (bufferLength - 1));
        const val = dataArray[dataIdx] || 10;
        const amp = (val / 255) * (height * 0.35);
        const x = i * waveStep;
        const y = centerY + Math.sin(phase + i * 0.4) * (audioActive ? amp : 6);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.gridBg} />
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={`${styles.hudDot} ${!isPlaying ? styles.hudDotPaused : ""}`} />
          <span className={styles.title}>WAVE VOICE HUD</span>
        </div>
        <span className={styles.statusBadge}>{isPlaying ? "AUDIO SYNC LIVE" : "IDLE"}</span>
      </div>

      <div className={canvasWrapStyle()}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <div className={styles.metaRow}>
        <div className={styles.metaItem} style={{ maxWidth: "70%", overflow: "hidden" }}>
          <span>NOW PLAYING:</span>
          <span
            className={styles.valueHighlight}
            style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", maxWidth: "100%" }}
            title={songTitle}
          >
            {songTitle}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span>LEVEL:</span>
          <span className={styles.valueHighlight}>{peakDb}</span>
        </div>
      </div>
    </div>
  );
}

function canvasWrapStyle(): string {
  return styles.canvasWrap;
}
