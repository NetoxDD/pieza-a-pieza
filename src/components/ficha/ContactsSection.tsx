"use client";

import { useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { contactKindLabel, mapsUrl, type Contact } from "@/lib/ficha";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const empty = {
  kind: "familiar",
  name: "",
  relation: "",
  phone: "",
  address: "",
  notes: "",
  is_emergency: false,
};

export default function ContactsSection() {
  const { child } = useChild();
  const { contacts, editable, reload } = useChildProfile();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const sorted = contacts
    .slice()
    .sort((a, b) => Number(b.is_emergency) - Number(a.is_emergency) || a.kind.localeCompare(b.kind));

  const startNew = () => {
    setForm(empty);
    setEditingId(null);
    setMsg("");
    setOpen(true);
  };

  const startEdit = (c: Contact) => {
    setForm({
      kind: c.kind,
      name: c.name,
      relation: c.relation ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
      is_emergency: c.is_emergency,
    });
    setEditingId(c.id);
    setMsg("");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    setBusy(true);
    setMsg("");
    const row = {
      kind: form.kind,
      name,
      relation: form.relation.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      is_emergency: form.is_emergency,
    };
    let failed = false;
    if (editingId) {
      const { data, error } = await supabase
        .from("child_contacts")
        .update(row)
        .eq("id", editingId)
        .select("id");
      failed = !!error || !data?.length;
    } else {
      const { error } = await supabase.from("child_contacts").insert({ child_id: child.id, ...row });
      failed = !!error;
    }
    setBusy(false);
    if (failed) {
      setMsg("No se pudo guardar. Revisa tus permisos e intenta de nuevo.");
      return;
    }
    setOpen(false);
    reload();
  };

  const remove = async (c: Contact) => {
    if (!window.confirm(`¿Eliminar a ${c.name}?`)) return;
    const { data, error } = await supabase
      .from("child_contacts")
      .delete()
      .eq("id", c.id)
      .select("id");
    if (error || !data?.length) setMsg("No se pudo eliminar.");
    else reload();
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Contactos y lugares</h2>
        {editable && !open && (
          <button
            type="button"
            onClick={startNew}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            + Añadir
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          Aún no hay contactos. Aquí van familiares, el pediatra, el hospital y la escuela.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {sorted.map((c) => (
            <li key={c.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="[overflow-wrap:anywhere]">{c.name}</strong>
                    {c.relation && <span className="text-sm text-[var(--muted)]">({c.relation})</span>}
                    {c.is_emergency && (
                      <span className="rounded-md bg-[var(--danger)] px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--surface)]">
                        Emergencia
                      </span>
                    )}
                  </div>
                  <small className="text-xs text-[var(--muted)]">{contactKindLabel[c.kind]}</small>
                  {c.notes && (
                    <p className="mt-1 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{c.notes}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                      >
                        <Phone size={16} aria-hidden />
                        {c.phone}
                      </a>
                    )}
                    {c.address && (
                      <a
                        href={mapsUrl(c.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                      >
                        <MapPin size={16} aria-hidden />
                        Ver en el mapa
                      </a>
                    )}
                  </div>
                  {c.address && (
                    <p className="mt-1 text-xs text-[var(--muted)] [overflow-wrap:anywhere]">{c.address}</p>
                  )}
                </div>
                {editable && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      aria-label={`Editar a ${c.name}`}
                      className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      aria-label={`Eliminar a ${c.name}`}
                      className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <h3 className="text-sm font-semibold">{editingId ? "Editar contacto" : "Nuevo contacto"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold">
              Tipo
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={input}>
                {Object.entries(contactKindLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Parentesco o función (opcional)
              <input
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                maxLength={40}
                placeholder="Ej. Abuela, Pediatra"
                className={input}
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-xs font-semibold">
            Nombre
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={80}
              required
              className={input}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Teléfono (opcional)
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={30}
              className={input}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Dirección (opcional)
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              maxLength={200}
              className={input}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Notas (opcional)
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={200}
              placeholder="Ej. Horario de atención"
              className={input}
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.is_emergency}
              onChange={(e) => setForm({ ...form, is_emergency: e.target.checked })}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
            />
            <span>
              Es un contacto de emergencia
              <small className="block text-xs text-[var(--muted)]">
                Saldrá primero en la lista y en la ficha de emergencia.
              </small>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !form.name.trim()}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {msg && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </section>
  );
}