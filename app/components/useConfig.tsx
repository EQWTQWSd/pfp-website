"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  videoOptions,
  uiOptions,
  introOptions,
  aboutSectionOptions,
  scrollOverlayOptions,
  playerOptions,
  projectsOptions,
  othersOptions,
} from "./options";

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const DEFAULTS = Object.freeze({
  video: deepClone(videoOptions),
  ui: deepClone(uiOptions),
  intro: deepClone(introOptions),
  about: deepClone(aboutSectionOptions),
  scrollOverlay: deepClone(scrollOverlayOptions),
  player: deepClone(playerOptions),
  projects: deepClone(projectsOptions),
  others: deepClone(othersOptions),
});

export type SiteConfig = {
  video: typeof videoOptions;
  ui: typeof uiOptions;
  intro: typeof introOptions;
  about: typeof aboutSectionOptions;
  scrollOverlay: typeof scrollOverlayOptions;
  player: typeof playerOptions;
  projects: typeof projectsOptions;
  others: typeof othersOptions;
};

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
}

const STORAGE_KEY = "siteConfig";
const UNLOCK_KEY = "configUnlocked";
const DISCORD_ID =
  process.env.NEXT_PUBLIC_DISCORD_ID ?? "1135288643070738464";

interface ConfigContextValue {
  isUnlocked: boolean;
  version: number;
  config: SiteConfig;
  discordUser: DiscordUser | null;
  updateConfig: (cfg: SiteConfig) => void;
  resetConfig: () => void;
}

const ConfigContext = createContext<ConfigContextValue>({
  isUnlocked: false,
  version: 0,
  config: deepClone(DEFAULTS) as SiteConfig,
  discordUser: null,
  updateConfig: () => {},
  resetConfig: () => {},
});

export function useConfig() {
  return useContext(ConfigContext);
}

function applyConfig(cfg: SiteConfig) {
  Object.assign(videoOptions, cfg.video);
  Object.assign(uiOptions, cfg.ui);
  Object.assign(introOptions, cfg.intro);
  Object.assign(aboutSectionOptions, cfg.about);
  Object.assign(scrollOverlayOptions, cfg.scrollOverlay);
  Object.assign(playerOptions, cfg.player);
  Object.assign(projectsOptions, cfg.projects);
  Object.assign(othersOptions, cfg.others);
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [config, setConfig] = useState<SiteConfig>(
    () => deepClone(DEFAULTS) as SiteConfig
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("config");

    if (p === DISCORD_ID) {
      localStorage.setItem(UNLOCK_KEY, "1");
      setIsUnlocked(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("config");
      window.history.replaceState({}, "", url.toString());
    } else if (p === "lock") {
      localStorage.removeItem(UNLOCK_KEY);
      setIsUnlocked(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("config");
      window.history.replaceState({}, "", url.toString());
    } else {
      setIsUnlocked(localStorage.getItem(UNLOCK_KEY) === "1");
    }

    const authParam = params.get("auth");
    if (authParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      window.history.replaceState({}, "", url.toString());
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SiteConfig>;
        const merged: SiteConfig = {
          video: { ...DEFAULTS.video, ...(saved.video ?? {}) },
          ui: { ...DEFAULTS.ui, ...(saved.ui ?? {}) },
          intro: { ...DEFAULTS.intro, ...(saved.intro ?? {}) },
          about: { ...DEFAULTS.about, ...(saved.about ?? {}) },
          scrollOverlay: {
            ...DEFAULTS.scrollOverlay,
            ...(saved.scrollOverlay ?? {}),
          },
          player: { ...DEFAULTS.player, ...(saved.player ?? {}) },
          projects: { ...DEFAULTS.projects, ...(saved.projects ?? {}) },
          others: { ...DEFAULTS.others, ...(saved.others ?? {}) },
        };
        setConfig(merged);
        applyConfig(merged);
        setVersion((v) => v + 1);
      }
    } catch {
      
    }
  }, []);

  const updateConfig = useCallback((newCfg: SiteConfig) => {
    const clone = deepClone(newCfg);
    setConfig(clone);
    applyConfig(newCfg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCfg));
    setVersion((v) => v + 1);
  }, []);

  const resetConfig = useCallback(() => {
    const defs = deepClone(DEFAULTS) as SiteConfig;
    setConfig(defs);
    applyConfig(defs);
    localStorage.removeItem(STORAGE_KEY);
    setVersion((v) => v + 1);
  }, []);

  return (
    <ConfigContext.Provider
      value={{ isUnlocked, version, config, discordUser, updateConfig, resetConfig }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export { DEFAULTS };
