import { roleLabel } from "@/lib/roles";

export type AuditRow = {
  id: number;
  created_at: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
};

export type Category =
  | "equipo"
  | "ficha"
  | "medicinas"
  | "documentos"
  | "emergencia"
  | "privacidad"
  | "datos"
  | "otros";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "equipo", label: "Equipo" },
  { value: "ficha", label: "Ficha y salud" },
  { value: "medicinas", label: "Medicinas" },
  { value: "documentos", label: "Documentos" },
  { value: "emergencia", label: "Ficha de emergencia" },
  { value: "privacidad", label: "Privacidad" },
  { value: "datos", label: "Informes y datos" },
  { value: "otros", label: "Otros" },
];

export const categoryLabel: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

const ENTITY: Record<string, { label: string; cat: Category }> = {
  child_profile: { label: "la ficha del niño", cat: "ficha" },
  child_allergies: { label: "una alergia", cat: "ficha" },
  child_contacts: { label: "un contacto", cat: "ficha" },
  child_conditions: { label: "las otras condiciones de salud", cat: "ficha" },
  child_medications: { label: "una medicina", cat: "medicinas" },
  med_doses: { label: "un registro de dosis", cat: "medicinas" },
  documents: { label: "un documento", cat: "documentos" },
  document_folders: { label: "una carpeta de documentos", cat: "documentos" },
  materials: { label: "una publicación de material", cat: "otros" },
  routines: { label: "una rutina", cat: "otros" },
    observations: { label: "una observación", cat: "otros" },
  observation_photos: { label: "una foto de una observación", cat: "otros" },
    sleep_logs: { label: "un registro de sueño", cat: "ficha" },
  meal_logs: { label: "un registro de comida", cat: "ficha" },
};

const FIELD: Record<string, string> = {
  birth_date: "fecha de nacimiento",
  sex: "sexo",
  blood_type: "grupo sanguíneo",
  emergency_number: "número de emergencias",
  helps_text: "lo que le ayuda",
  avatar_kind: "foto o avatar",
  avatar_preset: "avatar",
  avatar_path: "foto",
  health_consent_at: "consentimiento",
  name: "nombre",
  title: "título",
  body: "texto",
  substance: "sustancia",
  kind: "tipo",
  reaction: "reacción",
  severity: "gravedad",
  relation: "parentesco",
  phone: "teléfono",
  address: "dirección",
  notes: "notas",
  is_emergency: "contacto de emergencia",
  dose: "dosis",
  frequency: "frecuencia",
  category: "categoría",
  prescriber: "quién receta",
  started_on: "fecha de inicio",
  ends_on: "fecha de fin",
  active: "estado (activo o suspendido)",
  as_needed: "tipo de horario",
  times: "horas",
  days: "días",
  grace_min: "margen de tolerancia",
  min_interval_hours: "espera mínima entre dosis",
  document_id: "receta vinculada",
  stock_enabled: "inventario",
  units_per_dose: "unidades por dosis",
  units_per_box: "unidades por caja",
  refill_alert_days: "días de aviso",
  document_date: "fecha del documento",
  valid_until: "vigencia",
  folder_id: "carpeta",
  description: "descripción",
  audience: "audiencia",
  pinned: "fijada en Inicio",
  url: "enlace",
  steps: "pasos",
  duration_min: "duración",
  goal_id: "objetivo relacionado",
  place: "lugar",
  position: "orden",
  voided_at: "anulación",
  void_reason: "motivo de anulación",
  voided_by: "quién anuló",
  postponed_until: "hora de posposición",
    tags: "etiquetas",
  edited_at: "fecha de edición",
  include_in_report: "marca para el informe",
    sleep_minutes: "duración del sueño",
  wakeups: "despertares",
  quality: "cómo fue la noche",
  amount: "cuánto comió",
  note: "nota",
};

const SECTION: Record<string, string> = {
  medications: "Medicamentos",
  conditions: "Otras condiciones",
  contacts: "Otros contactos y lugares",
  wellbeing: "Sueño y comidas",
};

const s = (v: unknown) => (typeof v === "string" ? v : "");
const rl = (v: unknown) => roleLabel[s(v)] ?? s(v);
const yesNo = (v: unknown) => (v ? "sí" : "no");

