export * from "./types";
export * from "./browser-singleton";
// server.ts und client.ts exportieren beide eine Funktion `createClient` (bewusst,
// damit Call-Sites wie im Original per direktem relativen Import `createClient` nutzen
// können). Über den Barrel-Export hier daher umbenannt, um Namenskollisionen zu vermeiden.
export { createClient as createServerSupabaseClient } from "./server";
export { createClient as createBrowserSupabaseClient } from "./client";
export * from "./middleware";
export * from "./encryption";
