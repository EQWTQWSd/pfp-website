
export const videoOptions = {
  brightness: 0.88,       
  contrast: 1.1,          
  saturate: 1.2,          
  hueRotate: 275,         

  blur: 0,                
  sharpen: 0,             

  overlayDarkness: 0.3,   
  overlaySide: 0.2,       

  grainOpacity: 0.05,     
};

export function buildVideoFilter(): string {
  const { brightness, contrast, saturate, blur, hueRotate, sharpen } =
    videoOptions;

  const c = contrast + sharpen * 0.25;
  const s = saturate + sharpen * 0.2;

  return [
    `brightness(${brightness})`,
    `contrast(${c})`,
    `saturate(${s})`,
    `blur(${blur}px)`,
    `hue-rotate(${hueRotate}deg)`,
  ].join(" ");
}

export function buildOverlay(): string {
  const { overlayDarkness, overlaySide } = videoOptions;
  return [
    `linear-gradient(135deg, rgba(147, 95, 205, 0.32) 0%, rgba(35, 185, 120, 0.24) 100%)`,
    `linear-gradient(180deg, rgba(20, 11, 36, 0.15) 0%, rgba(20, 11, 36, ${overlayDarkness}) 100%)`,
    `linear-gradient(90deg, rgba(20, 11, 36, ${overlaySide}) 0%, rgba(20, 11, 36, 0) 60%)`,
  ].join(", ");
}

export const uiOptions = {
  
  numberOpacity: 0.15,

  
  menuWidth: 265,

  
  labelHoverColor: "#ffffff",

  
  cosminLetterSpacing: 0.06,

  
  wobbleStrength: 1.4,

  
  wobbleXStrength: 0.45,

  
  wobbleYStrength: 1.0,

  
  wobbleSmoothness: 0.055,
};

export const introOptions = {
  
  includeIntro: true,

  
  rememberIntroSeen: false,

  
  rememberHeroSession: true,
};

export function uiStyleVars(): React.CSSProperties {
  return {
    "--num-opacity": String(uiOptions.numberOpacity),
    "--menu-width": `${uiOptions.menuWidth}px`,
    "--label-hover-color": uiOptions.labelHoverColor,
    "--cosmin-letter-spacing": `${uiOptions.cosminLetterSpacing}em`,
    "--wobble": String(uiOptions.wobbleStrength),
    "--wobble-x": String(uiOptions.wobbleXStrength),
    "--wobble-y": String(uiOptions.wobbleYStrength),
  } as React.CSSProperties;
}

export const aboutSectionOptions = {
  
  nameSizeVw: 3.6,
  
  nameSizeMin: 26,
  
  nameSizeMax: 46,
  
  nameLetterSpacing: 0.05,

  
  bioFontSize: 15,
  
  bioMaxWidth: 580,

  
  avatarSize: 76,

  
  iconSize: 24,

  
  labelRuleWidth: 28,
  
  labelOpacity: 0.3,

  
  heyImFontSize: 18,
  
  nameTopMargin: -12,
  
  profileMarginTop: 6,
  
  heyImMarginTop: 0,

  
  aboutCardTopOffset: 48,
  
  socialsCardTopOffset: 0,

  
  cardsGap: 160,
  
  rowPaddingLeft: 0,
  
  aboutCardLeftNudge: 98,
  
  socialsCardRightNudge: 52,

  
  aboutCardScale: 1.08,

  
  aboutHoverTiltY: 7,
  
  aboutHoverMouseRange: 3,
  
  socialsHoverTiltY: -7,
  
  socialsHoverMouseRange: 3,
};

export const scrollOverlayOptions = {
  fadeStops: [
    { vh: 0,    opacity: 0    },
    { vh: 0.15, opacity: 0    },
    { vh: 0.50, opacity: 0.26 },
    { vh: 0.60, opacity: 0.41 },
    { vh: 1.1,  opacity: 0.75 },
  ] as { vh: number; opacity: number }[],

  
  color: [20, 11, 36] as [number, number, number],

  
  muffle: true,
  
  
  muffleFrequency: 1600,
  
  muffleOpenFrequency: 18000,
  
  muffleQ: 0.8,
  
  muffleSmoothing: 0.4,
  
  muffleGain: 0.9,
  
  muffleCurve: 0.88,
};

export type PlayerPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export const playerOptions = {
  
  position: "bottom-right" as PlayerPosition,

  
  playerWidth: 185,

  
  discSize: 90,

  
  coverSize: 58,

  
  fullDiscCover: true,

  
  edgeOffsetX: null as number | null,

  
  edgeOffsetY: null as number | null,

  
  volume: 0.18,

  
  defaultCover: "" as string,

  
  showTitle: true,

  
  showProgress: true,
};

export const projectsOptions = {
  
  parallaxEnabled: true,

  
  parallaxStrength: 14,

  
  parallaxSmoothness: 0.055,

  
  parallaxDepth: true,
};

export const othersOptions = {
  
  buttonScale: 1.1,

  
  buttonColumns: 3,

  
  buttonOverlayFontSize: 9,
};

export function playerStyleVars(): React.CSSProperties {
  const vars: Record<string, string> = {
    "--player-width": `${playerOptions.playerWidth}px`,
    "--disc-size": `${playerOptions.discSize}px`,
    "--cover-size": `${playerOptions.coverSize}%`,
  };
  if (playerOptions.edgeOffsetX != null) {
    vars["--player-edge-x"] = `${playerOptions.edgeOffsetX}px`;
  }
  if (playerOptions.edgeOffsetY != null) {
    vars["--player-edge-y"] = `${playerOptions.edgeOffsetY}px`;
  }
  return vars as React.CSSProperties;
}
