/**
 * PRH avoindata API -integraatio.
 * Hakee uudet yritykset kaupparekisteristä (ei vaadi API-avainta).
 */

const BASE_URL = 'https://avoindata.prh.fi/opendata-ytj-api/v3/companies';

export interface PRHCompany {
  businessId: { value: string; registrationDate: string };
  names: { name: string; type: string; registrationDate: string }[];
  companyForms: {
    type: string;
    descriptions: { languageCode: string; description: string }[];
    registrationDate: string;
  }[];
  addresses: {
    type: number;
    street: string;
    buildingNumber: string;
    entrance: string;
    postCode: string;
    postOffices: { city: string; languageCode: string }[];
  }[];
  registrationDate: string;
}

export interface PRHLead {
  ytunnus: string;
  name: string;
  yhtiömuoto: string;
  osoite: string;
  postinumero: string;
  kaupunki: string;
  rekisteroity: string;
}

function parseCompany(c: PRHCompany): PRHLead {
  const ytunnus = c.businessId?.value ?? '';
  const name = c.names?.[0]?.name ?? '?';

  let yhtiömuoto = '';
  if (c.companyForms?.[0]) {
    const fi = c.companyForms[0].descriptions?.find((d) => d.languageCode === '1');
    yhtiömuoto = fi?.description ?? '';
  }

  let osoite = '';
  let postinumero = '';
  let kaupunki = '';
  if (c.addresses?.[0]) {
    const a = c.addresses[0];
    const katu = a.street ?? '';
    const nro = a.buildingNumber ?? '';
    const porras = a.entrance ?? '';
    osoite = `${katu} ${nro}${porras}`.trim();
    postinumero = a.postCode ?? '';
    const city = a.postOffices?.find((p) => p.languageCode === '1');
    kaupunki = city?.city ?? a.postOffices?.[0]?.city ?? '';
  }

  return {
    ytunnus,
    name,
    yhtiömuoto,
    osoite,
    postinumero,
    kaupunki,
    rekisteroity: c.registrationDate ?? '',
  };
}

export async function fetchPRHCompanies(
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<PRHLead[]> {
  const all: PRHLead[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      registrationDateStart: startDate,
      registrationDateEnd: endDate,
      page: String(page),
    });

    const res = await fetch(`${BASE_URL}?${params}`, { signal });
    if (!res.ok) {
      throw new Error(`PRH API virhe: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const companies: PRHCompany[] = data.companies ?? [];
    if (companies.length === 0) break;

    all.push(...companies.map(parseCompany));
    page++;
  }

  return all;
}
