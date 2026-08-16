/** Shared shapes for the /israel tracker. */

/** A settlement from the CBS register (public/data/israel-places.json). */
export interface Place {
  /** "Semel yishuv" — the official settlement code, and our foreign key. */
  code: string;
  name_he: string;
  name_en: string;
  subdistrict_code: string;
  subdistrict_he: string;
  subdistrict_en: string;
  council_he: string;
  lat: number | null;
  lng: number | null;
  geo_source: string | null;
}

export interface Shul {
  id: string;
  slug: string;
  name_he: string;
  name_en: string | null;
  address_he: string | null;
  city: string;
  place_code: string | null;
  lat: number | null;
  lng: number | null;
  /** Mincha ketana near shkia + arvit at tzeit. Null means the list doesn't say. */
  early_mincha_arvit: boolean | null;
  nusach: string | null;
  notes: string | null;
  source: string | null;
  active: boolean;
}

export interface Person {
  id: string;
  slug: string;
  name: string;
  name_he: string | null;
  color: string | null;
  in_family: boolean;
  sort_order: number;
}

export type Tefillah =
  | 'shacharit'
  | 'mincha'
  | 'arvit'
  | 'mincha_arvit'
  | 'musaf'
  | 'selichot'
  | 'other';

export interface Minyan {
  id: string;
  date: string;
  tefillah: Tefillah;
  shul_id: string | null;
  shul_name: string | null;
  place_code: string | null;
  minyan_time: string | null;
  attendees: string[];
  notes: string | null;
}

export type MealKind =
  | 'friday_night'
  | 'shabbat_lunch'
  | 'seudah_shlishit'
  | 'kiddush'
  | 'dessert'
  | 'melave_malka';

export interface ShabbatMeal {
  id?: string;
  shabbat_id?: string;
  meal: MealKind;
  place_code: string | null;
  host: string | null;
  location: string | null;
  attendees: string[];
  notes: string | null;
}

export interface Shabbat {
  id: string;
  shabbat_date: string;
  parasha: string | null;
  place_code: string | null;
  place_name: string | null;
  host: string | null;
  away: boolean;
  notes: string | null;
  meals: ShabbatMeal[];
}

export interface Visit {
  id: string;
  date: string;
  place_code: string | null;
  place_name: string | null;
  title: string | null;
  category: string | null;
  attendees: string[];
  notes: string | null;
}

/** A district / sub-district polygon from public/data/israel-regions.geojson. */
export interface RegionFeature {
  type: 'Feature';
  properties: {
    level: 'district' | 'subdistrict';
    name_en: string;
    name_he: string;
    shape_id: string;
  };
  geometry: { type: string; coordinates: unknown };
}
