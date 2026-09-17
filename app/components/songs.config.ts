export interface Song {
  name: string;
  src: string;
  cover?: string;
}

export const songs: Song[] = [
  {
    name: "スパークル [original ver.] - Your name.",
    src: "/sfx/sparkle.mp3",
    cover: "/images/moon_clouds_new.jpg",
  },
  {
    name: "青のすみか / キタニタツヤ",
    src: "/sfx/ao-no-sumika.mp3",
    cover: "/images/moon_clouds_new.jpg",
  },
  {
    name: "DAOKO × 米津玄師『打上花火』",
    src: "/sfx/uchiage-hanabi.mp3",
    cover: "/images/moon_clouds_new.jpg",
  },
  {
    name: "IN MY HEAD!",
    src: "/sfx/IN MY HEAD!.mp3",
    cover: "/images/moon_clouds_new.jpg",
  },
];

export function normalizeSrc(src: string): string {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;

  let s = src.trim();

  const rootMatch = s.match(/[\\\/]website[\\\/](.*)$/i);
  if (rootMatch) s = rootMatch[1];

  s = s.replace(/\\/g, "/");

  if (!s.startsWith("/")) s = "/" + s;

  s = s.replace(/^\/public\//, "/");

  return s;
}
