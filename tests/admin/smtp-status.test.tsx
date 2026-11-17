// @vitest-environment jsdom
// Anzeige „Mail-Versand“: Ergebnis der Verbindungsprüfung, erneutes Prüfen.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { classifySmtpError, okResult } from "../../src/email/smtp-check-types";

const check = vi.fn();
vi.mock("../../src/admin/settings-actions", () => ({ checkSmtpConnection: (o: unknown) => check(o) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

import { SmtpStatus } from "../../src/admin/SmtpStatus";

afterEach(() => {
  cleanup();
  check.mockReset();
});

describe("SmtpStatus", () => {
  it("zeigt Erfolg mit drei Schritten und prüft auf Knopfdruck frisch", async () => {
    check.mockResolvedValue({ ...okResult({ host: "smtp.x.de", port: 465 }), cached: true });
    render(<SmtpStatus />);
    await screen.findByText("Mail-Versand funktioniert");
    expect(check).toHaveBeenCalledWith({ fresh: false });
    expect(screen.getByText("Server erreichbar")).toBeTruthy();
    expect(screen.getByText(/Zuletzt geprüft/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Erneut prüfen" }));
    await waitFor(() => expect(check).toHaveBeenLastCalledWith({ fresh: true }));
  });

  it("zeigt Zertifikatsproblem mit Hinweis auf den richtigen Servernamen", async () => {
    check.mockResolvedValue(classifySmtpError(Object.assign(new Error("does not match certificate's altnames: DNS:smtp.ionos.de"), { code: "ETLS" }), { host: "mail.kunde.de", port: 587 }));
    render(<SmtpStatus variant="card" />);
    await screen.findByText("Mail-Versand gestört");
    expect(screen.getByText(/gilt nicht für „mail.kunde.de“/)).toBeTruthy();
    expect(screen.getByText(/Es gilt für: smtp.ionos.de/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "E-Mail-Einstellungen" }).getAttribute("href")).toBe("/admin/einstellungen?bereich=smtp");
  });

  it("Dashboard-Karte zeigt bei Erfolg keine Schritte", async () => {
    check.mockResolvedValue(okResult({ host: "smtp.x.de", port: 465 }));
    render(<SmtpStatus variant="card" />);
    await screen.findByText("Mail-Versand funktioniert");
    expect(screen.queryByText("Server erreichbar")).toBeNull();
  });
});
