import { useMemo, useState } from 'react';
import Combobox, { type ComboOption } from './Combobox';
import AttendeePicker from './AttendeePicker';
import type { Minyan, Person, Place, Shul, Tefillah } from './types';
import { RAANANA_CODE, TEFILLOT, placeLabel, shulLabel, titleCase, todayISO } from './lib';

interface Props {
  shuls: Shul[];
  places: Place[];
  people: Person[];
  editing: Minyan | null;
  onSave: (record: Partial<Minyan>) => Promise<void>;
  onCancel: () => void;
  onAddPerson: (name: string) => Promise<void>;
}

const blank = () => ({
  date: todayISO(),
  tefillah: 'shacharit' as Tefillah,
  shul_id: null as string | null,
  shul_name: null as string | null,
  place_code: RAANANA_CODE as string | null,
  minyan_time: '',
  attendees: [] as string[],
  notes: '',
});

export default function MinyanForm({
  shuls,
  places,
  people,
  editing,
  onSave,
  onCancel,
  onAddPerson,
}: Props) {
  const [form, setForm] = useState(() =>
    editing
      ? {
          date: editing.date,
          tefillah: editing.tefillah,
          shul_id: editing.shul_id,
          shul_name: editing.shul_name,
          place_code: editing.place_code,
          minyan_time: editing.minyan_time?.slice(0, 5) ?? '',
          attendees: editing.attendees ?? [],
          notes: editing.notes ?? '',
        }
      : blank()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ReturnType<typeof blank>>(
    key: K,
    value: ReturnType<typeof blank>[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const shulOptions: ComboOption[] = useMemo(
    () =>
      shuls.map((shul) => ({
        value: shul.id,
        label: shulLabel(shul),
        hint: shul.address_he ?? undefined,
        terms: [shul.name_he, shul.name_en ?? '', shul.address_he ?? '', shul.slug],
      })),
    [shuls]
  );

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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSave({
        ...(editing ? { id: editing.id } : {}),
        date: form.date,
        tefillah: form.tefillah,
        shul_id: form.shul_id,
        shul_name: form.shul_id ? null : form.shul_name,
        place_code: form.place_code,
        minyan_time: form.minyan_time || null,
        attendees: form.attendees,
        notes: form.notes || null,
      });
      // Keep the date, the shul and who came — the next entry is usually mincha at
      // the same place, not a fresh trip through every field.
      if (!editing) {
        setForm((prev) => ({ ...blank(), ...prev, minyan_time: '', notes: '' }));
      }
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
          <span>Date</span>
          <input
            type="date"
            className="il-input"
            value={form.date}
            onChange={(event) => set('date', event.target.value)}
            required
          />
        </label>

        <label className="il-field">
          <span>Tefillah</span>
          <select
            className="il-input"
            value={form.tefillah}
            onChange={(event) => set('tefillah', event.target.value as Tefillah)}
          >
            {TEFILLOT.map((tefillah) => (
              <option key={tefillah.key} value={tefillah.key}>
                {tefillah.label} · {tefillah.he}
              </option>
            ))}
          </select>
        </label>

        <label className="il-field">
          <span>Minyan time</span>
          <input
            type="time"
            className="il-input"
            value={form.minyan_time}
            onChange={(event) => set('minyan_time', event.target.value)}
          />
        </label>
      </div>

      <div className="il-grid">
        <div className="il-field">
          <span>Shul</span>
          <Combobox
            options={shulOptions}
            value={form.shul_id}
            freeText={form.shul_name}
            allowFreeText
            placeholder="Search the Ra'anana list, or type another shul"
            onChange={(value) => {
              set('shul_id', value);
              if (!value) return;
              set('shul_name', null);
              // Picking a shul settles which town this was in.
              const town = shuls.find((shul) => shul.id === value)?.place_code;
              if (town) set('place_code', town);
            }}
            onFreeText={(value) => set('shul_name', value)}
          />
        </div>

        <div className="il-field">
          <span>Town</span>
          <Combobox
            options={placeOptions}
            value={form.place_code}
            placeholder="Anywhere in Israel"
            onChange={(value) => set('place_code', value)}
          />
        </div>
      </div>

      <div className="il-field">
        <span>Who went</span>
        <AttendeePicker
          people={people}
          value={form.attendees}
          onChange={(attendees) => set('attendees', attendees)}
          onAddPerson={onAddPerson}
        />
      </div>

      <label className="il-field">
        <span>Notes</span>
        <input
          type="text"
          dir="auto"
          className="il-input"
          value={form.notes}
          placeholder="Anything worth remembering"
          onChange={(event) => set('notes', event.target.value)}
        />
      </label>

      {error && <p className="il-error">{error}</p>}

      <div className="il-actions">
        <button type="submit" className="il-btn il-btn-primary" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Log minyan'}
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
