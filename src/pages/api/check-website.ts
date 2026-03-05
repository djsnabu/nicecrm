/**
 * DNS-tarkistus endpoint.
 * Tarkistaa onko yrityksellä nettisivut koittamalla resolve:ta {slug}.fi
 *
 * POST /api/check-website
 * Body: { names: string[] }   — yritysnimet
 * Response: { results: Record<string, string | null> }
 *   key = alkuperäinen nimi, value = löydetty domain tai null
 */
import type { APIRoute } from 'astro';
import { promises as dns } from 'node:dns';

/** Muunna yritysnimi domainiksi: "Kala Oy" → "kala" */
function nameToDomainSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*(oy|oyj|ab|ky|tmi|osk|ry)\s*$/i, '')
    .trim()
    .replace(/[^a-zäöå0-9]/g, '')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/å/g, 'a');
}

async function checkDomain(domain: string): Promise<boolean> {
  try {
    const results = await dns.resolve4(domain);
    return results.length > 0;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const names: string[] = body.names ?? [];

    if (!Array.isArray(names) || names.length === 0) {
      return new Response(JSON.stringify({ results: {} }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rajoita max 50 nimeä kerrallaan
    const batch = names.slice(0, 50);

    const results: Record<string, string | null> = {};

    await Promise.all(
      batch.map(async (name) => {
        const slug = nameToDomainSlug(name);
        if (!slug) {
          results[name] = null;
          return;
        }
        const domain = `${slug}.fi`;
        const found = await checkDomain(domain);
        results[name] = found ? domain : null;
      }),
    );

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Virhe tarkistuksessa' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
