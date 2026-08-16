export const prerender = false;

/**
 * Write endpoint for the /israel tracker.
 *
 * The page itself is public and reads through the anon key (RLS allows SELECT and
 * nothing else). Every write lands here instead, where the service-role key lives,
 * gated on a shared passcode — otherwise anyone who found the page could log a
 * Shabbat meal into someone else's life.
 */

import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSCODE =
  import.meta.env.ISRAEL_TRACKER_PASSWORD || process.env.ISRAEL_TRACKER_PASSWORD;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function passcodeMatches(supplied) {
  if (!PASSCODE || typeof supplied !== 'string') return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(PASSCODE);
  // timingSafeEqual throws on a length mismatch, which would itself leak the length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const TEFILLOT = new Set([
  'shacharit',
  'mincha',
  'arvit',
  'mincha_arvit',
  'musaf',
  'selichot',
  'other',
]);
const MEALS = new Set([
  'friday_night',
  'shabbat_lunch',
  'seudah_shlishit',
  'kiddush',
  'dessert',
  'melave_malka',
]);

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isTime = (value) => typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value);

const text = (value, max = 500) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

/** Attendance is a set of israel_people.slug values; keep it to plausible slugs. */
const slugs = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((s) => typeof s === 'string' && /^[a-z0-9-]{1,40}$/.test(s)))]
    : [];

const coordinate = (value, limit) => {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
};

/* ------------------------------------------------------------------- actions */

