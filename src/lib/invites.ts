import { BASE } from "@/lib/base";

const KEY = "pap:pendingInvite";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const CODE_RE = /^[A-Za-z0-9]{6,20}$/;

// El código va en el fragmento (#), que el navegador no envía al servidor
export function inviteLink(code: string) {
  return `${window.location.origin}${BASE}/unirse/#${encodeURIComponent(code)}`;
}

export function inviteMessage(childFirstName: string, roleName: string, link: string) {
  return `Te invito a unirte al espacio de ${childFirstName} en Pieza a pieza como ${roleName.toLowerCase()}. Abre este enlace: ${link}\nSirve una sola vez y vence en 7 días.`;
}

// La invitación pendiente se guarda para que sobreviva al inicio de sesión o al registro
export function savePending(code: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: code.toUpperCase(), at: Date.now() }));
  } catch {
    /* sin almacenamiento */
  }
}

export function readPending(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { code?: string; at?: number };
    if (!p.code || !p.at || Date.now() - p.at > MAX_AGE || !CODE_RE.test(p.code)) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p.code;
  } catch {
    return null;
  }
}

export function clearPending() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
}

export const ROLE_BLURB: Record<string, string> = {
  familia: "Podrás ver todo y decidir los permisos del equipo.",
  cuidador: "Podrás acompañar el día a día. La familia decide qué más ves.",
  pediatra: "Podrás consultar el seguimiento que la familia comparta con tu rol.",
  terapeuta: "Podrás consultar y aportar al seguimiento. La familia decide qué más ves.",
  logopeda: "Podrás consultar y aportar al seguimiento. La familia decide qué más ves.",
  tutor: "Podrás acompañar y escribir en el cuaderno escuela–casa. La familia decide qué más ves.",
};