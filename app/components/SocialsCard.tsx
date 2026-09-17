"use client";
import { useRef } from "react";
import { LanyardData, STATUS_COLOR, STATUS_LABEL } from "./useLanyard";
import { aboutSectionOptions as o } from "./options";
import styles from "./SocialsCard.module.css";

interface Social {
  name: string;
  username: string;
  href: string;
  icon: React.ReactNode;
}

interface Props {
  lanyardData: LanyardData | null;
  inView: boolean;
}

export default function SocialsCard({ lanyardData, inView }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width - 0.5;
    const my = (e.clientY - rect.top) / rect.height - 0.5;
    const rx = -my * o.socialsHoverMouseRange;
    const ry = o.socialsHoverTiltY + mx * o.socialsHoverMouseRange;
    card.style.transition = "transform 0.15s ease";
    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.7s cubic-bezier(0.23,1,0.32,1)";
    card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
  };

  const status = lanyardData?.discord_status ?? "offline";
  const dotColor = STATUS_COLOR[status];
  const statusLabel = STATUS_LABEL[status];
  const discordUsername = lanyardData?.discord_user?.username ?? "pan_latnok";

  const socials: Social[] = [
    {
      name: "discord",
      username: discordUsername,
      href: `https://discord.com/users/${process.env.NEXT_PUBLIC_DISCORD_ID ?? "1135288643070738464"}`,
      icon: <DiscordIcon />,
    },
    {
      name: "facebook",
      username: "Pan Latnok",
      href: "https://www.facebook.com/profile.php?id=100095281362070",
      icon: <FacebookIcon />,
    },
    {
      name: "instagram",
      username: "rueangsakda.latnok",
      href: "https://www.instagram.com/rueangsakda.latnok/",
      icon: <InstagramIcon />,
    },
    {
      name: "email",
      username: "rueangsakda.latnok@bbz-cfp.ch",
      href: "mailto:rueangsakda.latnok@bbz-cfp.ch",
      icon: <img src="/icons/email.svg" alt="email" width={16} height={16} style={{ display: "block" }} />,
    },
  ];

  return (
    <div
      ref={cardRef}
      className={`${styles.card} ${inView ? styles.inView : ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.label} style={{ opacity: o.labelOpacity }}>
        <span className={styles.labelRule} style={{ width: o.labelRuleWidth }} />
        <span className={styles.labelText}>find me at</span>
      </div>

      <div className={styles.statusRow}>
        <span className={styles.statusDot} style={{ background: dotColor }} />
        <span className={styles.statusText}>{statusLabel}</span>
      </div>

      <div className={styles.list}>
        {socials.map((s, i) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.row}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <span className={styles.icon}>{s.icon}</span>
            <span className={styles.platform}>{s.name}</span>
            <span className={styles.sep}>/</span>
            <span className={styles.username}>{s.username}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942.0209-.0407.0083-.0893-.0395-.1091-1.1641-.4415-2.2765-1.0052-3.354-1.6501-.0573-.033-.061-.1167-.0076-.1572.2257-.1692.4514-.3452.6671-.5231a.0752.0752 0 01.0785-.0105c4.0513 1.8495 8.4373 1.8495 12.4427 0a.0752.0752 0 01.0796.0095c.2157.1779.4414.3559.6671.5231.0533.0405.0496.1242-.0077.1572-1.0775.6449-2.1899 1.2086-3.354 1.6501-.0478.0198-.0604.0694-.0394.1091.3534.699.7642 1.3638 1.2255 1.9942a.076.076 0 00.0842.0276c1.961-.6066 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}
