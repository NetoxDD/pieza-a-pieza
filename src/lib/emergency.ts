import type { Access, Allergy, ChildProfile, Contact, Medication } from "@/lib/ficha";

export type EmergencySnapshot = {
  v: 1;
  savedAt: string;
  childId: string;
  childName: string;
  role: string;
  birthDate: string | null;
  bloodType: string | null;
  emergencyNumber: string | null;
  allergies: { substance: string; kind: string; reaction: string | null; severity: string }[];
  contacts: {
    name: string;
    relation: string | null;
    phone: string | null;
    address: string | null;
    kind: string;
    isEmergency: boolean;
  }[];
  meds: { name: string; dose: string | null; frequency: string | null; category: string }[] | null;
  conditions: { visible: boolean; text: string | null };
  calm?: { kind: string; body: string }[] | null;
};

const PREFIX = "pap:emergency:";
const prefKey = (uid: string) => `pap:emergencyCopy:${uid}`;
const copyKey = (uid: string, childId: string) => `${PREFIX}${uid}:${childId}`;

// Solo guarda lo mínimo para una emergencia, y solo lo que el rol ya podía ver
export function buildSnapshot(a: {
  childId: string;
  childName: string;
  role: string;
  profile: ChildProfile | null;
  allergies: Allergy[];
  contacts: Contact[];
  meds: Medication[];
  conditions: string | null;
  access: Access;
  calm?: { kind: string; body: string }[] | null;
}): EmergencySnapshot {
  return {
    v: 1,
    savedAt: new Date().toISOString(),
    childId: a.childId,
    childName: a.childName,
    role: a.role,
    birthDate: a.profile?.birth_date ?? null,
    bloodType: a.profile?.blood_type ?? null,
    emergencyNumber: a.profile?.emergency_number ?? null,
    allergies: a.allergies.map((x) => ({
      substance: x.substance,
      kind: x.kind,
      reaction: x.reaction,
      severity: x.severity,
    })),
    contacts: a.contacts
      .filter((c) => c.is_emergency || c.kind === "pediatra" || c.kind === "hospital")
      .map((c) => ({
        name: c.name,
        relation: c.relation,
        phone: c.phone,
        address: c.address,
        kind: c.kind,
        isEmergency: c.is_emergency,
      })),
    meds: a.access.medications
      ? a.meds
          .filter((m) => m.active)
          .map((m) => ({ name: m.name, dose: m.dose, frequency: m.frequency, category: m.category }))
      : null,
    conditions: { visible: a.access.conditions, text: a.access.conditions ? a.conditions : null },
    calm: a.calm ?? null,
  };
}

// Valor inicial: activado para familia y cuidadores; cada persona puede cambiarlo
export function copyEnabled(uid: string, role: string): boolean {
  try {
    const v = localStorage.getItem(prefKey(uid));
    if (v === "on") return true;
    if (v === "off") return false;
  } catch {
    /* sin almacenamiento */
  }
  return role === "familia" || role === "cuidador";
}

export function setCopyPref(uid: string, on: boolean) {
  try {
    localStorage.setItem(prefKey(uid), on ? "on" : "off");
  } catch {
    /* sin almacenamiento */
  }
}

export function saveCopy(uid: string, s: EmergencySnapshot) {
  try {
    localStorage.setItem(copyKey(uid, s.childId), JSON.stringify(s));
  } catch {
    /* sin almacenamiento */
  }
}

export function readCopy(uid: string, childId: string): EmergencySnapshot | null {
  try {
    const raw = localStorage.getItem(copyKey(uid, childId));
    return raw ? (JSON.parse(raw) as EmergencySnapshot) : null;
  } catch {
    return null;
  }
}

export function listCopies(uid: string): EmergencySnapshot[] {
  const out: EmergencySnapshot[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${PREFIX}${uid}:`)) {
        const raw = localStorage.getItem(k);
        if (raw) out.push(JSON.parse(raw) as EmergencySnapshot);
      }
    }
  } catch {
    /* sin almacenamiento */
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// Sin argumento borra las copias de todas las cuentas de este dispositivo
export function clearCopies(uid?: string) {
  try {
    const start = uid ? `${PREFIX}${uid}:` : PREFIX;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(start)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* sin almacenamiento */
  }
}