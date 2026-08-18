import { useMemo, useState } from 'react';
import Combobox, { type ComboOption } from './Combobox';
import AttendeePicker from './AttendeePicker';
import type { Person, Place, Visit } from './types';
import { placeLabel, titleCase, todayISO } from './lib';

interface Props {
  places: Place[];
  people: Person[];
  editing: Visit | null;
  onSave: (record: Partial<Visit>) => Promise<void>;
  onCancel: () => void;
  onAddPerson: (name: string) => Promise<void>;
}

const CATEGORIES = ['Family', 'Friends', 'Simcha', 'Tiyul', 'Work', 'Shopping', 'Other'];

export default function VisitForm({
  places,
  people,
  editing,
  onSave,
  onCancel,
  onAddPerson,
}: Props) {
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [placeCode, setPlaceCode] = useState(editing?.place_code ?? null);
  const [placeName, setPlaceName] = useState(editing?.place_name ?? null);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [category, setCategory] = useState(editing?.category ?? '');
  const [attendees, setAttendees] = useState<string[]>(editing?.attendees ?? []);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
    if (busy) return;
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      await onSave({
        ...(editing ? { id: editing.id } : {}),
        date,
        place_code: placeCode,
        place_name: placeCode ? null : placeName,
        title: title || null,
        category: category || null,
        attendees,
        notes: notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (!editing) {
        setTitle('');
        setNotes('');
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
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>

        <div className="il-field">
          <span>Where</span>
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
          <span>Kind of trip</span>
          <select
            className="il-input"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">—</option>
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="il-field">
        <span>What it was</span>
        <input
          type="text"
          dir="auto"
          className="il-input"
          value={title}
          placeholder="Bar mitzvah, hike, cousins…"
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <div className="il-field">
        <span>Who went</span>
        <AttendeePicker
          people={people}
          value={attendees}
          onChange={setAttendees}
          onAddPerson={onAddPerson}
        />
      </div>

      <label className="il-field">
        <span>Notes</span>
        <input
          type="text"
          dir="auto"
          className="il-input"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {error && <p className="il-error">{error}</p>}
      {saved && <p className="il-saved">✓ Logged</p>}

      <div className="il-actions">
        <button type="submit" className="il-btn il-btn-primary" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Log the trip'}
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