export function describe(
  r: AuditRow,
  nameOf: (id: string | null) => string
): { text: string; cat: Category } {
  const d = (r.detail ?? {}) as Record<string, unknown>;
  const who = nameOf(r.actor_id);
  const ent = ENTITY[r.entity];
  const cat = ent?.cat ?? "otros";
  const label = ent?.label ?? "un registro";

  switch (r.action) {
    case "miembro_añadido":
      return { cat: "equipo", text: `${nameOf(r.entity_id)} entró al equipo como ${rl(d.rol)}` };
    case "rol_cambiado":
      return {
        cat: "equipo",
        text: `${who} cambió el rol de ${nameOf(r.entity_id)}: de ${rl(d.de)} a ${rl(d.a)}`,
      };
    case "miembro_quitado":
      return {
        cat: "equipo",
        text:
          r.actor_id && r.actor_id === r.entity_id
            ? `${nameOf(r.entity_id)} salió del equipo`
            : `${who} quitó del equipo a ${nameOf(r.entity_id)}`,
      };
    case "invitación_creada":
      return { cat: "equipo", text: `${who} creó una invitación para el rol ${rl(d.rol)}` };
    case "invitación_usada":
      return { cat: "equipo", text: `Se usó una invitación para el rol ${rl(d.rol)}` };
    case "invitación_revocada":
      return { cat: "equipo", text: `${who} revocó una invitación para el rol ${rl(d.rol)}` };

    case "consentimiento_salud":
      return { cat: "ficha", text: `${who} confirmó el consentimiento para guardar datos de salud` };

    case "documento_abierto":
      return { cat: "documentos", text: `${who} abrió un documento` };

    case "ficha_emergencia_vista":
      return { cat: "emergencia", text: `${who} abrió la ficha de emergencia` };
    case "ficha_emergencia_impresa":
      return { cat: "emergencia", text: `${who} imprimió la ficha de emergencia` };

    case "visibilidad_cambiada":
      if (r.entity === "document_folder_access") {
        return {
          cat: "privacidad",
          text: `${who} cambió los permisos de una carpeta para el rol ${rl(d.rol)} (ver: ${yesNo(d.ver)}, subir: ${yesNo(d.subir)})`,
        };
      }
      return {
        cat: "privacidad",
        text: `${who} cambió quién ve «${SECTION[s(d.seccion)] ?? s(d.seccion)}» para el rol ${rl(d.rol)}: ${
          d.permitido ? "ahora puede verlo" : "ya no puede verlo"
        }`,
      };
    case "visibilidad_restablecida":
      return {
        cat: "privacidad",
        text: `${who} restableció los permisos del rol ${rl(d.rol)} a sus valores iniciales`,
      };

    case "permiso_dosis_concedido":
      return { cat: "medicinas", text: `${who} permitió al rol ${rl(d.rol)} registrar dosis de una medicina` };
    case "permiso_dosis_retirado":
      return { cat: "medicinas", text: `${who} retiró al rol ${rl(d.rol)} el permiso de registrar dosis de una medicina` };

    case "informe_generado":
      return { cat: "datos", text: `${who} preparó un informe de ${s(d.dias) || String(d.dias ?? "")} días` };
    case "informe_impreso":
      return { cat: "datos", text: `${who} imprimió un informe` };
    case "exportacion_datos":
      return {
        cat: "datos",
        text: `${who} exportó ${d.tipo === "espacio" ? "los datos del espacio" : "sus datos personales"}`,
      };
    case "historial_depurado":
      return { cat: "datos", text: `${who} borró ${String(d.borrados ?? 0)} registros antiguos del historial` };
          case "propiedad_transferida":
      return {
        cat: "equipo",
        text: `${who} transfirió la propiedad del espacio a ${nameOf(r.entity_id)}`,
      };

    case "registro_añadido":
      if (r.entity === "med_doses") return { cat: "medicinas", text: `${who} registró una dosis` };
      return { cat, text: `${who} añadió ${label}` };
    case "registro_modificado": {
      const campos = Array.isArray(d.campos) ? (d.campos as string[]) : [];
      if (r.entity === "med_doses" && campos.includes("voided_at")) {
        return { cat: "medicinas", text: `${who} anuló un registro de dosis` };
      }
      const what = campos.length ? ` (cambió: ${campos.map((f) => FIELD[f] ?? f).join(", ")})` : "";
      return { cat, text: `${who} modificó ${label}${what}` };
    }
    case "registro_eliminado":
      return { cat, text: `${who} eliminó ${label}` };

    default:
      return { cat: "otros", text: `${who}: ${r.action.replace(/_/g, " ")}` };
  }
}