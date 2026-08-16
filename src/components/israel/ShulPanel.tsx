import { useMemo, useState } from 'react';
import type { Shul } from './types';
import { matches } from './lib';

interface Props {
  shuls: Shul[];
  counts: Map<string, number>;
  canEdit: boolean;
  pinningId: string | null;
  onStartPin: (shulId: string | null) => void;
  onAddShul: (record: { name_he: string; address_he: string | null }) => Promise<void>;
}

export default function ShulPanel({
  shuls,
  counts,
  canEdit,
  pinningId,
  onStartPin,
  onAddShul,
}: Props) {
  const [query, setQuery] = useState('');
  const [onlyEarly, setOnlyEarly] = useState(false);
  const [onlyVisited, setOnlyVisited] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () =>
      shuls.filter((shul) => {
        if (onlyEarly && shul.early_mincha_arvit !== true) return false;
        if (onlyVisited && !counts.get(shul.id)) return false;
        return matches([shul.name_he, shul.name_en ?? '', shul.address_he ?? ''], query);
      }),
    [shuls, query, onlyEarly, onlyVisited, counts]
  );

  const located = shuls.filter((shul) => shul.lat && shul.lng).length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onAddShul({ name_he: name.trim(), address_he: address.trim() || null });
      setName('');
      setAddress('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="il-panel">
      <div className="il-toolbar">
        <input
          type="search"
          dir="auto"
          className="il-input"
          value={query}
          placeholder="Search shuls by name or street"
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="il-toggle">
          <input
            type="checkbox"
            checked={onlyEarly}
            onChange={(event) => setOnlyEarly(event.target.checked)}
          />
          <span>Mincha ketana + arvit</span>
        </label>
        <label className="il-toggle">
          <input
            type="checkbox"
            checked={onlyVisited}
            onChange={(event) => setOnlyVisited(event.target.checked)}
          />
          <span>Only ones I've davened at</span>
        </label>
      </div>

      <p className="il-hint">
        {shuls.length} shuls · {located} pinned on the map.{' '}
        {located < shuls.length &&
          (canEdit
            ? 'Use “Pin” to place the rest by hand, or run the geocode script.'
            : 'The unpinned ones have no coordinates yet.')}
      </p>

      <ul className="il-shul-list">
        {filtered.map((shul) => {
          const count = counts.get(shul.id) ?? 0;
          return (
            <li key={shul.id} className="il-shul">
              <div className="il-shul-main">
                <span className="il-shul-name" dir="rtl">
                  {shul.name_he}
                </span>
                {shul.name_en && <span className="il-shul-en">{shul.name_en}</span>}
                {shul.address_he && (
                  <span className="il-shul-address" dir="rtl">
                    {shul.address_he}
                  </span>
                )}
              </div>

              <div className="il-shul-meta">
                {shul.early_mincha_arvit === true && (
                  <span className="il-badge" title="Mincha ketana near shkia and arvit at tzeit">
                    מנחה קטנה + ערבית
                  </span>
                )}
                {count > 0 && <span className="il-count">{count}</span>}
                {!shul.lat && <span className="il-badge il-badge-muted">no pin</span>}
                {canEdit && (
                  <button
                    type="button"
                    className={`il-btn il-btn-sm ${pinningId === shul.id ? 'is-active' : ''}`}
                    onClick={() => onStartPin(pinningId === shul.id ? null : shul.id)}
                  >
                    {pinningId === shul.id ? 'Cancel' : shul.lat ? 'Re-pin' : 'Pin'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <form className="il-form il-form-inline" onSubmit={submit}>
          <input
            type="text"
            dir="auto"
            className="il-input"
            value={name}
            placeholder="Add a shul — name"
            onChange={(event) => setName(event.target.value)}
          />
          <input
            type="text"
            dir="auto"
            className="il-input"
            value={address}
            placeholder="Address"
            onChange={(event) => setAddress(event.target.value)}
          />
          <button type="submit" className="il-btn il-btn-primary" disabled={busy || !name.trim()}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}
    </div>
  );
}