const actions = {
  async 'save-minyan'(db, body) {
    const record = body.record ?? {};
    if (!isDate(record.date)) return { error: 'A valid date is required.', status: 400 };
    if (!TEFILLOT.has(record.tefillah)) return { error: 'Unknown tefillah.', status: 400 };
    if (!record.shul_id && !text(record.shul_name)) {
      return { error: 'Pick a shul or type where you davened.', status: 400 };
    }

    const row = {
      date: record.date,
      tefillah: record.tefillah,
      shul_id: record.shul_id || null,
      shul_name: text(record.shul_name, 200),
      place_code: text(record.place_code, 20),
      minyan_time: isTime(record.minyan_time) ? record.minyan_time : null,
      attendees: slugs(record.attendees),
      notes: text(record.notes, 2000),
    };

    const query = record.id
      ? db.from('israel_minyanim').update(row).eq('id', record.id)
      : db.from('israel_minyanim').insert(row);
    const { data, error } = await query.select().single();
    return error ? { error: error.message, status: 400 } : { record: data };
  },

  /**
   * A Shabbat and its meals save together: the meals are the point of the record, and
   * writing them one request at a time would leave half-logged Shabbatot behind if the
   * phone lost signal partway through.
   */
  async 'save-shabbat'(db, body) {
    const shabbat = body.shabbat ?? {};
    if (!isDate(shabbat.shabbat_date)) {
      return { error: 'A valid Shabbat date is required.', status: 400 };
    }

    const row = {
      shabbat_date: shabbat.shabbat_date,
      parasha: text(shabbat.parasha, 120),
      place_code: text(shabbat.place_code, 20),
      place_name: text(shabbat.place_name, 200),
      host: text(shabbat.host, 200),
      away: Boolean(shabbat.away),
      notes: text(shabbat.notes, 2000),
    };

    const { data: saved, error: shabbatError } = await db
      .from('israel_shabbatot')
      .upsert(row, { onConflict: 'shabbat_date' })
      .select()
      .single();
    if (shabbatError) return { error: shabbatError.message, status: 400 };

    const meals = Array.isArray(body.meals) ? body.meals : [];
    const invalid = meals.find((meal) => !MEALS.has(meal.meal));
    if (invalid) return { error: `Unknown meal "${invalid.meal}".`, status: 400 };

    // The submitted list is the whole truth for this Shabbat, so replace rather than
    // merge — that's what makes deleting a meal in the UI actually stick.
    const { error: clearError } = await db
      .from('israel_shabbat_meals')
      .delete()
      .eq('shabbat_id', saved.id);
    if (clearError) return { error: clearError.message, status: 400 };

    let savedMeals = [];
    if (meals.length) {
      const { data, error } = await db
        .from('israel_shabbat_meals')
        .insert(
          meals.map((meal) => ({
            shabbat_id: saved.id,
            meal: meal.meal,
            place_code: text(meal.place_code, 20),
            host: text(meal.host, 200),
            location: text(meal.location, 300),
            attendees: slugs(meal.attendees),
            notes: text(meal.notes, 2000),
          }))
        )
        .select();
      if (error) return { error: error.message, status: 400 };
      savedMeals = data;
    }

    return { record: { ...saved, meals: savedMeals } };
  },

  async 'save-visit'(db, body) {
    const record = body.record ?? {};
    if (!isDate(record.date)) return { error: 'A valid date is required.', status: 400 };
    if (!record.place_code && !text(record.place_name)) {
      return { error: 'Pick a place or type where you went.', status: 400 };
    }

    const row = {
      date: record.date,
      place_code: text(record.place_code, 20),
      place_name: text(record.place_name, 200),
      title: text(record.title, 200),
      category: text(record.category, 60),
      attendees: slugs(record.attendees),
      notes: text(record.notes, 2000),
    };

    const query = record.id
      ? db.from('israel_visits').update(row).eq('id', record.id)
      : db.from('israel_visits').insert(row);
    const { data, error } = await query.select().single();
    return error ? { error: error.message, status: 400 } : { record: data };
  },

  /** Adds a shul, or drops a pin on one that has no coordinates yet. */
  async 'save-shul'(db, body) {
    const record = body.record ?? {};
    const name = text(record.name_he, 200) || text(record.name_en, 200);
    if (!record.id && !name) return { error: 'A shul needs a name.', status: 400 };

    const row = {
      name_he: text(record.name_he, 200),
      name_en: text(record.name_en, 200),
      address_he: text(record.address_he, 300),
      city: text(record.city, 120) ?? 'רעננה',
      place_code: text(record.place_code, 20),
      lat: coordinate(record.lat, 90),
      lng: coordinate(record.lng, 180),
      early_mincha_arvit:
        record.early_mincha_arvit === null || record.early_mincha_arvit === undefined
          ? null
          : Boolean(record.early_mincha_arvit),
      nusach: text(record.nusach, 60),
      notes: text(record.notes, 2000),
      active: record.active === undefined ? true : Boolean(record.active),
    };

    if (record.id) {
      // Only overwrite what the caller actually sent, so a pin drop doesn't blank
      // out the address and a rename doesn't lose the pin.
      const patch = Object.fromEntries(
        Object.entries(row).filter(([key]) => key in record)
      );
      const { data, error } = await db
        .from('israel_shuls')
        .update(patch)
        .eq('id', record.id)
        .select()
        .single();
      return error ? { error: error.message, status: 400 } : { record: data };
    }

    const slug =
      text(record.slug, 60)?.toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
      `shul-${Date.now().toString(36)}`;
    const { data, error } = await db
      .from('israel_shuls')
      .insert({ ...row, slug, source: 'user' })
      .select()
      .single();
    return error ? { error: error.message, status: 400 } : { record: data };
  },

  async 'save-person'(db, body) {
    const record = body.record ?? {};
    const name = text(record.name, 80);
    if (!name) return { error: 'A person needs a name.', status: 400 };

    const row = {
      name,
      name_he: text(record.name_he, 80),
      color: /^#[0-9a-f]{6}$/i.test(record.color ?? '') ? record.color : null,
      in_family: record.in_family === undefined ? true : Boolean(record.in_family),
      sort_order: Number.isInteger(record.sort_order) ? record.sort_order : 0,
    };

    if (record.id) {
      const { data, error } = await db
        .from('israel_people')
        .update(row)
        .eq('id', record.id)
        .select()
        .single();
      return error ? { error: error.message, status: 400 } : { record: data };
    }

    const slug =
      text(record.slug, 40)?.toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) ||
      `person-${Date.now().toString(36)}`;
    const { data, error } = await db
      .from('israel_people')
      .insert({ ...row, slug })
      .select()
      .single();
    return error ? { error: error.message, status: 400 } : { record: data };
  },

  async delete(db, body) {
    const tables = {
      minyan: 'israel_minyanim',
      shabbat: 'israel_shabbatot',
      visit: 'israel_visits',
      person: 'israel_people',
    };
    const table = tables[body.kind];
    if (!table) return { error: 'Unknown record type.', status: 400 };
    if (!body.id) return { error: 'Missing id.', status: 400 };

    const { error } = await db.from(table).delete().eq('id', body.id);
    return error ? { error: error.message, status: 400 } : { deleted: body.id };
  },
};

/* -------------------------------------------------------------------- handler */

export async function POST({ request }) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Supabase is not configured on the server.' }, 500);
  }
  if (!PASSCODE) {
    return json({ error: 'ISRAEL_TRACKER_PASSWORD is not set on the server.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  if (!passcodeMatches(request.headers.get('x-israel-key') || body.key)) {
    return json({ error: 'Wrong passcode.' }, 401);
  }

  // "unlock" exists so the UI can check a passcode before showing the forms.
  if (body.action === 'unlock') return json({ ok: true });

  const action = actions[body.action];
  if (!action) return json({ error: `Unknown action "${body.action}".` }, 400);

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const result = await action(db, body);
    return result.error ? json({ error: result.error }, result.status ?? 400) : json(result);
  } catch (err) {
    console.error('[api/israel]', body.action, err);
    return json({ error: 'Something went wrong saving that.' }, 500);
  }
}
