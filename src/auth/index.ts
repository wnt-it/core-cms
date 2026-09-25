// Login, Passwort vergessen, Passwort ändern, Logout.
//
// LoginPage/ForgotPasswordPage/UpdatePasswordPage sind jetzt zentral in core-cms
// und automatisch gebrandet: AuthCardShell holt Logo + Site-Name aus derselben
// site_settings-Tabelle, die auch das Admin-Settings-Formular pflegt (siehe
// branding.ts). Farben/Schrift kommen über die Tailwind-Tokens bg-primary/
// text-primary/font-display/font-sans, die jedes Kundenprojekt selbst in seiner
// index.css definiert - core-cms kennt die konkreten Werte nicht, nur die Klassennamen.

export * from "./login-actions";
export * from "./logout-actions";
export { GET as authCallbackGET } from "./callback-route";
export { getAuthBranding } from "./branding";
export type { AuthBranding } from "./branding";
export { default as AuthCardShell } from "./AuthCardShell";
export { default as LoginPage } from "./LoginPage";
export type { LoginPageProps } from "./LoginPage";
export { default as ForgotPasswordPage } from "./ForgotPasswordPage";
export { default as UpdatePasswordPage } from "./UpdatePasswordPage";
export { default as AccountPage } from "./AccountPage";
export { default as AccountForm } from "./AccountForm";
export type { AccountFormProps } from "./AccountForm";
