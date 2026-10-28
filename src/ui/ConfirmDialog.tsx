"use client";

// Bestätigungsdialog, z. B. vor dem Löschen. Fokus startet auf „Abbrechen“,
// Escape und Klick daneben schließen.

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./components";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Löschen",
  cancelLabel = "Abbrechen",
  danger = true,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Aktuelles onCancel merken, damit Fokus und Listener nur beim Öffnen neu gesetzt werden
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  // Eigene Ebene am Seitenende: übernimmt keine Ausrichtung/Schrift aus Tabellen o. Ä.;
  // Klicks werden gestoppt, damit z. B. eine klickbare Tabellenzeile nicht mitreagiert.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,23,42,.4)] p-4 text-left font-[family-name:var(--font-admin,ui-sans-serif,system-ui,sans-serif)] text-[14px] font-normal normal-case leading-normal tracking-normal whitespace-normal text-[#0F172A] antialiased [&_:where(h1,h2,h3,h4,h5,h6)]:[font-family:inherit]!"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-[420px] rounded-xl bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-[16px] font-semibold text-[#0F172A]">
          {title}
        </h2>
        {children && <div className="mt-2 text-[14px] leading-relaxed text-[#475569]">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelRef} variant="ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger-solid" : "primary"} onClick={onConfirm} disabled={pending}>
            {pending ? "Bitte warten …" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
