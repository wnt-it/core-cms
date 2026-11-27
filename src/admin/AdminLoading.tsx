// Ladeansicht für den Admin-Bereich (Next.js loading.tsx): ruhige Platzhalter statt einer leeren Fläche,
// während eine Seite auf dem Server lädt. Im Projekt einbinden:
//   app/admin/(dashboard)/loading.tsx:  export { default } from "core-cms/src/admin/AdminLoading";

export default function AdminLoading() {
  return (
    <div role="status" aria-label="Seite wird geladen" className="flex flex-col gap-5">
      <div className="h-7 w-56 animate-pulse rounded-md bg-[#F1F5F9] motion-reduce:animate-none" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#F1F5F9] motion-reduce:animate-none" />
      <div className="h-48 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#FAFAFC] motion-reduce:animate-none" />
      <span className="sr-only">Seite wird geladen …</span>
    </div>
  )
}
