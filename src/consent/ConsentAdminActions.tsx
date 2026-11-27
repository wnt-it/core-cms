"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/components";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { cleanupConsent, exportConsentCsv } from "./admin-actions";

/** Export (CSV) und Aufräumen nach Ablauf der Aufbewahrungsfrist. */
export default function ConsentAdminActions() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function exportCsv() {
    start(async () => {
      const res = await exportConsentCsv();
      if (!res.ok) return void toast.error(res.error);
      const url = URL.createObjectURL(new Blob([res.csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `einwilligungen-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });
  }

  function cleanup() {
    start(async () => {
      const res = await cleanupConsent(3);
      setConfirm(false);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.removed === 0 ? "Nichts zu löschen: Alle Einträge sind noch innerhalb der Frist." : `${res.removed} abgelaufene Einträge gelöscht.`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportCsv} disabled={pending}>
          <Download size={15} aria-hidden="true" /> Als CSV exportieren
        </Button>
        <Button onClick={() => setConfirm(true)} disabled={pending}>
          <Trash2 size={15} aria-hidden="true" /> Abgelaufene Einträge löschen
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Abgelaufene Einträge löschen?"
        confirmLabel="Löschen"
        pending={pending}
        onConfirm={cleanup}
        onCancel={() => setConfirm(false)}
      >
        Gelöscht werden Einträge, die älter sind als das laufende Jahr plus 3 Jahre. Das lässt sich nicht rückgängig machen.
      </ConfirmDialog>
    </>
  );
}
