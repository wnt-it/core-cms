// @vitest-environment jsdom
// Anzeige „Mail-Versand“: Ergebnis der Verbindungsprüfung, erneutes Prüfen.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { classifySmtpError, okResult } from "../../src/email/smtp-check-types";

const check = vi.fn();
vi.mock("../../src/admin/settings-actions", () => ({ checkSmtpConnection: (o: unknown) => check(o) }));

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
    render(<SmtpStatus />);
    await screen.findByText("Mail-Versand gestört");
    expect(screen.getByText(/gilt nicht für „mail.kunde.de“/)).toBeTruthy();
    expect(screen.getByText(/Es gilt für: smtp.ionos.de/)).toBeTruthy();
  });

  it("prüft nach dem Speichern sofort neu", async () => {
    check.mockResolvedValue(okResult({ host: "smtp.x.de", port: 465 }));
    const { rerender } = render(<SmtpStatus refreshKey={0} />);
    await screen.findByText("Mail-Versand funktioniert");
    rerender(<SmtpStatus refreshKey={1} />);
    await waitFor(() => expect(check).toHaveBeenLastCalledWith({ fresh: true }));
  });
});
