"use client";
import { useEffect, useState } from "react";

export interface LanyardUser {
  id: string;
  username: string;
  avatar: string | null;
  global_name: string | null;
}

export type DiscordStatus = "online" | "idle" | "dnd" | "offline";

export interface LanyardData {
  discord_user: LanyardUser;
  discord_status: DiscordStatus;
}

const DISCORD_ID =
  process.env.NEXT_PUBLIC_DISCORD_ID ?? "1135288643070738464";

export function useLanyard(): LanyardData | null {
  const [data, setData] = useState<LanyardData | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let heartbeatId: ReturnType<typeof setInterval> | null = null;
    let reconnectId: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    function connect() {
      ws = new WebSocket("wss://api.lanyard.rest/socket");

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as {
          op: number;
          d: unknown;
          t?: string;
        };

        if (msg.op === 1) {
          const interval = (msg.d as { heartbeat_interval: number })
            .heartbeat_interval;
          heartbeatId = setInterval(() => {
            ws?.send(JSON.stringify({ op: 3 }));
          }, interval);
          ws?.send(
            JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } })
          );
        }

        if (
          msg.op === 0 &&
          (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE")
        ) {
          const payload = msg.d as LanyardData;
          if (payload?.discord_user) {
            setData(payload);
          }
        }
      };

      ws.onclose = () => {
        if (heartbeatId) clearInterval(heartbeatId);
        if (alive) reconnectId = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      alive = false;
      if (heartbeatId) clearInterval(heartbeatId);
      if (reconnectId) clearTimeout(reconnectId);
      ws?.close();
    };
  }, []);

  return data;
}

export function getAvatarUrl(user: LanyardUser | undefined | null): string {
  if (!user) {
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) % 5n)}.png`;
}

export const STATUS_COLOR: Record<DiscordStatus, string> = {
  online: "#23a55a",
  idle:   "#f0b232",
  dnd:    "#f23f43",
  offline: "#80848e",
};

export const STATUS_LABEL: Record<DiscordStatus, string> = {
  online:  "online on discord",
  idle:    "idle on discord",
  dnd:     "do not disturb on discord",
  offline: "offline on discord",
};
