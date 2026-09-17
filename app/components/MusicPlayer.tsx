"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./MusicPlayer.module.css";
import { songs, normalizeSrc } from "./songs.config";
import { playerOptions, playerStyleVars, scrollOverlayOptions } from "./options";

interface MusicPlayerProps {
  
  visible: boolean;
  
  onHoverSfx?: () => void;
  onClickSfx?: () => void;
}

const VOLUME = playerOptions.volume;

export default function MusicPlayer({
  visible,
  onHoverSfx,
  onClickSfx,
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const filter2Ref = useRef<BiquadFilterNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const muffleInitRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [coverFailed, setCoverFailed] = useState(false);
  
  const autoStarted = useRef(false);

  const current = songs[index];

  
  const resolvedCover = current.cover?.trim()
    ? normalizeSrc(current.cover)
    : playerOptions.defaultCover.trim()
      ? normalizeSrc(playerOptions.defaultCover)
      : "";

  useEffect(() => {
    setCoverFailed(false);
  }, [resolvedCover]);

  

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % songs.length);
  }, []);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + songs.length) % songs.length);
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, []);

  

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__currentSongName = current.name;
    }
    const a = audioRef.current;
    if (!a) return;
    const shouldKeepPlaying = isPlaying || autoStarted.current;
    a.src = normalizeSrc(current.src);
    a.load();
    if (shouldKeepPlaying) {
      a.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [index]);

  useEffect(() => {
    if (!visible) return;
    const a = audioRef.current;
    if (!a) return;
    a.volume = VOLUME;

    let cleaned = false;
    let removeFallback: (() => void) | null = null;

    const installFallback = () => {
      if (cleaned || removeFallback) return;

      const tryStart = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.play()
          .then(() => {
            autoStarted.current = true;
            setIsPlaying(true);
            removeFallback?.();
          })
          .catch(() => {
          });
      };

      const opts: AddEventListenerOptions = { passive: true, capture: true };
      window.addEventListener("pointerdown", tryStart, opts);
      window.addEventListener("keydown", tryStart, opts);
      window.addEventListener("touchstart", tryStart, opts);

      removeFallback = () => {
        window.removeEventListener("pointerdown", tryStart, opts);
        window.removeEventListener("keydown", tryStart, opts);
        window.removeEventListener("touchstart", tryStart, opts);
        removeFallback = null;
      };
    };

    a.play()
      .then(() => {
        autoStarted.current = true;
        setIsPlaying(true);
      })
      .catch(() => {
        installFallback();
      });

    return () => {
      cleaned = true;
      removeFallback?.();
    };
  }, [visible]);

  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!muffleInitRef.current) {
      muffleInitRef.current = true;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;

        const f1 = ctx.createBiquadFilter();
        f1.type = "lowpass";
        f1.frequency.value = scrollOverlayOptions.muffleOpenFrequency;
        f1.Q.value = 0;
        const f2 = ctx.createBiquadFilter();
        f2.type = "lowpass";
        f2.frequency.value = scrollOverlayOptions.muffleOpenFrequency;
        f2.Q.value = 0;
        const gain = ctx.createGain();
        gain.gain.value = 1;

        const src = ctx.createMediaElementSource(audio);
        src.connect(analyser);
        analyser.connect(f1);
        f1.connect(f2);
        f2.connect(gain);
        gain.connect(ctx.destination);

        audioCtxRef.current = ctx;
        filterRef.current = f1;
        filter2Ref.current = f2;
        gainRef.current = gain;

        if (typeof window !== "undefined") {
          (window as unknown as Record<string, unknown>).__audioAnalyser = analyser;
          (window as unknown as Record<string, unknown>).__audioElement = audio;
        }
      } catch (err) {
        console.warn("[MusicPlayer] Web Audio API initialization:", err);
      }
    }

    const applyMuffle = (t: number) => {
      const f1 = filterRef.current;
      const f2 = filter2Ref.current;
      const g = gainRef.current;
      const c = audioCtxRef.current;
      if (!f1 || !f2 || !g || !c) return;
      const tc = Math.pow(t, scrollOverlayOptions.muffleCurve ?? 1);
      const smooth = scrollOverlayOptions.muffleSmoothing;
      const freq = scrollOverlayOptions.muffleOpenFrequency +
        tc * (scrollOverlayOptions.muffleFrequency - scrollOverlayOptions.muffleOpenFrequency);
      const q = tc * scrollOverlayOptions.muffleQ;
      const gainVal = 1 + tc * (scrollOverlayOptions.muffleGain - 1);
      f1.frequency.setTargetAtTime(freq, c.currentTime, smooth);
      f1.Q.setTargetAtTime(q, c.currentTime, smooth);
      f2.frequency.setTargetAtTime(freq, c.currentTime, smooth);
      f2.Q.setTargetAtTime(q * 0.6, c.currentTime, smooth);
      g.gain.setTargetAtTime(gainVal, c.currentTime, smooth);
    };

    const onOverlay = (e: Event) => {
      const t = (e as CustomEvent<number>).detail;
      const c = audioCtxRef.current;
      if (!c) return;
      if (c.state === "suspended") {
        c.resume().then(() => applyMuffle(t));
      } else {
        applyMuffle(t);
      }
    };

    window.addEventListener("overlaychange", onOverlay);
    return () => window.removeEventListener("overlaychange", onOverlay);
  }, []);

  

  const onSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const a = audioRef.current;
      if (!a || !a.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      a.currentTime = Math.max(0, Math.min(1, ratio)) * a.duration;
    },
    []
  );

  

  const progressPct =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleHover = () => onHoverSfx?.();
  const handleClick = () => onClickSfx?.();

  return (
    <div
      className={styles.player}
      data-position={playerOptions.position}
      style={playerStyleVars()}
      aria-label="Music player"
    >
      <audio
        ref={audioRef}
        src={normalizeSrc(current.src)}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={next}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
      />

      {}
      <div
        className={[
          styles.disc,
          isPlaying ? styles.spinning : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-full-cover={playerOptions.fullDiscCover ? "true" : undefined}
        aria-hidden="true"
      >
        <div className={styles.discGrooves} />
        <div className={styles.discInner}>
          {resolvedCover && !coverFailed ? (
            <img
              src={resolvedCover}
              alt=""
              className={styles.cover}
              draggable={false}
              onError={() => {
                if (typeof console !== "undefined") {
                  console.warn(
                    `[MusicPlayer] cover image failed to load: "${resolvedCover}" ` +
                      `(song: "${current.name}"). Check the path; it must resolve ` +
                      `to a file under /public.`
                  );
                }
                setCoverFailed(true);
              }}
            />
          ) : (
            <div className={styles.coverFallback}>
              <span>{current.name.charAt(0).toUpperCase() || "♪"}</span>
            </div>
          )}
        </div>
        <div className={styles.discHole} />
        <div className={styles.discShine} />
      </div>

      {}
      {playerOptions.showTitle && (
        <div className={styles.title} title={current.name}>
          {current.name}
        </div>
      )}

      {playerOptions.showProgress && (
        <>
          <div
            className={styles.progressTrack}
            onClick={onSeek}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
            aria-label="seek"
            tabIndex={0}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className={styles.timeRow}>
            <span>{formatTime(currentTime)}</span>
            <span className={styles.timeSep}>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </>
      )}

      {}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.ctrlBtn}
          aria-label="previous track"
          onMouseEnter={handleHover}
          onFocus={handleHover}
          onClick={() => {
            handleClick();
            prev();
          }}
        >
          <PrevIcon />
        </button>

        <button
          type="button"
          className={`${styles.ctrlBtn} ${styles.playBtn}`}
          aria-label={isPlaying ? "pause" : "play"}
          onMouseEnter={handleHover}
          onFocus={handleHover}
          onClick={() => {
            handleClick();
            togglePlay();
          }}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          type="button"
          className={styles.ctrlBtn}
          aria-label="next track"
          onMouseEnter={handleHover}
          onFocus={handleHover}
          onClick={() => {
            handleClick();
            next();
          }}
        >
          <NextIcon />
        </button>
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${sec}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M7 5v14l12-7L7 5z" fill="currentColor" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" fill="currentColor" />
    </svg>
  );
}
function PrevIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <rect x="5" y="5" width="2.5" height="14" fill="currentColor" />
      <path d="M20 5L9 12l11 7V5z" fill="currentColor" />
    </svg>
  );
}
function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path d="M4 5l11 7-11 7V5z" fill="currentColor" />
      <rect x="16.5" y="5" width="2.5" height="14" fill="currentColor" />
    </svg>
  );
}
