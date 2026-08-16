import { useState } from 'react';
import type { Person } from './types';
import { isWholeFamily } from './lib';

interface Props {
  people: Person[];
  value: string[];
  onChange: (attendees: string[]) => void;
  onAddPerson?: (name: string) => Promise<void>;
  compact?: boolean;
}

/**
 * Who was there. One tap for the whole family, or pick people individually — the
 * common case (everyone) shouldn't cost five taps.
 */
export default function AttendeePicker({
  people,
  value,
  onChange,
  onAddPerson,
  compact = false,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const family = people.filter((person) => person.in_family);
  const everyone = isWholeFamily(value, people);

  const toggle = (slug: string) =>
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);

  const submitPerson = async () => {
    const trimmed = name.trim();
    if (!trimmed || !onAddPerson) return;
    setBusy(true);
    try {
      await onAddPerson(trimmed);
      setName('');
      setAdding(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`il-attendees ${compact ? 'is-compact' : ''}`}>
      <button
        type="button"
        className={`il-chip il-chip-all ${everyone ? 'is-on' : ''}`}
        onClick={() => onChange(everyone ? [] : family.map((person) => person.slug))}
        disabled={!family.length}
      >
        Whole family
      </button>

      {people.map((person) => (
        <button
          key={person.slug}
          type="button"
          className={`il-chip ${value.includes(person.slug) ? 'is-on' : ''}`}
          style={
            value.includes(person.slug) && person.color
              ? { borderColor: person.color, background: `${person.color}22` }
              : undefined
          }
          onClick={() => toggle(person.slug)}
        >
          {person.name}
        </button>
      ))}

      {onAddPerson &&
        (adding ? (
          <span className="il-chip-add">
            <input
              className="il-input il-input-inline"
              autoFocus
              value={name}
              placeholder="Name"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submitPerson();
                }
                if (event.key === 'Escape') setAdding(false);
              }}
            />
            <button type="button" className="il-btn il-btn-sm" onClick={submitPerson} disabled={busy}>
              {busy ? '…' : 'Add'}
            </button>
          </span>
        ) : (
          <button type="button" className="il-chip il-chip-ghost" onClick={() => setAdding(true)}>
            + person
          </button>
        ))}
    </div>
  );
}
