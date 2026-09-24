// Login, Passwort vergessen, Passwort ändern, Logout.
// Übernommen aus template (bereits funktionierender Code, keine Neuentwicklung).
//
// Hinweis zu richardprinz: login-actions.ts/callback-route.ts wurden dort NICHT
// per Re-Export ersetzt (divergente Fehlerbehandlung), LoginPage/ForgotPasswordPage/
// UpdatePasswordPage wurden dort NICHT ersetzt (eigenes Branding/Layout).
// Siehe Abschlussbericht für Details.

export * from "./login-actions";
export * from "./logout-actions";
export { GET as authCallbackGET } from "./callback-route";
export { default as LoginPage } from "./LoginPage";
export type { LoginPageProps } from "./LoginPage";
export { default as ForgotPasswordPage } from "./ForgotPasswordPage";
export { default as UpdatePasswordPage } from "./UpdatePasswordPage";
