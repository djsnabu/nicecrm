# NiceCRM

Modern CRM frontend for solopreneurs. Astro + React + Tailwind, backend: PocketBase.

## Setup

1. Copy environment file and set your PocketBase URL:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `PUBLIC_POCKETBASE_URL` to PocketBase’s root URL. Use **http://** (not https) unless you’ve configured TLS, e.g. `http://192.168.0.124:8090`.

2. Install and run:
   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:4321. Use **Login** to authenticate with your PocketBase user (email/password). Dashboard shows a Kanban of customers and a project summary.

## PocketBase

- Collections: `asiakkaat` (name, email, phone, status), `projektit` (name, hinta, deadline, asiakas).
- Auth: default PocketBase user collection (email/password). If your auth collection has another name, change `pb.collection('users')` in `src/components/LoginForm.tsx`.

## Kirjautuminen ei onnistu – vianmääräys

1. **"PocketBase ei vastaa" / "Yhteys epäonnistui"**
   - Tarkista että `.env` sisältää oikean `PUBLIC_POCKETBASE_URL` (ilman loppuslasha).
   - Varmista että PocketBase on käynnissä (avaa `PUBLIC_POCKETBASE_URL` selaimessa, pitäisi näkyä admin-sivu).
   - **CORS:** Jos frontend on eri osoitteessa (esim. localhost:4321) ja PB toisessa (esim. 192.168.0.124:8090), selain sallii pyynnön vain jos PocketBase lähettää CORS-otsikot. PocketBasen oletus sallii kaikki originit. Jos käytät välityspalvelinta, lisää frontin origin CORS-sääntöihin.

2. **404 kirjautuessa (mutta "Yhteys OK" /api/health toimii)**
   - Tällöin **välityspalvelin** ohjaa esim. `/api/health` PocketBaseen, mutta **ei** polkua `/api/admins/auth-with-password`.
   - Korjaus: ohjaa **kaikki** `/api/*` PocketBaseen (ei pelkästään health). Nginx-esimerkki: `location /api/ { proxy_pass http://127.0.0.1:8090; }` (ja vastaavat headerit).
   - Vaihtoehto: aja PocketBase suoraan ilman välityspalvelinta (`./pocketbase serve`), niin kaikki /api/* toimii.
   - `PUBLIC_POCKETBASE_URL` = juuriosoite, esim. `http://192.168.0.124:8090` (muista `http://`).

3. **"Failed to authenticate" / 400 tai 401**
   - Kirjaudu samoilla tunnuksilla kuin PocketBasen admin-käyttöliittymässä (`PUBLIC_POCKETBASE_URL/_/`).
   - Tarkista ettei sähköpostissa tai salasanassa ole ylimääräistä välilyöntiä.
   - Jos käytät kokoelman käyttäjiä (et adminia), lisää `.env`: `PUBLIC_POCKETBASE_AUTH=users`.

4. **Lisätiedot**
   - Kirjautumisvirheen jälkeen avaa selaimen konsoli (F12 → Console). Sovellus tulostaa sinne statuskoodin, URL:n ja vastauksen.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run preview` — preview production build
