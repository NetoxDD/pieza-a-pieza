import type { ReactNode } from "react";
import type { PublicProfile } from "@/lib/profile";
import { initials } from "@/lib/childColor";

export type Preset = {
  id: string;
  label: string;
  bg: string;
  fg: string;
  art: (fg: string, bg: string) => ReactNode;
};

export const PRESETS: Preset[] = [
  {
    id: "pieza", label: "Pieza", bg: "#e7f0e6", fg: "#426f5d",
    art: (fg) => (
      <g fill={fg}>
        <rect x="24" y="32" width="52" height="50" rx="6" />
        <circle cx="50" cy="28" r="11" />
        <circle cx="80" cy="57" r="11" />
      </g>
    ),
  },
  {
    id: "corazon", label: "Corazón", bg: "#f6e4e4", fg: "#b86a6a",
    art: (fg) => (
      <path fill={fg} d="M50 84 C20 62 10 44 10 31 C10 19 19 12 30 12 C39 12 46 17 50 24 C54 17 61 12 70 12 C81 12 90 19 90 31 C90 44 80 62 50 84 Z" />
    ),
  },
  {
    id: "estrella", label: "Estrella", bg: "#f4e8c4", fg: "#b8923a",
    art: (fg) => (
      <polygon fill={fg} points="50,12 61,38 90,41 68,60 75,88 50,73 25,88 32,60 10,41 39,38" />
    ),
  },
  {
    id: "sol", label: "Sol", bg: "#f4e8c4", fg: "#c9a55c",
    art: (fg) => (
      <g>
        <circle cx="50" cy="50" r="18" fill={fg} />
        <g stroke={fg} strokeWidth="6" strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={a}
                x1={50 + 28 * Math.cos(rad)}
                y1={50 + 28 * Math.sin(rad)}
                x2={50 + 38 * Math.cos(rad)}
                y2={50 + 38 * Math.sin(rad)}
              />
            );
          })}
        </g>
      </g>
    ),
  },
  {
    id: "luna", label: "Luna", bg: "#ece6f3", fg: "#6a5a86",
    art: (fg, bg) => (
      <g>
        <circle cx="46" cy="52" r="30" fill={fg} />
        <circle cx="60" cy="44" r="26" fill={bg} />
      </g>
    ),
  },
  {
    id: "hoja", label: "Hoja", bg: "#e7f0e6", fg: "#5d8a73",
    art: (fg, bg) => (
      <g>
        <path fill={fg} d="M20 80 C20 40 45 15 82 18 C85 55 60 82 20 80 Z" />
        <path d="M24 77 L66 36" stroke={bg} strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    ),
  },
  {
    id: "nube", label: "Nube", bg: "#e8f1f5", fg: "#6f93aa",
    art: (fg) => (
      <g fill={fg}>
        <circle cx="34" cy="58" r="16" />
        <circle cx="52" cy="46" r="20" />
        <circle cx="68" cy="58" r="15" />
        <rect x="34" y="58" width="34" height="16" />
      </g>
    ),
  },
  {
    id: "flor", label: "Flor", bg: "#f6e4e4", fg: "#c98a8a",
    art: (fg) => (
      <g>
        <g fill={fg}>
          {[[50, 27], [72, 43], [63, 69], [37, 69], [28, 43]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="14" />
          ))}
        </g>
        <circle cx="50" cy="52" r="11" fill="#f4e8c4" />
      </g>
    ),
  },
];

const rem = (px: number) => `${px / 16}rem`; // crece con el tamaño de letra

export function PresetArt({ preset, size = 40 }: { preset: Preset; size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      style={{ width: rem(size), height: rem(size) }}
      className="shrink-0 overflow-hidden rounded-full"
    >
      <rect width="100" height="100" fill={preset.bg} />
      {preset.art(preset.fg, preset.bg)}
    </svg>
  );
}

export default function Avatar({
  profile,
  name,
  size = 40,
}: {
  profile?: PublicProfile;
  name: string;
  size?: number;
}) {
  const box = { width: rem(size), height: rem(size) };

  if (profile?.avatarKind === "photo" && profile.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarUrl}
        alt=""
        style={box}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  const preset = PRESETS.find((p) => p.id === profile?.avatarPreset);
  if (profile && preset) return <PresetArt preset={preset} size={size} />;

  return (
    <span
      aria-hidden
      style={box}
      className="grid shrink-0 place-items-center rounded-full bg-[var(--sage)] text-xs font-bold text-[var(--primary)]"
    >
      {initials(name)}
    </span>
  );
}