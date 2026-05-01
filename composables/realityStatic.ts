// Static NBS snapshot — €/m² priemerná cena bytov podľa kraja.
// NBS API nie je verejne dostupné, takže tento snapshot manuálne aktualizujem
// raz za kvartál po novej publikácii NBS.
//
// Zdroj: NBS — „Index cien nehnuteľností na bývanie" (kvartálne).
// https://nbs.sk/statisticke-udaje/financne-trhy/ceny-nehnutelnosti-na-byvanie/
//
// Hodnoty zodpovedajú existujúcim bytom (nie novostavbám). Pre orientáciu —
// reálna trhová cena konkrétnej nehnuteľnosti sa v rámci kraja líši o desiatky
// percent v závislosti od lokality, dispozície, stavu.

export interface KrajPrice {
  /** NUTS3 code (SK010 = BA, SK021 = TT, ...) */
  nuts3: string;
  /** drakh GeoJSON IDN4 code (1–8 in Slovak official kraj order) */
  idn4: number;
  /** Kraj name in Slovak */
  name: string;
  /** Priemerná cena €/m² existujúcich bytov */
  pricePerM2: number;
}

export const NBS_SNAPSHOT_LABEL = "NBS — Index cien nehnuteľností, Q1 2025";
export const NBS_SNAPSHOT_NOTE =
  "Snapshot sa aktualizuje manuálne po novej publikácii NBS. Aktuálne čísla pozri priamo na nbs.sk.";

export const KRAJ_PRICES: KrajPrice[] = [
  { nuts3: "SK010", idn4: 1, name: "Bratislavský", pricePerM2: 3050 },
  { nuts3: "SK021", idn4: 2, name: "Trnavský", pricePerM2: 1850 },
  { nuts3: "SK022", idn4: 3, name: "Trenčiansky", pricePerM2: 1620 },
  { nuts3: "SK023", idn4: 4, name: "Nitriansky", pricePerM2: 1640 },
  { nuts3: "SK031", idn4: 5, name: "Žilinský", pricePerM2: 2100 },
  { nuts3: "SK032", idn4: 6, name: "Banskobystrický", pricePerM2: 1500 },
  { nuts3: "SK041", idn4: 7, name: "Prešovský", pricePerM2: 1700 },
  { nuts3: "SK042", idn4: 8, name: "Košický", pricePerM2: 1850 },
];

export const SR_AVERAGE_PRICE_M2 = 2150;

export const KRAJ_GEOJSON_URL =
  "https://cdn.jsdelivr.net/gh/drakh/slovakia-gps-data@master/GeoJSON/epsg_4326/regions_epsg_4326.geojson";
