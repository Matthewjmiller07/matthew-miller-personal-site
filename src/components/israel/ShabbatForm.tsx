import { useEffect, useMemo, useState } from 'react';
import Combobox, { type ComboOption } from './Combobox';
import AttendeePicker from './AttendeePicker';
import type { MealKind, Person, Place, Shabbat, ShabbatMeal } from './types';
import { MEALS, nearestShabbat, placeLabel, titleCase } from './lib';

interface Props {
  places: Place[];
  people: Person[];
  editing: Shabbat | null;
  onSave: (shabbat: Partial<Shabbat>, meals: ShabbatMeal[]) => Promise<void>;
  onCancel: () => void;
  onAddPerson: (name: string) => Promise<void>;
}

const emptyMeal = (meal: MealKind): ShabbatMeal => ({
  meal,
  place_code: null,
  host: null,
  location: null,
  attendees: [],
  notes: null,
});

/**
 * Hebcal knows which parasha a given Saturday is; asking it saves a lookup, and if the
 * request fails the field is still there to type into.
 */
async function fetchParasha(date: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.hebcal.com/hebcal?v=1&cfg=json&s=on&maj=off&min=off&mod=off&nx=off&mf=off&ss=off&c=off&geo=none&start=${date}&end=${date}`
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { items?: { category: string; title: string }[] };
    return payload.items?.find((item) => item.category === 'parashat')?.title ?? null;
  } catch {
    return null;
  }
}

export default function ShabbatForm({
  places,
  people,
  editing,
  onSave,
  onCancel,
  onAddPerson,
}: Props) {
  const [date, setDate] = useState(editing?.shabbat_date ?? nearestShabbat());
  const [parasha, setParasha] = useState(editing?.parasha ?? '');
  const [placeCode, setPlaceCode] = useState(editing?.place_code ?? null);
  const [placeName, setPlaceName] = useState(editing?.place_name ?? null);
  const [host, setHost] = useState(editing?.host ?? '');
  const [away, setAway] = useState(editing?.away ?? false);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [meals, setMeals] = useState<ShabbatMeal[]>(editing?.meals ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fill an empty parasha field — never overwrite something already typed.
  useEffect(() => {
    if (parasha.trim()) return;
    let cancelled = false;
    void fetchParasha(date).then((found) => {
      if (!cancelled && found) setParasha(found);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const placeOptions: ComboOption[] = useMemo(
    () =>
      places.map((place) => ({
        value: place.code,
        label: placeLabel(place),
        hint: place.subdistrict_he,
        terms: [place.name_he, place.name_en, titleCase(place.name_en)],
      })),
    [places]
  );

  const mealFor = (kind: MealKind) => meals.find((meal) => meal.meal === kind) ?? null;

  const toggleMeal = (kind: MealKind) =>
    setMeals((prev) =>
      prev.some((meal) => meal.meal === kind)
        ? prev.filter((meal) => meal.meal !== kind)
        : [...prev, emptyMeal(kind)]
    );

  const patchMeal = (kind: MealKind, patch: Partial<ShabbatMeal>) =>
    setMeals((prev) =>
      prev.map((meal) => (meal.meal === kind ? { ...meal, ...patch } : meal))
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSave(
        {
          shabbat_date: date,
          parasha: parasha || null,
          place_code: placeCode,
          place_name: placeName,
          host: host || null,
          away,
          notes: notes || null,
        },
        meals
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="il-form" onSubmit={submit}>
      <div className="il-grid">
        <label className="il-field">
          <span>Shabbat (the Saturday)</span>
          <input
            type="date"
            className="il-input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>

        <label className="il-field">
          <span>Parasha</span>
          <input
            type="text"
            dir="auto"
            className="il-input"
            value={parasha}
            placeholder="Filled in automatically"
            onChange={(event) => setParasha(event.target.value)}
          />
        </label>

        <label className="il-field il-field-check">
          <input type="checkbox" checked={away} onChange={(event) => setAway(event.target.checked)} />
          <span>We slept away</span>
        </label>
      </div>

      <div className="il-grid">
        <div className="il-field">
          <span>Where we were</span>
          <Combobox
            options={placeOptions}
            value={placeCode}
            freeText={placeName}
            allowFreeText
            placeholder="Town, moshav, kibbutz…"
            onChange={(value) => {
              setPlaceCode(value);
              if (value) setPlaceName(null);
            }}
            onFreeText={setPlaceName}
          />
        </div>

        <label className="il-field">
          <span>Host</span>
          <input
            type="text"
            dir="auto"
            className="il-input"
            value={host}
            placeholder="Whose home, or ours"
            onChange={(event) => setHost(event.target.value)}
          />
        </label>
      </div>

      <fieldset className="il-meals">
        <legend>Meals</legend>
        <p className="il-hint">
          Tick only what applies — a kiddush or dessert on its own is a perfectly good entry.
        </p>

        {MEALS.map(({ key, label, he }) => {
          const meal = mealFor(key);
          return (
            <div key={key} className={`il-meal ${meal ? 'is-on' : ''}`}>
              <label className="il-meal-head">
                <input type="checkbox" checked={Boolean(meal)} onChange={() => toggleMeal(key)} />
                <span className="il-meal-name">{label}</span>
                <span className="il-meal-he" dir="rtl">
                  {he}
                </span>
              </label>

              {meal && (
                <div className="il-meal-body">
                  <div className="il-grid">
                    <label className="il-field">
                      <span>Host</span>
                      <input
                        type="text"
                        dir="auto"
                        className="il-input"
                        value={meal.host ?? ''}
                        placeholder="Who we ate with"
                        onChange={(event) => patchMeal(key, { host: event.target.value || null })}
                      />
                    </label>

                    <div className="il-field">
                      <span>Town (if different)</span>
                      <Combobox
                        options={placeOptions}
                        value={meal.place_code}
                        placeholder="Same as above"
                        onChange={(value) => patchMeal(key, { place_code: value })}
                      />
                    </div>
                  </div>

                  <div className="il-field">
                    <span>Who went</span>
                    <AttendeePicker
                      compact
                      people={people}
                      value={meal.attendees}
                      onChange={(attendees) => patchMeal(key, { attendees })}
                      onAddPerson={onAddPerson}
                    />
                  </div>

                  <label className="il-field">
                    <span>Notes</span>
                    <input
                      type="text"
                      dir="auto"
                      className="il-input"
                      value={meal.notes ?? ''}
                      onChange={(event) => patchMeal(key, { notes: event.target.value || null })}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </fieldset>

      <label className="il-field">
        <span>Notes on the Shabbat</span>
        <input
          type="text"
          dir="auto"
          className="il-input"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {error && <p className="il-error">{error}</p>}

      <div className="il-actions">
        <button type="submit" className="il-btn il-btn-primary" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Log Shabbat'}
        </button>
        {editing && (
          <button type="button" className="il-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
