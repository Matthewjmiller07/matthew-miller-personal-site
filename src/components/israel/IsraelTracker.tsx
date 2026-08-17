import { useCallback, useEffect, useMemo, useState } from 'react';
import IsraelMap from './IsraelMap';
import MinyanForm from './MinyanForm';
import ShabbatForm from './ShabbatForm';
import VisitForm from './VisitForm';
import ShulPanel from './ShulPanel';
import Stats from './Stats';
import { db, geocodeSearch, loadEverything, loadReference, write } from './api';
import type { Minyan, Person, Place, Shabbat, ShabbatMeal, Shul, Visit } from './types';
import { MEAL_LABEL, TEFILLAH_LABEL, describeAttendees, formatDate, formatTime } from './lib';

interface Props {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

type Tab = 'map' | 'minyanim' | 'shabbat' | 'visits' | 'shuls' | 'stats';

const TABS: { key: Tab; label: string }[] = [
  { key: 'map', label: 'Map' },
  { key: 'minyanim', label: 'Minyanim' },
  { key: 'shabbat', label: 'Shabbat' },
  { key: 'visits', label: 'Out & about' },
  { key: 'shuls', label: 'Shuls' },
  { key: 'stats', label: 'Patterns' },
];

const PASSCODE_KEY = 'israel-tracker-key';

export default function IsraelTracker({ supabaseUrl, supabaseAnonKey }: Props) {
  const [tab, setTab] = useState<Tab>('map');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [regions, setRegions] = useState<GeoJSON.FeatureCollection | null>(null);
  const [shuls, setShuls] = useState<Shul[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [minyanim, setMinyanim] = useState<Minyan[]>([]);
  const [shabbatot, setShabbatot] = useState<Shabbat[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const [passcode, setPasscode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [editingMinyan, setEditingMinyan] = useState<Minyan | null>(null);
  const [editingShabbat, setEditingShabbat] = useState<Shabbat | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [pinningShul, setPinningShul] = useState<string | null>(null);
  const [showRegions, setShowRegions] = useState(true);
  const [showShuls, setShowShuls] = useState(true);

  const supabase = useMemo(
    () => db(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );

  const refresh = useCallback(async () => {
    const data = await loadEverything(supabase);
    setShuls(data.shuls);
    setPeople(data.people);
    setMinyanim(data.minyanim);
    setShabbatot(data.shabbatot);
    setVisits(data.visits);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      try {
        const [reference] = await Promise.all([loadReference(), refresh()]);
        setPlaces(reference.places);
        setRegions(reference.regions);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not load the tracker.');
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  // A passcode kept from last time means the forms are there when you open the page
  // on your phone, without another round trip through the keyboard.
  useEffect(() => {
    const stored = localStorage.getItem(PASSCODE_KEY);
    if (!stored) return;
    setPasscode(stored);
    void write(stored, { action: 'unlock' })
      .then(() => setUnlocked(true))
      .catch(() => localStorage.removeItem(PASSCODE_KEY));
  }, []);

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setUnlockError(null);
    try {
      await write(passcode, { action: 'unlock' });
      localStorage.setItem(PASSCODE_KEY, passcode);
      setUnlocked(true);
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'Could not check that passcode.');
    }
  };

  /* Counts feeding the map and the lists ----------------------------------- */

  const shulCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const minyan of minyanim) {
      if (minyan.shul_id) counts.set(minyan.shul_id, (counts.get(minyan.shul_id) ?? 0) + 1);
    }
    return counts;
  }, [minyanim]);

  /** Everything that happened in a town — minyanim, Shabbatot, meals and trips. */
  const placeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (code: string | null | undefined) => {
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    };
    for (const minyan of minyanim) bump(minyan.place_code);
    for (const shabbat of shabbatot) {
      bump(shabbat.place_code);
      for (const meal of shabbat.meals) {
        if (meal.place_code && meal.place_code !== shabbat.place_code) bump(meal.place_code);
      }
    }
    for (const visit of visits) bump(visit.place_code);
    return counts;
  }, [minyanim, shabbatot, visits]);

  const shulById = useMemo(() => new Map(shuls.map((shul) => [shul.id, shul])), [shuls]);
  const placeByCode = useMemo(() => new Map(places.map((place) => [place.code, place])), [places]);

  const placeLabelFor = (code: string | null, fallback: string | null) => {
    if (code) {
      const place = placeByCode.get(code);
      if (place) return place.name_he;
    }
    return fallback ?? '—';
  };

  /* Writes ------------------------------------------------------------------ */

  const saveMinyan = async (record: Partial<Minyan>) => {
    await write(passcode, { action: 'save-minyan', record });
    await refresh();
    setEditingMinyan(null);
  };

  const saveShabbat = async (shabbat: Partial<Shabbat>, meals: ShabbatMeal[]) => {
    await write(passcode, { action: 'save-shabbat', shabbat, meals });
    await refresh();
    setEditingShabbat(null);
  };

  const saveVisit = async (record: Partial<Visit>) => {
    await write(passcode, { action: 'save-visit', record });
    await refresh();
    setEditingVisit(null);
  };

  const remove = async (kind: 'minyan' | 'shabbat' | 'visit', id: string) => {
    if (!confirm('Delete this entry?')) return;
    await write(passcode, { action: 'delete', kind, id });
    await refresh();
  };

  const addPerson = async (name: string) => {
    await write(passcode, { action: 'save-person', record: { name } });
    await refresh();
  };

  const addShul = async (record: { name_he: string; address_he: string | null }) => {
    await write(passcode, { action: 'save-shul', record });
    await refresh();
  };

  const placeShul = async (shulId: string, lat: number, lng: number) => {
    await write(passcode, { action: 'save-shul', record: { id: shulId, lat, lng } });
    await refresh();
  };

  const pinShul = async (lat: number, lng: number) => {
    if (!pinningShul) return;
    await placeShul(pinningShul, lat, lng);
    setPinningShul(null);
  };

  const searchShulAddress = (query: string) => geocodeSearch(passcode, query, { bounded: true });

  /* ------------------------------------------------------------------------- */

  if (loading) return <p className="il-empty">Loading the country…</p>;
  if (loadError) return <p className="il-error">{loadError}</p>;

  const locked = !unlocked;

  return (
    <div className="il">
      <nav className="il-tabs" aria-label="Sections">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`il-tab ${tab === entry.key ? 'is-active' : ''}`}
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      {locked && (
        <form className="il-unlock" onSubmit={unlock}>
          <label htmlFor="il-passcode">Passcode to add entries</label>
          <input
            id="il-passcode"
            type="password"
            className="il-input"
            value={passcode}
            autoComplete="current-password"
            onChange={(event) => setPasscode(event.target.value)}
          />
          <button type="submit" className="il-btn il-btn-primary">
            Unlock
          </button>
          {unlockError && <span className="il-error">{unlockError}</span>}
        </form>
      )}

      {tab === 'map' && (
        <section className="il-section">
          <div className="il-toolbar">
            <label className="il-toggle">
              <input
                type="checkbox"
                checked={showRegions}
                onChange={(event) => setShowRegions(event.target.checked)}
              />
              <span>Sub-district areas</span>
            </label>
            <label className="il-toggle">
              <input
                type="checkbox"
                checked={showShuls}
                onChange={(event) => setShowShuls(event.target.checked)}
              />
              <span>Shuls</span>
            </label>
          </div>

          <IsraelMap
            places={places}
            regions={regions}
            shuls={shuls}
            placeCounts={placeCounts}
            shulCounts={shulCounts}
            pinning={Boolean(pinningShul)}
            onPin={pinShul}
            showRegions={showRegions}
            showShuls={showShuls}
          />

          <ul className="il-legend">
            <li>
              <span className="il-key il-key-place" /> a town we've been to — bigger means more
              often
            </li>
            <li>
              <span className="il-key il-key-shul" /> a shul I've davened at
            </li>
            <li>
              <span className="il-key il-key-shul-off" /> a shul on the list, not yet
            </li>
            <li>
              <span className="il-key il-key-region" /> sub-district, shaded by how much we've
              logged there
            </li>
          </ul>
        </section>
      )}

      {tab === 'minyanim' && (
        <section className="il-section">
          {!locked && (
            <MinyanForm
              shuls={shuls}
              places={places}
              people={people}
              editing={editingMinyan}
              onSave={saveMinyan}
              onCancel={() => setEditingMinyan(null)}
              onAddPerson={addPerson}
            />
          )}

          <h2 className="il-h2">Recent minyanim</h2>
          {minyanim.length === 0 ? (
            <p className="il-empty">No minyanim logged yet.</p>
          ) : (
            <ul className="il-log">
              {minyanim.slice(0, 100).map((minyan) => (
                <li key={minyan.id} className="il-log-row">
                  <div className="il-log-main">
                    <span className="il-log-date">{formatDate(minyan.date)}</span>
                    <span className="il-log-title" dir="auto">
                      {minyan.shul_id
                        ? (shulById.get(minyan.shul_id)?.name_he ?? 'Unknown shul')
                        : minyan.shul_name}
                    </span>
                    <span className="il-log-tag">{TEFILLAH_LABEL[minyan.tefillah]}</span>
                    {minyan.minyan_time && (
                      <span className="il-log-time">{formatTime(minyan.minyan_time)}</span>
                    )}
                  </div>
                  <div className="il-log-meta">
                    <span>{describeAttendees(minyan.attendees, people)}</span>
                    {minyan.notes && (
                      <span className="il-log-notes" dir="auto">
                        {minyan.notes}
                      </span>
                    )}
                    {!locked && (
                      <span className="il-log-actions">
                        <button
                          type="button"
                          className="il-link"
                          onClick={() => {
                            setEditingMinyan(minyan);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="il-link il-link-danger"
                          onClick={() => remove('minyan', minyan.id)}
                        >
                          Delete
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'shabbat' && (
        <section className="il-section">
          {!locked && (
            <ShabbatForm
              key={editingShabbat?.id ?? 'new'}
              places={places}
              people={people}
              editing={editingShabbat}
              onSave={saveShabbat}
              onCancel={() => setEditingShabbat(null)}
              onAddPerson={addPerson}
            />
          )}

          <h2 className="il-h2">Shabbatot</h2>
          {shabbatot.length === 0 ? (
            <p className="il-empty">No Shabbatot logged yet.</p>
          ) : (
            <ul className="il-log">
              {shabbatot.map((shabbat) => (
                <li key={shabbat.id} className="il-log-row">
                  <div className="il-log-main">
                    <span className="il-log-date">{formatDate(shabbat.shabbat_date)}</span>
                    {shabbat.parasha && (
                      <span className="il-log-title" dir="auto">
                        {shabbat.parasha}
                      </span>
                    )}
                    <span className="il-log-tag" dir="auto">
                      {placeLabelFor(shabbat.place_code, shabbat.place_name)}
                    </span>
                    {shabbat.away && <span className="il-log-tag">away</span>}
                  </div>

                  {shabbat.meals.length > 0 && (
                    <ul className="il-meal-list">
                      {shabbat.meals.map((meal) => (
                        <li key={meal.id ?? meal.meal}>
                          <strong>{MEAL_LABEL[meal.meal]}</strong>
                          {meal.host && <span dir="auto"> · {meal.host}</span>}
                          {meal.place_code && meal.place_code !== shabbat.place_code && (
                            <span dir="auto"> · {placeLabelFor(meal.place_code, null)}</span>
                          )}
                          <span className="il-log-notes">
                            {describeAttendees(meal.attendees, people)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="il-log-meta">
                    {shabbat.notes && (
                      <span className="il-log-notes" dir="auto">
                        {shabbat.notes}
                      </span>
                    )}
                    {!locked && (
                      <span className="il-log-actions">
                        <button
                          type="button"
                          className="il-link"
                          onClick={() => {
                            setEditingShabbat(shabbat);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="il-link il-link-danger"
                          onClick={() => remove('shabbat', shabbat.id)}
                        >
                          Delete
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'visits' && (
        <section className="il-section">
          {!locked && (
            <VisitForm
              key={editingVisit?.id ?? 'new'}
              places={places}
              people={people}
              editing={editingVisit}
              onSave={saveVisit}
              onCancel={() => setEditingVisit(null)}
              onAddPerson={addPerson}
            />
          )}

          <h2 className="il-h2">Where we've been</h2>
          {visits.length === 0 ? (
            <p className="il-empty">Nothing logged yet.</p>
          ) : (
            <ul className="il-log">
              {visits.map((visit) => (
                <li key={visit.id} className="il-log-row">
                  <div className="il-log-main">
                    <span className="il-log-date">{formatDate(visit.date)}</span>
                    <span className="il-log-title" dir="auto">
                      {placeLabelFor(visit.place_code, visit.place_name)}
                    </span>
                    {visit.category && <span className="il-log-tag">{visit.category}</span>}
                  </div>
                  <div className="il-log-meta">
                    {visit.title && (
                      <span dir="auto" className="il-log-notes">
                        {visit.title}
                      </span>
                    )}
                    <span>{describeAttendees(visit.attendees, people)}</span>
                    {!locked && (
                      <span className="il-log-actions">
                        <button
                          type="button"
                          className="il-link"
                          onClick={() => {
                            setEditingVisit(visit);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="il-link il-link-danger"
                          onClick={() => remove('visit', visit.id)}
                        >
                          Delete
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'shuls' && (
        <section className="il-section">
          <ShulPanel
            shuls={shuls}
            counts={shulCounts}
            canEdit={!locked}
            pinningId={pinningShul}
            onStartPin={(id) => {
              setPinningShul(id);
              if (id) setTab('map');
            }}
            onAddShul={addShul}
            onSearchAddress={searchShulAddress}
            onPlaceShul={placeShul}
          />
        </section>
      )}

      {tab === 'stats' && (
        <section className="il-section">
          <Stats
            minyanim={minyanim}
            shabbatot={shabbatot}
            visits={visits}
            shuls={shuls}
            places={places}
          />
        </section>
      )}

      <p className="il-footnote">
        {places.length.toLocaleString()} settlements and{' '}
        {regions?.features.filter((f) => f.properties?.level === 'subdistrict').length ?? 0}{' '}
        sub-districts from Israeli open government data ·{' '}
        {places.filter((place) => place.lat).length.toLocaleString()} of them located. {shuls.length}{' '}
        shuls on the Ra'anana list.
      </p>
    </div>
  );
}
