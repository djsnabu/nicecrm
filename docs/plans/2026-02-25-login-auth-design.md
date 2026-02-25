# 2026-02-25 - Login auth design

## Context
- NiceCRM frontti kirjautuu PocketBaseen.
- Nykyinen login käyttää env-muuttujaa `PUBLIC_POCKETBASE_AUTH` ja oletuksena `_superusers`-kokoelmaa.
- Kun esim. `nabil@niceevents.fi` (users-kokoelma) yrittää kirjautua, frontti lähettää pyynnön `/api/collections/_superusers/auth-with-password` → 400.
- Tarve: "Käyttäjä" ja "Admin" erikseen, dropdownin kautta. Adminit käytössä vain PB-hallinnassa.

## Requirements
1. Login-näkymässä valittavissa kaksi roolia:
   - Käyttäjä → kirjautuu `users`-collectioniin
   - Admin → kirjautuu `_superusers`-collectioniin
2. Oletusrooli = Käyttäjä (tai `PUBLIC_POCKETBASE_AUTH` jos määritelty → esim. dev/test).
3. Virheviestit ja ohjeet roolikohtaisia (404-ohje adminille, usersille ei tarvita admin-proxy-infoa).
4. Mahdollisuus muistaa edellinen valinta (localStorage) → nopeuttaa kirjautumista.
5. Ei backend-muutoksia; kaikki tehdään frontissa.

## Design
### UI
- LoginForm.tsx: lisätään select/dropdown ennen submit-nappia.
- Vaihtoehdot:
  - "Käyttäjä" (value: `users`)
  - "Admin" (value: `_superusers`)
- Oletus: `PUBLIC_POCKETBASE_AUTH ?? 'users'` (lowercase + varmistus). Tallennetaan localStorageen (avain esim. `nicecrm.authMode`).
- Pieni teksti dropdownin alle: "Admin vaatii erillisen tunnuksen".

### State & logic
- Uusi state `authTarget`, initialValue = `localStorage.getItem('nicecrm.authMode') ?? (import.meta.env.PUBLIC_POCKETBASE_AUTH ?? 'users')`.
- `handleSubmit`: `const collection = authTarget === '_superusers' ? '_superusers' : 'users'; await pb.collection(collection).authWithPassword(...)`.
- Kun valinta muuttuu, `setAuthTarget(value); localStorage.setItem('nicecrm.authMode', value);`.

### Messaging
- `connectionOk` tekstin admin-osuus näytetään vain kun `authTarget === '_superusers'` → mainitaan `/api/admins/*` proxypolku.
- Error-viesti 400/401: "Varmista, että valitsit oikean roolin ja että sähköposti/salasana on oikein.".

### Testing
- Kirjaudu käyttäjäroolilla (`nabil@niceevents.fi` / `Snabu...`).
- Simuloi admin (jos admin-tunnus saatavilla). Jos ei, testataan pyynnön endpoint → POST /api/collections/_superusers/... 404/401.
- Tarkista localStorage: reload → valinta säilyy.

## Out of scope (future)
- Roolien automaattinen tunnistus emailista.
- Admin-salasanan hallinta 1Passwordin kautta.
- Role-based UI (erilaiset näkymät admineille vs userit).