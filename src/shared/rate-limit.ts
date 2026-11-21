// Einfache Begrenzung je Absender (z. B. IP-Adresse) im Arbeitsspeicher der Server-Instanz.
// Nur eine zusätzliche Bremse: Auf Vercel laufen mehrere Instanzen, die Hauptsperre ist die Vercel-Firewall.
// Die Adressen werden nirgends gespeichert und verfallen nach dem Zeitfenster.

export function createRateLimiter({ windowMs, max, maxKeys = 1000 }: { windowMs: number; max: number; maxKeys?: number }) {
  const hits = new Map<string, number[]>();
  return {
    /** Zählt einen Versuch; true, wenn es mehr als `max` im Zeitfenster waren. */
    hit(key: string, now = Date.now()): boolean {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > maxKeys) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
      return recent.length > max;
    },
    reset() {
      hits.clear();
    },
  };
}

/** Absender-Adresse aus den Headern einer Anfrage (erste Adresse von x-forwarded-for). */
export function ipFromHeaders(headers: Headers): string {
  return (headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? "unbekannt").split(",")[0].trim() || "unbekannt";
}
