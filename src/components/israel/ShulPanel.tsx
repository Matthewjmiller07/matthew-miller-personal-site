import { useMemo, useState } from 'react';
import type { Shul } from './types';
import { matches } from './lib';
import type { GeocodeHit } from './api';

interface Props {
  shuls: Shul[];
  counts: Map<string, number>;
  canEdit: boolean;
  pinningId: string | null;
  onStartPin: (shulId: string | null) => void;
  onAddShul: (record: { name_he: string; address_he: string | null }) => Promise<Shul>;
  onSearchAddress: (query: string) => Promise<GeocodeHit[]>;
  onPlaceShul: (shulId: string, lat: number, lng: number) => Promise<void>;
}

/** Inline address search for one shul row — types an address, picks a match, done. */
function GeocodeSearch({
  shul,
  onSearchAddress,
  onPlaceShul,
  onClose,
}: {
  shul: Shul;
  onSearchAddress: Props['onSearchAddress'];
  onPlaceShul: Props['onPlaceShul'];
  onClose: () => void;
}) {
  const [query, setQuery] = useState(
    [shul.address_he, shul.city].filter(Boolean).join(', ') || shul.name_he
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeocodeHit[] | null>(null);
  const [placing, setPlacing] = useState(false);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const hits = await onSearchAddress(query.trim());
      setResults(hits);
      if (!hits.length) setError('No matches — try a shorter or different address.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  };

  const place = async (hit: GeocodeHit) => {
    setPlacing(true);
    try {
      await onPlaceShul(shul.id, hit.lat, hit.lng);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that pin.');
      setPlacing(false);
    }
  };

  return (
    <div className="il-geocode">
      <form className="il-geocode-form" onSubmit={search}>
        <input
          type="text"
          dir="auto"
          className="il-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Street address"
          autoFocus
        />
        <button type="submit" className="il-btn il-btn-sm" disabled={busy || !query.trim()}>
          {busy ? 'Searching…' : 'Find'}
        </button>
        <button type="button" className="il-btn il-btn-sm" onClick={onClose}>
          Cancel
        </button>
      </form>

      {error && <p className="il-error">{error}</p>}

      {results && results.length > 0 && (
        <ul className="il-geocode-results">
          {results.map((hit, index) => (
            <li key={`${hit.lat}-${hit.lng}-${index}`}>
              <button
                type="button"
                className="il-geocode-result"
                disabled={placing}
                onClick={() => place(hit)}
              >
                {hit.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ShulPanel({
  shuls,
  counts,
  canEdit,
  pinningId,
  onStartPin,
  onAddShul,
  onSearchAddress,
  onPlaceShul,
}: Props) {
  const [query, setQuery] = useState('');
  const [onlyEarly, setOnlyEarly] = useState(false);
  const [onlyVisited, setOnlyVisited] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchingId, setSearchingId] = useState<string | null>(null);

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
      const created = await onAddShul({
        name_he: name.trim(),
        address_he: address.trim() || null,
      });
      setName('');
      setAddress('');
      // A shul with no pin is only half-added — open the address search on it
      // immediately rather than leaving it to be discovered later as "no pin".
      // Clear anything that could filter the new row out of view first.
      if (created?.id) {
        setQuery('');
        setOnlyEarly(false);
        setOnlyVisited(false);
        setSearchingId(created.id);
      }
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
            ? 'Use “Find” to search its address, or “Pin” to place it by hand on the map.'
            : 'The unpinned ones have no coordinates yet.')}
      </p>

      <ul className="il-shul-list">
        {filtered.map((shul) => {
          const count = counts.get(shul.id) ?? 0;
          const searching = searchingId === shul.id;
          return (
            <li key={shul.id} className="il-shul">
              <div className="il-shul-row">
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
                    <>
                      <button
                        type="button"
                        className={`il-btn il-btn-sm ${searching ? 'is-active' : ''}`}
                        onClick={() => {
                          setSearchingId(searching ? null : shul.id);
                          if (!searching) onStartPin(null);
                        }}
                      >
                        {searching ? 'Cancel' : 'Find'}
                      </button>
                      <button
                        type="button"
                        className={`il-btn il-btn-sm ${pinningId === shul.id ? 'is-active' : ''}`}
                        onClick={() => {
                          onStartPin(pinningId === shul.id ? null : shul.id);
                          if (searching) setSearchingId(null);
                        }}
                      >
                        {pinningId === shul.id ? 'Cancel' : shul.lat ? 'Re-pin' : 'Pin'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {searching && (
                <GeocodeSearch
                  shul={shul}
                  onSearchAddress={onSearchAddress}
                  onPlaceShul={onPlaceShul}
                  onClose={() => setSearchingId(null)}
                />
              )}
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
