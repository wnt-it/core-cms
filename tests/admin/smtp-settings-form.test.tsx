// @vitest-environment jsdom
// E-Mail-Einstellungen: Versandart Microsoft 365 im Formular.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EMPTY_SMTP_VALUES } from "../../src/email/smtp-settings";

const save = vi.fn();
const get = vi.fn();
vi.mock("../../src/admin/settings-actions", () => ({
  saveSmtpSettings: (f: FormData) => save(f),
  getSmtpSettings: () => get(),
  sendTestEmail: vi.fn(),
  checkSmtpConnection: vi.fn(async () => ({ ok: true, checkedAt: new Date().toISOString(), steps: { server: "ok", encryption: "ok", login: "ok" }, message: "ok" })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SmtpSettingsForm from "../../src/admin/SmtpSettingsForm";

const settings = {
  ...EMPTY_SMTP_VALUES,
  recipient: "info@kunde.de",
  transport: "microsoft365" as const,
  msTenantId: "kunde.onmicrosoft.com",
  msClientId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  msSender: "anfragen@kunde.de",
  msSecretStatus: "saved" as const,
  msSecretExpiresAt: "2099-01-01",
  missing: [],
  forms: { types: [], recipients: {}, available: true },
};

afterEach(() => {
  cleanup();
  save.mockReset();
  get.mockReset();
});

describe("SmtpSettingsForm mit Microsoft 365", () => {
  it("zeigt Microsoft-Felder, Secret leer, und speichert Versandart und Angaben", async () => {
    save.mockResolvedValue({ success: true });
    get.mockResolvedValue(settings);
    render(<SmtpSettingsForm initialSettings={settings} />);
    fireEvent.click(screen.getByRole("button", { name: /Versand-Einstellungen/ }));
    expect((screen.getByPlaceholderText("•••••••• (gespeichert)") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("SMTP Host / Server-Adresse")).toBeNull();
    expect(screen.getByRole("button", { name: "Microsoft 365", pressed: true })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("•••••••• (gespeichert)"), { target: { value: "neues~secret" } });
    fireEvent.click(screen.getByRole("button", { name: /E-Mail-Einstellungen speichern/ }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const fd = save.mock.calls[0][0] as FormData;
    expect(fd.get("mail_transport")).toBe("microsoft365");
    expect(fd.get("ms_tenant_id")).toBe("kunde.onmicrosoft.com");
    expect(fd.get("ms_client_secret")).toBe("neues~secret");
    expect(fd.get("ms_sender")).toBe("anfragen@kunde.de");
    expect(fd.get("ms_secret_expires_at")).toBe("2099-01-01");
  });

  it("warnt eingeklappt vor einem abgelaufenen Secret", () => {
    render(<SmtpSettingsForm initialSettings={{ ...settings, msSecretExpiresAt: "2020-01-01" }} />);
    expect(screen.getByText(/seit 01\.01\.2020 abgelaufen/)).toBeTruthy();
  });

  it("ohne Datenbank-Aktualisierung keine Auswahl, kein Microsoft-Feld im Speichern", async () => {
    save.mockResolvedValue({ success: true });
    get.mockResolvedValue({ ...settings, transport: "smtp", msAvailable: false });
    render(<SmtpSettingsForm initialSettings={{ ...settings, transport: "smtp", msAvailable: false, host: "smtp.x.de", user: "u", passStatus: "saved" }} />);
    fireEvent.click(screen.getByRole("button", { name: /Versand-Einstellungen/ }));
    expect(screen.getByText(/braucht noch die Datenbank-Aktualisierung für core-cms v0.19.0/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /E-Mail-Einstellungen speichern/ }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect((save.mock.calls[0][0] as FormData).get("mail_transport")).toBeNull();
  });
});
