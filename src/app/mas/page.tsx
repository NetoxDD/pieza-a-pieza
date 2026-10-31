import Link from "next/link";
import { ChevronRight, FileText, Settings, Users,User } from "lucide-react";

const items = [
  { href: "/documentos", icon: FileText, title: "Documentos", text: "Archivos y recursos compartidos." },
  { href: "/equipo", icon: Users, title: "Equipo", text: "Quién acompaña, sus roles e invitaciones." },
    { href: "/perfil", icon: User, title: "Mi perfil", text: "Tu foto o avatar y tus datos de contacto." },
    { href: "/ajustes", icon: Settings, title: "Ajustes", text: "Tamaño de letra, contraste, tema y modo calma." },
];

export default function Mas() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Más</h1>
        <p className="mt-1 text-[var(--muted)]">Todo lo demás, a un toque.</p>
      </div>

      <ul className="grid gap-3">
        {items.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-16 items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:bg-[var(--sage)]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-[var(--primary)]">
                <Icon size={20} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block">{title}</strong>
                <small className="text-xs text-[var(--muted)]">{text}</small>
              </span>
              <ChevronRight size={18} aria-hidden className="text-[var(--muted)]" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Proyecto escolar con datos de ejemplo. No uses información real de menores.
      </div>
    </div>
  );
}