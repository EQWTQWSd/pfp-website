"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ProjectsSection.module.css";
import { projectsOptions as po } from "./options";

interface Project {
  name: string;
  org: string;
  href: string | null;
  logo: string | null;
  langs: { name: string; color: string }[];
  getDescription: () => string;
}

const PROJECTS: Project[] = [
  {
    name: "Sonne Scheunenberg",
    org: "Restaurant",
    href: "https://www.sonne-scheunenberg.ch/",
    logo: null,
    langs: [
      { name: "Michelin ★", color: "#e8302e" },
      { name: "Gault&Millau 17", color: "#c8920c" },
      { name: "Fine Dining", color: "#9b59b6" },
    ],
    getDescription: () =>
      "Culinary apprentice (Vorlehre / Kücheangestellter EBA) at a Michelin-starred French-contemporary restaurant in Switzerland. Ranked #41 in Switzerland, #1416 worldwide.",
  },
  {
    name: "BBZ CFP Biel-Bienne",
    org: "School",
    href: "https://bbz-cfp.ch/de",
    logo: null,
    langs: [
      { name: "Vorlehre", color: "#5b8cff" },
      { name: "Küche", color: "#2ecc71" },
    ],
    getDescription: () =>
      "Vocational school student in the Vorlehre programme — kitchen / culinary arts track (Kücheangestellter EBA).",
  },
];

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const smoothRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (!po.parallaxEnabled || isMobile) return;

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

  const scrollToAbout = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section id="projects" className={styles.section} ref={sectionRef} aria-label="My work">
      <div ref={wrapRef} style={{ willChange: "transform" }}>
        <div className={`${styles.labelRow} ${inView ? styles.inView : ""}`}>
          <span className={styles.labelRule} />
          <span className={styles.labelText}>my work</span>
        </div>

        <div className={styles.grid}>
          {PROJECTS.map((p, i) => (
            <ProjectCard
              key={p.name}
              project={p}
              description={p.getDescription()}
              inView={inView}
              delay={i * 110}
            />
          ))}
        </div>

        <p className={`${styles.footer} ${inView ? styles.footerInView : ""}`}>
          open to commissions, feel free to{" "}
          <button type="button" className={styles.contactBtn} onClick={scrollToAbout}>
            contact
          </button>{" "}
          me! :)
        </p>
      </div>
    </section>
  );
}

function ProjectCard({
  project,
  description,
  inView,
  delay,
}: {
  project: Project;
  description: string;
  inView: boolean;
  delay: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    card.style.setProperty("--sx", `${mx * 100}%`);
    card.style.setProperty("--sy", `${my * 100}%`);
    const rx = -(my - 0.5) * 10;
    const ry = (mx - 0.5) * 10;
    card.style.transition = "transform 0.12s ease, box-shadow 0.12s ease";
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.015)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.65s cubic-bezier(0.23,1,0.32,1), box-shadow 0.65s cubic-bezier(0.23,1,0.32,1)";
    card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)";
  };

  return (
    <div
      ref={cardRef}
      className={`${styles.card} ${inView ? styles.cardInView : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={project.href ? () => window.open(project.href!, "_blank") : undefined}
      role={project.href ? "link" : undefined}
      tabIndex={project.href ? 0 : undefined}
      onKeyDown={project.href ? (e) => { if (e.key === "Enter") window.open(project.href!, "_blank"); } : undefined}
    >
      <div className={styles.spotlight} aria-hidden="true" />

      <div className={styles.cardHeader}>
        {project.logo && !logoFailed ? (
          <img
            src={project.logo}
            alt=""
            className={styles.logo}
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className={styles.fileIcon} aria-hidden="true">
            <FileIcon />
          </span>
        )}
        <span className={styles.orgName}>{project.org}</span>
        <span className={styles.titleSep}>/</span>
        <span className={styles.projectName}>{project.name}</span>
      </div>

      <p className={styles.description}>{description}</p>

      <div className={styles.langs}>
        {project.langs.map((l) => (
          <span key={l.name} className={styles.langTag}>
            <span className={styles.langDot} style={{ background: l.color }} />
            {l.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M3 1.5A1.5 1.5 0 0 1 4.5 0h5.586a1.5 1.5 0 0 1 1.06.44l2.415 2.414A1.5 1.5 0 0 1 14 3.914V14.5A1.5 1.5 0 0 1 12.5 16h-8A1.5 1.5 0 0 1 3 14.5v-13ZM4.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V3.914a.5.5 0 0 0-.147-.353L10.44 1.146A.5.5 0 0 0 10.086 1H4.5Z"/>
    </svg>
  );
}
