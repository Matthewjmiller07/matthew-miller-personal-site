import { useMemo } from 'react';
import type { Minyan, Place, Shabbat, Shul, Visit } from './types';
import { MEAL_LABEL, TEFILLAH_LABEL } from './lib';

interface Props {
  minyanim: Minyan[];
  shabbatot: Shabbat[];
  visits: Visit[];
  shuls: Shul[];
  places: Place[];
}

function topN<T>(counts: Map<T, number>, n: number): [T, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export default function Stats({ minyanim, shabbatot, visits, shuls, places }: Props) {
  const stats = useMemo(() => {
    const shulById = new Map(shuls.map((shul) => [shul.id, shul]));
    const placeByCode = new Map(places.map((place) => [place.code, place]));

    const byShul = new Map<string, number>();
    const byTefillah = new Map<string, number>();
    for (const minyan of minyanim) {
      const label = minyan.shul_id
        ? (shulById.get(minyan.shul_id)?.name_he ?? 'Unknown')
        : (minyan.shul_name ?? 'Unknown');
      byShul.set(label, (byShul.get(label) ?? 0) + 1);
      const tefillah = TEFILLAH_LABEL[minyan.tefillah] ?? minyan.tefillah;
      byTefillah.set(tefillah, (byTefillah.get(tefillah) ?? 0) + 1);
    }

    const byPlace = new Map<string, number>();
    const bump = (code: string | null, name: string | null) => {
      const label = code ? (placeByCode.get(code)?.name_he ?? code) : name;
      if (label) byPlace.set(label, (byPlace.get(label) ?? 0) + 1);
    };
    for (const shabbat of shabbatot) bump(shabbat.place_code, shabbat.place_name);
    for (const visit of visits) bump(visit.place_code, visit.place_name);

    const byMeal = new Map<string, number>();
    for (const shabbat of shabbatot) {
      for (const meal of shabbat.meals) {
        const label = MEAL_LABEL[meal.meal] ?? meal.meal;
        byMeal.set(label, (byMeal.get(label) ?? 0) + 1);
      }
    }

    const hosts = new Map<string, number>();
    for (const shabbat of shabbatot) {
      for (const meal of shabbat.meals) {
        if (meal.host) hosts.set(meal.host, (hosts.get(meal.host) ?? 0) + 1);
      }
    }

    return {
      minyanim: minyanim.length,
      distinctShuls: new Set(
        minyanim.map((minyan) => minyan.shul_id ?? minyan.shul_name).filter(Boolean)
      ).size,
      shabbatot: shabbatot.length,
      away: shabbatot.filter((shabbat) => shabbat.away).length,
      meals: [...byMeal.values()].reduce((sum, n) => sum + n, 0),
      visits: visits.length,
      distinctPlaces: byPlace.size,
      byShul: topN(byShul, 10),
      byTefillah: topN(byTefillah, 7),
      byPlace: topN(byPlace, 10),
      byMeal: topN(byMeal, 6),
      hosts: topN(hosts, 8),
    };
  }, [minyanim, shabbatot, visits, shuls, places]);

  const bar = (rows: [string, number][]) => {
    const max = Math.max(1, ...rows.map(([, count]) => count));
    return (
      <ul className="il-bars">
        {rows.map(([label, count]) => (
          <li key={label}>
            <span className="il-bar-label" dir="auto">
              {label}
            </span>
            <span className="il-bar-track">
              <span className="il-bar-fill" style={{ width: `${(count / max) * 100}%` }} />
            </span>
            <span className="il-bar-count">{count}</span>
          </li>
        ))}
      </ul>
    );
  };

  if (!stats.minyanim && !stats.shabbatot && !stats.visits) {
    return (
      <p className="il-empty">
        Nothing logged yet. Once there are a few minyanim and Shabbatot in here, this is where
        the patterns show up.
      </p>
    );
  }

  return (
    <div className="il-stats">
      <div className="il-tiles">
        <div className="il-tile">
          <strong>{stats.minyanim}</strong>
          <span>minyanim logged</span>
        </div>
        <div className="il-tile">
          <strong>{stats.distinctShuls}</strong>
          <span>different shuls</span>
        </div>
        <div className="il-tile">
          <strong>{stats.shabbatot}</strong>
          <span>Shabbatot ({stats.away} away)</span>
        </div>
        <div className="il-tile">
          <strong>{stats.meals}</strong>
          <span>Shabbat meals</span>
        </div>
        <div className="il-tile">
          <strong>{stats.visits}</strong>
          <span>weekday trips</span>
        </div>
        <div className="il-tile">
          <strong>{stats.distinctPlaces}</strong>
          <span>places around the country</span>
        </div>
      </div>

      <div className="il-stat-grid">
        {stats.byShul.length > 0 && (
          <section>
            <h3>Where I daven</h3>
            {bar(stats.byShul)}
          </section>
        )}
        {stats.byTefillah.length > 0 && (
          <section>
            <h3>Which tefillah</h3>
            {bar(stats.byTefillah)}
          </section>
        )}
        {stats.byPlace.length > 0 && (
          <section>
            <h3>Where we go</h3>
            {bar(stats.byPlace)}
          </section>
        )}
        {stats.byMeal.length > 0 && (
          <section>
            <h3>Which meals out</h3>
            {bar(stats.byMeal)}
          </section>
        )}
        {stats.hosts.length > 0 && (
          <section>
            <h3>Who hosts us</h3>
            {bar(stats.hosts)}
          </section>
        )}
      </div>

      <p className="il-hint">
        Place names come from the Central Bureau of Statistics settlement register — the same
        list the government publishes on data.gov.il.
      </p>
    </div>
  );
}
