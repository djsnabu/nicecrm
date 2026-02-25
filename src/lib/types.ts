export type AsiakasStatus = 'Uusi' | 'Tarjous' | 'Kauppa' | 'Hävisi';
export type AsiakasSegmentti = 'A-ryhmä' | 'B-ryhmä' | 'C-ryhmä' | 'Passiivinen' | 'Potentiaalinen';
export type AsiakasLahde = 'Kylmäsoitto' | 'Suositus' | 'Verkkosivut' | 'Messut' | 'YTJ' | 'Muu' | 'Tuntematon';
export type AktiviteettiTyyppi = 'Puhelu' | 'Sähköposti' | 'Muistiinpano' | 'Tapaaminen';

export interface Asiakas {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: AsiakasStatus;
  segmentti?: AsiakasSegmentti;
  lahde?: AsiakasLahde;
  kaupunki?: string;
  toimiala?: string;
  created: string;
  updated: string;
}

export type ProjektiStatus = 'Uusi' | 'Yhteydenotto' | 'Tarjous' | 'Neuvottelu' | 'Voitettu' | 'Hävinnyt';

export interface Projekti {
  id: string;
  name: string;
  hinta: number;
  deadline: string;
  asiakas: string;
  status: ProjektiStatus;
  created: string;
  updated: string;
  expand?: { asiakas: Asiakas };
}

export interface Aktiviteetti {
  id: string;
  asiakas: string;
  tyyppi: AktiviteettiTyyppi;
  kuvaus: string;
  paivamaara: string;
  created: string;
  updated: string;
}

export interface Muistutus {
  id: string;
  asiakas: string;
  teksti: string;
  paivamaara: string;
  tehty: boolean;
  created: string;
  updated: string;
}

export interface SahkopostiMalli {
  id: string;
  nimi: string;
  aihe: string;
  sisalto: string;
  created: string;
  updated: string;
}
