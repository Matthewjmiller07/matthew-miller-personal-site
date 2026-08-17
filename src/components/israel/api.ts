import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Minyan, Person, Place, Shabbat, ShabbatMeal, Shul, Visit } from './types';

let client: SupabaseClient | null = null;

/** Read-only browser client. RLS on the israel_* tables allows SELECT and nothing more. */
export function db(url: string, anonKey: string): SupabaseClient {
  client ??= createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export async function loadReference(): Promise<{
  places: Place[];
  regions: GeoJSON.FeatureCollection | null;
}> {
  const [places, regions] = await Promise.all([
    fetch('/data/israel-places.json').then((r) => (r.ok ? r.json() : [])),
    fetch('/data/israel-regions.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);
  return { places, regions };
}

export async function loadEverything(supabase: SupabaseClient) {
  const [shuls, people, minyanim, shabbatot, meals, visits] = await Promise.all([
    supabase.from('israel_shuls').select('*').eq('active', true).order('name_he'),
    supabase.from('israel_people').select('*').order('sort_order').order('name'),
    supabase.from('israel_minyanim').select('*').order('date', { ascending: false }).limit(1000),
    supabase
      .from('israel_shabbatot')
      .select('*')
      .order('shabbat_date', { ascending: false })
      .limit(500),
    supabase.from('israel_shabbat_meals').select('*'),
    supabase.from('israel_visits').select('*').order('date', { ascending: false }).limit(500),
  ]);

  const firstError = [shuls, people, minyanim, shabbatot, meals, visits].find((r) => r.error);
  if (firstError?.error) throw new Error(firstError.error.message);

  const mealsByShabbat = new Map<string, ShabbatMeal[]>();
  for (const meal of (meals.data ?? []) as ShabbatMeal[]) {
    const key = meal.shabbat_id ?? '';
    mealsByShabbat.set(key, [...(mealsByShabbat.get(key) ?? []), meal]);
  }

  return {
    shuls: (shuls.data ?? []) as Shul[],
    people: (people.data ?? []) as Person[],
    minyanim: (minyanim.data ?? []) as Minyan[],
    shabbatot: ((shabbatot.data ?? []) as Shabbat[]).map((shabbat) => ({
      ...shabbat,
      meals: mealsByShabbat.get(shabbat.id) ?? [],
    })),
    visits: (visits.data ?? []) as Visit[],
  };
}

export class ApiError extends Error {}

/** Every write goes through /api/israel, which holds the service key behind the passcode. */
export async function write<T = unknown>(
  key: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch('/api/israel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-israel-key': key },
    body: JSON.stringify(body),
  });

  let payload: { error?: string } & Record<string, unknown> = {};
  try {
    payload = await response.json();
  } catch {
    /* a non-JSON error page — fall through to the status-based message */
  }
  if (!response.ok) {
    throw new ApiError(payload.error || `Request failed (${response.status})`);
  }
  return payload as T;
}

export interface GeocodeHit {
  lat: number;
  lng: number;
  label: string;
  /** The matched house number, when Nominatim found the address at building level. */
  houseNumber: string | null;
  /** True when houseNumber matches the number typed in the search — a real address hit, not a street/area fallback. */
  exact: boolean;
}

/** Address search for pinning a shul, proxied server-side through /api/israel-geocode. */
export async function geocodeSearch(
  key: string,
  query: string,
  options: { bounded?: boolean } = {}
): Promise<GeocodeHit[]> {
  const params = new URLSearchParams({ q: query });
  if (options.bounded) params.set('bounded', '1');

  const response = await fetch(`/api/israel-geocode?${params}`, {
    headers: { 'x-israel-key': key },
  });

  let payload: { error?: string; results?: GeocodeHit[] } = {};
  try {
    payload = await response.json();
  } catch {
    /* a non-JSON error page — fall through to the status-based message */
  }
  if (!response.ok) {
    throw new ApiError(payload.error || `Request failed (${response.status})`);
  }
  return payload.results ?? [];
}
