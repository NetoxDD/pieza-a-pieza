import TeamPanel from "@/components/TeamPanel";

export default function Equipo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Equipo</h1>
        <p className="mt-1 text-[var(--muted)]">
          Quiénes acompañan el seguimiento, con qué rol, y cómo invitar a alguien más.
        </p>
      </div>
      <TeamPanel />
    </div>
  );
}