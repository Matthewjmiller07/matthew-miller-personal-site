import React, { useEffect, useMemo, useRef, useState } from 'react';

type LatLng = {
  lat: number;
  lng: number;
};

type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type House = {
  id: string;
  address: string;
  city?: string;
  state?: string;
  zipcode?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  zestimate?: number;
  rentEstimate?: number;
  bedrooms?: number;
  bathrooms?: number;
  image?: string;
  source?: string;
};

type Place = {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  types?: string[];
  rating?: number;
  userRatingsTotal?: number;
  photoUrl?: string;
};

type Dataset = {
  areaName: string;
  houses: House[];
  places: Place[];
};

type PropertyCard = {
  id: string;
  type: 'property';
  name: string;
  category: string;
  moneyValue: number;
  cost: number;
  rent: number[];
  setSize: number;
  description: string;
};

type MoneyCard = {
  id: string;
  type: 'money';
  name: string;
  value: number;
  moneyValue: number;
  description: string;
};

type ActionKind = 'money' | 'rent' | 'doubleRent' | 'stealProperty' | 'debt' | 'house' | 'hotel' | 'block';

type ActionCard = {
  id: string;
  type: 'action';
  name: string;
  kind: ActionKind;
  value: number;
  text: string;
  moneyValue: number;
};

type Card = PropertyCard | MoneyCard | ActionCard;

type Player = {
  id: string;
  name: string;
  hand: Card[];
  bank: Card[];
  board: Record<string, Card[]>;
  actionsUsed: number;
  hasDrawnThisTurn: boolean;
};

type CategorySummary = {
  category: string;
  count: number;
  setSize: number;
};

type GameState = {
  title: string;
  areaName: string;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discard: Card[];
  log: string[];
  initialDeckSize: number;
  propertyCount: number;
  categories: CategorySummary[];
  homesLoaded: number;
  placesLoaded: number;
};

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_MAPS_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) ||
  '';

const BACKEND_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PUBLIC_LOCAL_MONOPOLY_BACKEND) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_LOCAL_MONOPOLY_BACKEND) ||
  '';

const COLORS: Record<string, string> = {
  Homes: 'bg-emerald-100 border-emerald-400 text-emerald-900',
  Food: 'bg-amber-100 border-amber-400 text-amber-900',
  Coffee: 'bg-orange-100 border-orange-400 text-orange-900',
  Parks: 'bg-lime-100 border-lime-400 text-lime-900',
  Schools: 'bg-sky-100 border-sky-400 text-sky-900',
  Shopping: 'bg-violet-100 border-violet-400 text-violet-900',
  Fun: 'bg-rose-100 border-rose-400 text-rose-900',
  Transit: 'bg-slate-100 border-slate-400 text-slate-900',
  Civic: 'bg-indigo-100 border-indigo-400 text-indigo-900',
  Wild: 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900',
};

const PLACE_TYPE_GROUPS = [
  { label: 'Food', types: ['restaurant', 'meal_takeaway', 'bakery'], setSize: 3 },
  { label: 'Coffee', types: ['cafe'], setSize: 2 },
  { label: 'Parks', types: ['park'], setSize: 2 },
  { label: 'Schools', types: ['school', 'library'], setSize: 2 },
  { label: 'Shopping', types: ['shopping_mall', 'store', 'book_store'], setSize: 3 },
  { label: 'Fun', types: ['movie_theater', 'tourist_attraction', 'museum'], setSize: 2 },
  { label: 'Transit', types: ['subway_station', 'train_station', 'bus_station'], setSize: 2 },
  { label: 'Civic', types: ['city_hall', 'courthouse', 'post_office'], setSize: 2 },
] as const;

const ACTION_DEFS = [
  { name: 'Collect Local Buzz', kind: 'money', value: 3, text: 'Collect 3M from the bank.' },
  { name: 'Weekend Rush', kind: 'money', value: 2, text: 'Collect 2M from the bank.' },
  { name: 'Rent Event', kind: 'rent', value: 0, text: 'Charge rent on one completed or partial set.' },
  { name: 'Street Festival', kind: 'doubleRent', value: 0, text: 'Double the next rent you charge this turn.' },
  { name: 'Permit Problem', kind: 'stealProperty', value: 0, text: 'Steal one place from another player.' },
  { name: 'Parking Meter', kind: 'debt', value: 2, text: 'Target player pays you 2M.' },
  { name: 'City Grant', kind: 'house', value: 3, text: 'Attach to a full set to increase rent by 3.' },
  { name: 'Historic Landmark', kind: 'hotel', value: 4, text: 'Attach to a full set with a City Grant to increase rent by 4.' },
  { name: 'Not Today', kind: 'block', value: 4, text: 'Cancel an action against you.' },
] as const;

const SAMPLE_DATASET: Dataset = {
  areaName: 'Rogers Park Demo Board',
  houses: [
    { id: 'h1', address: '1500 W Morse Ave', city: 'Chicago', state: 'IL', latitude: 42.008, longitude: -87.668, price: 325000 },
    { id: 'h2', address: '1324 W Greenleaf Ave', city: 'Chicago', state: 'IL', latitude: 42.0105, longitude: -87.664, price: 410000 },
    { id: 'h3', address: '1730 W Lunt Ave', city: 'Chicago', state: 'IL', latitude: 42.0094, longitude: -87.671, price: 550000 },
    { id: 'h4', address: '1021 W Pratt Blvd', city: 'Chicago', state: 'IL', latitude: 42.0057, longitude: -87.655, price: 285000 },
    { id: 'h5', address: '7018 N Glenwood Ave', city: 'Chicago', state: 'IL', latitude: 42.0102, longitude: -87.666, price: 615000 },
    { id: 'h6', address: '1634 W Touhy Ave', city: 'Chicago', state: 'IL', latitude: 42.0123, longitude: -87.6718, price: 470000 },
  ],
  places: [
    { id: 'p1', name: 'Morse Fresh Market', address: 'Morse Ave', latitude: 42.0078, longitude: -87.6671, types: ['store'], rating: 4.3 },
    { id: 'p2', name: 'Common Cup', address: '1501 W Morse Ave', latitude: 42.0079, longitude: -87.6682, types: ['cafe'], rating: 4.6 },
    { id: 'p3', name: 'Lifeline Theatre', address: '6912 N Glenwood Ave', latitude: 42.0089, longitude: -87.6662, types: ['tourist_attraction'], rating: 4.8 },
    { id: 'p4', name: 'Pottawattomie Park', address: '7340 N Rogers Ave', latitude: 42.0154, longitude: -87.6722, types: ['park'], rating: 4.5 },
    { id: 'p5', name: 'Rogers Park Library', address: '6907 N Clark St', latitude: 42.0082, longitude: -87.6733, types: ['library'], rating: 4.5 },
    { id: 'p6', name: 'The New 400', address: '6746 N Sheridan Rd', latitude: 42.0051, longitude: -87.6542, types: ['movie_theater'], rating: 4.4 },
    { id: 'p7', name: 'Le Piano', address: '6970 N Glenwood Ave', latitude: 42.0095, longitude: -87.6663, types: ['restaurant'], rating: 4.7 },
    { id: 'p8', name: 'R Public House', address: '1508 W Jarvis Ave', latitude: 42.0159, longitude: -87.668, types: ['restaurant'], rating: 4.6 },
    { id: 'p9', name: 'Jarvis Square Station', address: 'Jarvis Ave', latitude: 42.0153, longitude: -87.6695, types: ['train_station'], rating: 4.0 },
    { id: 'p10', name: 'Target Loyola', address: '1233 W Loyola Ave', latitude: 42.0016, longitude: -87.6607, types: ['shopping_mall'], rating: 4.2 },
    { id: 'p11', name: 'Heartland Cafe Annex', address: 'Glenwood Ave', latitude: 42.0087, longitude: -87.6654, types: ['cafe'], rating: 4.1 },
    { id: 'p12', name: 'Touhy Park', address: '7348 N Paulina St', latitude: 42.0121, longitude: -87.6711, types: ['park'], rating: 4.1 },
  ],
};

function slugify(text: string) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function drawCards(deck: Card[], count: number) {
  return {
    drawn: deck.slice(0, count),
    remainder: deck.slice(count),
  };
}

function deepClonePlayers(players: Player[]) {
  return players.map((player) => ({
    ...player,
    hand: [...player.hand],
    bank: [...player.bank],
    board: Object.fromEntries(Object.entries(player.board).map(([k, v]) => [k, [...v]])),
  }));
}

function sumMoney(cards: Card[]) {
  return cards.reduce((sum, card) => sum + (card.moneyValue || 0), 0);
}

function boardSetEntries(board: Record<string, Card[]>) {
  return Object.entries(board).filter(([, cards]) => cards.length > 0);
}

function getSetRent(setCards: Card[]) {
  if (!setCards.length) return 0;
  const propertyCards = setCards.filter((c): c is PropertyCard => c.type === 'property');
  const bonusCards = setCards.filter((c) => c.type === 'action' && (c.kind === 'house' || c.kind === 'hotel'));
  if (!propertyCards.length) return 0;
  const rentIndex = Math.min(propertyCards.length, propertyCards[0].rent.length) - 1;
  let rent = propertyCards[0].rent[rentIndex] || 0;
  for (const bonus of bonusCards) {
    rent += bonus.value || 0;
  }
  return rent;
}

function fullSetsCount(player: Player) {
  return boardSetEntries(player.board).filter(([, cards]) => {
    const propertyCards = cards.filter((c): c is PropertyCard => c.type === 'property');
    return propertyCards.length > 0 && propertyCards.length >= propertyCards[0].setSize;
  }).length;
}

function normalizePrice(price: number | undefined) {
  const numeric = Number(price || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 2;
  if (numeric < 200000) return 2;
  if (numeric < 350000) return 3;
  if (numeric < 550000) return 4;
  if (numeric < 850000) return 5;
  if (numeric < 1200000) return 6;
  return 7;
}

function rentScaleFromPrice(price: number | undefined, setSize: number) {
  const base = normalizePrice(price);
  if (setSize <= 2) return [Math.max(1, base - 1), base + 1];
  if (setSize === 3) return [Math.max(1, base - 2), Math.max(2, base - 1), base + 1];
  return [Math.max(1, base - 2), Math.max(2, base - 1), base, base + 1];
}

function detectCategoryFromTypes(types: string[]) {
  const typeSet = new Set(types || []);
  for (const group of PLACE_TYPE_GROUPS) {
    if (group.types.some((t) => typeSet.has(t))) return group.label;
  }
  return 'Wild';
}

function formatCurrency(value: number | undefined) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function buildDeckFromGeneratedData(dataset: Dataset) {
  const propertyCards: PropertyCard[] = [];
  const categoryBuckets = new Map<string, Array<{ kind: 'home' | 'place'; id: string; name: string; category: string; source: string; price: number; subtitle: string; rating?: number }>>();

  const homes = (dataset.houses || []).slice(0, 8).map((home, index) => ({
    kind: 'home' as const,
    id: home.id || `home-${index}`,
    name: home.address || `House ${index + 1}`,
    category: 'Homes',
    source: home.source || 'housing',
    price: home.price || home.zestimate || 0,
    subtitle: [home.city, home.state].filter(Boolean).join(', '),
  }));

  const places = (dataset.places || []).slice(0, 18).map((place, index) => ({
    kind: 'place' as const,
    id: place.id || `place-${index}`,
    name: place.name,
    category: detectCategoryFromTypes(place.types || []),
    source: 'google_maps',
    price: 0,
    subtitle: place.address || '',
    rating: place.rating,
  }));

  const allLocations = [...homes, ...places].filter((item) => item.name && item.category);

  for (const item of allLocations) {
    if (!categoryBuckets.has(item.category)) categoryBuckets.set(item.category, []);
    categoryBuckets.get(item.category)?.push(item);
  }

  const normalizedGroups: Array<{ category: string; setSize: number; items: typeof allLocations }> = [];
  for (const [category, items] of categoryBuckets.entries()) {
    const desiredSetSize = category === 'Homes' ? 3 : PLACE_TYPE_GROUPS.find((g) => g.label === category)?.setSize || 2;
    const takeCount = Math.max(desiredSetSize, Math.min(items.length, desiredSetSize * 2));
    const selected = items.slice(0, takeCount);
    if (selected.length >= 2) {
      normalizedGroups.push({ category, setSize: desiredSetSize, items: selected });
    }
  }

  for (const group of normalizedGroups) {
    for (const item of group.items) {
      propertyCards.push({
        id: `${slugify(group.category)}-${slugify(item.name)}-${item.id}`,
        type: 'property',
        name: item.name,
        category: group.category,
        moneyValue: normalizePrice(item.price || 250000),
        cost: normalizePrice(item.price || 250000),
        rent: rentScaleFromPrice(item.price || 250000, group.setSize),
        setSize: group.setSize,
        description:
          item.kind === 'home'
            ? `${item.subtitle || 'Local home'}${item.price ? ` • ${formatCurrency(item.price)}` : ''}`
            : `${item.subtitle || 'Local place'}${item.rating ? ` • ${item.rating}★` : ''}`,
      });
    }
  }

  const deck: Card[] = [...propertyCards];

  ACTION_DEFS.forEach((def, index) => {
    const copies = def.kind === 'block' ? 3 : def.kind === 'rent' ? 4 : 2;
    for (let i = 0; i < copies; i += 1) {
      deck.push({
        id: `action-${slugify(def.name)}-${index}-${i}`,
        type: 'action',
        ...def,
        moneyValue: def.value || 1,
      });
    }
  });

  for (let i = 0; i < 14; i += 1) {
    const value = [1, 1, 2, 2, 3, 3, 4, 5][i % 8];
    deck.push({
      id: `money-${i}`,
      type: 'money',
      name: `${value}M`,
      value,
      moneyValue: value,
      description: `Bank this for ${value}M.`,
    });
  }

  return {
    deck: shuffle(deck),
    propertyCount: propertyCards.length,
    categories: normalizedGroups.map((g) => ({ category: g.category, count: g.items.length, setSize: g.setSize })),
  };
}

function loadGoogleMaps(apiKey: string) {
  if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key.'));
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable.'));
  if (window.google && window.google.maps) return Promise.resolve(window.google);

  return new Promise<any>((resolve, reject) => {
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps.')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps.'));
    document.head.appendChild(script);
  });
}

async function geocodeLocation(apiKey: string, query: string) {
  const encoded = encodeURIComponent(query);
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`);
  const data = await res.json();
  if (!data.results || !data.results.length) {
    throw new Error('Could not geocode that location.');
  }
  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    location: result.geometry.location as LatLng,
    bounds: result.geometry.bounds || result.geometry.viewport,
    placeId: result.place_id,
  };
}

async function fetchGeneratedDataset({
  locationQuery,
  center,
  bounds,
  selectedTypes,
}: {
  locationQuery: string;
  center: LatLng;
  bounds?: Bounds;
  selectedTypes: string[];
}) {
  const url = `${BACKEND_BASE || ''}/api/local-monopoly/generate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationQuery,
      center,
      bounds,
      placeTypes: selectedTypes,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to generate local dataset.');
  }
  return res.json() as Promise<Dataset>;
}

function createPlayers(playerNames: string[]) {
  return playerNames.map((name, idx) => ({
    id: `player-${idx}`,
    name,
    hand: [],
    bank: [],
    board: {},
    actionsUsed: 0,
    hasDrawnThisTurn: false,
  }));
}

function AppCard({ card, compact = false }: { card: Card; compact?: boolean }) {
  const tone = 'category' in card && card.category ? COLORS[card.category] || COLORS.Wild : COLORS.Wild;
  return (
    <div className={`w-full rounded-2xl border-2 p-3 text-left shadow-sm ${tone} ${compact ? 'min-h-[110px]' : 'min-h-[150px]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{card.type}</div>
          <div className="text-sm font-bold leading-tight">{card.name}</div>
        </div>
        <div className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold">
          {card.type === 'money' ? `${card.value}M` : `${card.moneyValue || 0}M`}
        </div>
      </div>
      <div className="mt-2 text-xs opacity-80">{'description' in card ? card.description || '' : ''}</div>
      {card.type === 'property' && (
        <div className="mt-3 text-xs">
          <div>Set: {card.category}</div>
          <div>Rent: {card.rent.join(' / ')}</div>
          <div>Complete at: {card.setSize}</div>
        </div>
      )}
      {card.type === 'action' && <div className="mt-3 text-xs">Effect: {card.text}</div>}
    </div>
  );
}

function LocationMap({ center, dataset }: { center: LatLng | null; dataset: Dataset | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || !center || !GOOGLE_MAPS_KEY) return;
      const google = await loadGoogleMaps(GOOGLE_MAPS_KEY);
      if (cancelled) return;

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
      } else {
        mapRef.current.setCenter(center);
      }

      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];

      const houses = dataset?.houses || [];
      const places = dataset?.places || [];

      for (const home of houses) {
        if (typeof home.latitude === 'number' && typeof home.longitude === 'number') {
          markerRefs.current.push(
            new google.maps.Marker({
              position: { lat: home.latitude, lng: home.longitude },
              map: mapRef.current,
              title: `${home.address}${home.price ? ` • ${formatCurrency(home.price)}` : ''}`,
            })
          );
        }
      }

      for (const place of places) {
        markerRefs.current.push(
          new google.maps.Marker({
            position: { lat: place.latitude, lng: place.longitude },
            map: mapRef.current,
            title: place.name,
          })
        );
      }
    }

    init().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [center, dataset]);

  if (!GOOGLE_MAPS_KEY) {
    return <div className="flex h-[360px] items-center justify-center rounded-3xl border bg-slate-50 text-sm text-slate-500">Add a Google Maps API key to enable the live map.</div>;
  }

  return <div ref={containerRef} className="h-[360px] w-full rounded-3xl border" />;
}

function SetupScreen({
  locationQuery,
  setLocationQuery,
  playerNames,
  setPlayerNames,
  selectedGroups,
  setSelectedGroups,
  onGenerate,
  onUseDemo,
  loading,
  error,
  dataset,
  mapCenter,
}: {
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  playerNames: string[];
  setPlayerNames: (value: string[]) => void;
  selectedGroups: string[];
  setSelectedGroups: React.Dispatch<React.SetStateAction<string[]>>;
  onGenerate: () => Promise<void>;
  onUseDemo: () => void;
  loading: boolean;
  error: string;
  dataset: Dataset | null;
  mapCenter: LatLng | null;
}) {
  const availableGroups = PLACE_TYPE_GROUPS.map((g) => g.label);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Localopoly Builder</h1>
        <p className="mt-2 max-w-4xl text-slate-600">
          Build a local card game from a real neighborhood or launch a demo board instantly. We can iterate on mechanics,
          balancing, naming, and polish once the first playable loop feels good.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">1. Enter location</h2>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Example: Rogers Park, Chicago, IL"
                className="flex-1 rounded-2xl border p-3 outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                type="button"
                onClick={onGenerate}
                disabled={loading || !locationQuery.trim()}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? 'Generating...' : 'Generate local board'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={onUseDemo} className="rounded-2xl border px-4 py-2 text-sm font-semibold text-slate-700">
                Use demo board
              </button>
              <p className="text-xs text-slate-500">
                Demo mode works without Maps or a backend so we can test mechanics immediately.
              </p>
            </div>
            {error && <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">2. Choose place categories</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {availableGroups.map((group) => {
                const active = selectedGroups.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => {
                      setSelectedGroups((prev) =>
                        prev.includes(group) ? prev.filter((x) => x !== group) : [...prev, group]
                      );
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">3. Players</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {playerNames.map((name, idx) => (
                <input
                  key={idx}
                  value={name}
                  onChange={(e) => {
                    const next = [...playerNames];
                    next[idx] = e.target.value;
                    setPlayerNames(next);
                  }}
                  className="rounded-2xl border p-3 outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder={`Player ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {dataset && (
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Generated data preview</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold">Homes</div>
                  <div className="mt-2 max-h-60 space-y-2 overflow-auto text-sm">
                    {(dataset.houses || []).slice(0, 8).map((home) => (
                      <div key={home.id} className="rounded-2xl bg-slate-50 p-3">
                        <div className="font-medium">{home.address}</div>
                        <div className="text-slate-600">{formatCurrency(home.price || home.zestimate)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold">Places</div>
                  <div className="mt-2 max-h-60 space-y-2 overflow-auto text-sm">
                    {(dataset.places || []).slice(0, 10).map((place) => (
                      <div key={place.id} className="rounded-2xl bg-slate-50 p-3">
                        <div className="font-medium">{place.name}</div>
                        <div className="text-slate-600">{place.address || ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Map</h2>
            <div className="mt-4">
              {mapCenter ? (
                <LocationMap center={mapCenter} dataset={dataset} />
              ) : (
                <div className="flex h-[360px] items-center justify-center rounded-3xl border bg-slate-50 text-sm text-slate-500">
                  Generate or load a demo board to preview the area.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Current iteration goals</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>Make turns readable and fast enough for real playtesting.</p>
              <p>Keep the local flavor strong with neighborhood homes and landmarks.</p>
              <p>Support fallback demo data so design iteration is never blocked by APIs.</p>
              <p>Rename safely if needed; for now, Localopoly is a working title rather than a branding commitment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GameScreen({ game, setGame, onReset }: { game: GameState; setGame: React.Dispatch<React.SetStateAction<GameState | null>>; onReset: () => void }) {
  const currentPlayer = game.players[game.currentPlayerIndex];
  const winner = game.players.find((p) => fullSetsCount(p) >= 3);

  function updateGame(mutator: (draft: GameState) => GameState | void) {
    setGame((prev) => {
      if (!prev) return prev;
      const cloned: GameState = {
        ...prev,
        players: deepClonePlayers(prev.players),
        deck: [...prev.deck],
        discard: [...prev.discard],
        log: [...prev.log],
      };
      const next = mutator(cloned) || cloned;
      return { ...next };
    });
  }

  function startTurn() {
    if (winner) return;
    if (currentPlayer.hasDrawnThisTurn) return;
    updateGame((draft) => {
      const player = draft.players[draft.currentPlayerIndex];
      const drawCount = player.hand.length === 0 ? 5 : 2;
      const { drawn, remainder } = drawCards(draft.deck, drawCount);
      if (!drawn.length) {
        draft.log.unshift(`${player.name} tried to draw, but the deck is empty.`);
        return draft;
      }
      draft.deck = remainder;
      player.hand.push(...drawn);
      player.hasDrawnThisTurn = true;
      draft.log.unshift(`${player.name} drew ${drawn.length} card(s).`);
      return draft;
    });
  }

  function endTurn() {
    if (currentPlayer.hand.length > 7) return;
    updateGame((draft) => {
      draft.players[draft.currentPlayerIndex].actionsUsed = 0;
      draft.players[draft.currentPlayerIndex].hasDrawnThisTurn = false;
      draft.currentPlayerIndex = (draft.currentPlayerIndex + 1) % draft.players.length;
      draft.log.unshift(`Turn passes to ${draft.players[draft.currentPlayerIndex].name}.`);
      return draft;
    });
  }

  function consumeAction(draft: GameState) {
    const player = draft.players[draft.currentPlayerIndex];
    if (!player.hasDrawnThisTurn) {
      draft.log.unshift(`${player.name} must draw before taking actions.`);
      return false;
    }
    if (player.actionsUsed >= 3) {
      draft.log.unshift(`${player.name} has already used 3 actions this turn.`);
      return false;
    }
    return true;
  }

  function bankCard(cardId: string) {
    updateGame((draft) => {
      if (!consumeAction(draft)) return draft;
      const player = draft.players[draft.currentPlayerIndex];
      const idx = player.hand.findIndex((c) => c.id === cardId);
      if (idx === -1) return draft;
      const [card] = player.hand.splice(idx, 1);
      player.bank.push(card);
      player.actionsUsed += 1;
      draft.log.unshift(`${player.name} banked ${card.name}.`);
      return draft;
    });
  }

  function playActionMoneyEffect(player: Player, card: ActionCard, draft: GameState) {
    if (card.kind === 'money') {
      const payoutCard: MoneyCard = {
        id: `virtual-bank-${card.id}`,
        type: 'money',
        name: `${card.value}M payout`,
        value: card.value,
        moneyValue: card.value,
        description: `Generated by ${card.name}.`,
      };
      player.bank.push(payoutCard);
      draft.discard.push(card);
      player.actionsUsed += 1;
      draft.log.unshift(`${player.name} played ${card.name} and collected ${card.value}M.`);
      return true;
    }
    return false;
  }

  function playCard(cardId: string) {
    updateGame((draft) => {
      if (!consumeAction(draft)) return draft;
      const player = draft.players[draft.currentPlayerIndex];
      const idx = player.hand.findIndex((c) => c.id === cardId);
      if (idx === -1) return draft;
      const [card] = player.hand.splice(idx, 1);

      if (card.type === 'property') {
        if (!player.board[card.category]) player.board[card.category] = [];
        player.board[card.category].push(card);
        player.actionsUsed += 1;
        draft.log.unshift(`${player.name} played ${card.name}.`);
        return draft;
      }

      if (card.type === 'money') {
        player.bank.push(card);
        player.actionsUsed += 1;
        draft.log.unshift(`${player.name} banked ${card.name}.`);
        return draft;
      }

      if (playActionMoneyEffect(player, card, draft)) {
        return draft;
      }

      if (card.kind === 'rent') {
        player.hand.push(card);
        draft.log.unshift(`${player.name} should use the dedicated Charge rent action button.`);
        return draft;
      }

      if (card.kind === 'stealProperty') {
        player.hand.push(card);
        draft.log.unshift(`${player.name} should use the dedicated Steal property action button.`);
        return draft;
      }

      if (card.kind === 'debt') {
        player.hand.push(card);
        draft.log.unshift(`${player.name} should use the dedicated Play debt action button.`);
        return draft;
      }

      if (card.kind === 'house' || card.kind === 'hotel') {
        const eligible = boardSetEntries(player.board).find(([, cards]) => {
          const propertyCards = cards.filter((c): c is PropertyCard => c.type === 'property');
          const fullSet = propertyCards.length > 0 && propertyCards.length >= propertyCards[0].setSize;
          if (!fullSet) return false;
          if (card.kind === 'house') return !cards.some((c) => c.type === 'action' && c.kind === 'house');
          return cards.some((c) => c.type === 'action' && c.kind === 'house') && !cards.some((c) => c.type === 'action' && c.kind === 'hotel');
        });

        if (!eligible) {
          player.hand.push(card);
          draft.log.unshift(`${player.name} has no eligible full set for ${card.name}.`);
          return draft;
        }

        const [category] = eligible;
        player.board[category].push(card);
        player.actionsUsed += 1;
        draft.discard = draft.discard.filter((discarded) => discarded.id !== card.id);
        draft.log.unshift(`${player.name} attached ${card.name} to ${category}.`);
        return draft;
      }

      player.hand.push(card);
      return draft;
    });
  }

  function payFromBank(fromPlayer: Player, toPlayer: Player, amount: number) {
    let remaining = amount;
    const sorted = [...fromPlayer.bank].sort((a, b) => (b.moneyValue || 0) - (a.moneyValue || 0));
    const paid: Card[] = [];

    while (remaining > 0 && sorted.length) {
      const next = sorted.shift();
      if (!next) break;
      paid.push(next);
      remaining -= next.moneyValue || 0;
    }

    fromPlayer.bank = fromPlayer.bank.filter((card) => !paid.some((p) => p.id === card.id));
    toPlayer.bank.push(...paid);
    return paid.reduce((sum, card) => sum + (card.moneyValue || 0), 0);
  }

  function chargeRent() {
    updateGame((draft) => {
      if (!consumeAction(draft)) return draft;
      const player = draft.players[draft.currentPlayerIndex];
      const rentIndex = player.hand.findIndex((c) => c.type === 'action' && c.kind === 'rent');
      if (rentIndex === -1) {
        draft.log.unshift(`${player.name} does not have a rent card.`);
        return draft;
      }
      const rentable = boardSetEntries(player.board).filter(([, cards]) => cards.some((c) => c.type === 'property'));
      if (!rentable.length) {
        draft.log.unshift(`${player.name} has no properties that can charge rent.`);
        return draft;
      }
      const [category, cards] = rentable.sort((a, b) => getSetRent(b[1]) - getSetRent(a[1]))[0];
      const doubleIndex = player.hand.findIndex((c) => c.type === 'action' && c.kind === 'doubleRent');
      const multiplier = doubleIndex >= 0 ? 2 : 1;
      const amount = getSetRent(cards) * multiplier;
      const target = draft.players
        .filter((_, idx) => idx !== draft.currentPlayerIndex)
        .sort((a, b) => sumMoney(b.bank) - sumMoney(a.bank))[0];
      if (!target) return draft;
      const [rentCard] = player.hand.splice(rentIndex, 1);
      draft.discard.push(rentCard);
      const paidAmount = payFromBank(target, player, amount);
      if (doubleIndex >= 0) {
        const [usedDouble] = player.hand.splice(doubleIndex, 1);
        draft.discard.push(usedDouble);
      }
      player.actionsUsed += 1;
      draft.log.unshift(`${player.name} charged ${amount}M rent on ${category} to ${target.name} and collected ${paidAmount}M.`);
      return draft;
    });
  }

  function playDebt() {
    updateGame((draft) => {
      if (!consumeAction(draft)) return draft;
      const player = draft.players[draft.currentPlayerIndex];
      const debtIndex = player.hand.findIndex((c) => c.type === 'action' && c.kind === 'debt');
      if (debtIndex === -1) {
        draft.log.unshift(`${player.name} does not have a debt card.`);
        return draft;
      }
      const target = draft.players
        .filter((_, idx) => idx !== draft.currentPlayerIndex)
        .sort((a, b) => sumMoney(b.bank) - sumMoney(a.bank))[0];
      if (!target) return draft;
      const [debtCard] = player.hand.splice(debtIndex, 1);
      draft.discard.push(debtCard);
      const paidAmount = payFromBank(target, player, 2);
      player.actionsUsed += 1;
      draft.log.unshift(`${player.name} used Parking Meter on ${target.name} and collected ${paidAmount}M.`);
      return draft;
    });
  }

  function stealProperty() {
    updateGame((draft) => {
      if (!consumeAction(draft)) return draft;
      const player = draft.players[draft.currentPlayerIndex];
      const stealIndex = player.hand.findIndex((c) => c.type === 'action' && c.kind === 'stealProperty');
      if (stealIndex === -1) {
        draft.log.unshift(`${player.name} does not have a steal card.`);
        return draft;
      }

      const options = draft.players
        .filter((_, idx) => idx !== draft.currentPlayerIndex)
        .flatMap((opponent) =>
          boardSetEntries(opponent.board).flatMap(([category, cards]) =>
            cards
              .filter((card): card is PropertyCard => card.type === 'property')
              .map((card) => ({ category, card, opponentIndex: draft.players.findIndex((x) => x.id === opponent.id) }))
          )
        );

      if (!options.length) {
        draft.log.unshift(`${player.name} has nobody to steal from.`);
        return draft;
      }
      const pick = options[0];
      const target = draft.players[pick.opponentIndex];

      const blockIndex = target.hand.findIndex((c) => c.type === 'action' && c.kind === 'block');
      const [stealCard] = player.hand.splice(stealIndex, 1);
      draft.discard.push(stealCard);

      if (blockIndex >= 0) {
        const [blockCard] = target.hand.splice(blockIndex, 1);
        draft.discard.push(blockCard);
        player.actionsUsed += 1;
        draft.log.unshift(`${target.name} blocked the theft.`);
        return draft;
      }

      target.board[pick.category] = target.board[pick.category].filter((c) => c.id !== pick.card.id);
      if (!player.board[pick.category]) player.board[pick.category] = [];
      player.board[pick.category].push(pick.card);
      player.actionsUsed += 1;
      draft.log.unshift(`${player.name} stole ${pick.card.name} from ${target.name}.`);
      return draft;
    });
  }

  function discardCard(cardId: string) {
    updateGame((draft) => {
      const player = draft.players[draft.currentPlayerIndex];
      const idx = player.hand.findIndex((c) => c.id === cardId);
      if (idx === -1) return draft;
      const [card] = player.hand.splice(idx, 1);
      draft.discard.push(card);
      draft.log.unshift(`${player.name} discarded ${card.name}.`);
      return draft;
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{game.title}</h1>
              <p className="mt-1 text-sm text-slate-600">Area: {game.areaName}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={startTurn} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Start / Draw</button>
              <button type="button" onClick={chargeRent} className="rounded-2xl border px-4 py-2 text-sm font-semibold">Charge rent</button>
              <button type="button" onClick={playDebt} className="rounded-2xl border px-4 py-2 text-sm font-semibold">Play debt</button>
              <button type="button" onClick={stealProperty} className="rounded-2xl border px-4 py-2 text-sm font-semibold">Steal property</button>
              <button type="button" onClick={endTurn} className="rounded-2xl border px-4 py-2 text-sm font-semibold">End turn</button>
              <button type="button" onClick={onReset} className="rounded-2xl border px-4 py-2 text-sm font-semibold">New board</button>
            </div>
          </div>
        </div>

        {winner && (
          <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
            <div className="text-xl font-bold">Winner: {winner.name}</div>
            <div className="mt-1 text-sm">They completed 3 full local sets.</div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Turn status</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div><span className="font-semibold">Current player:</span> {currentPlayer.name}</div>
                <div><span className="font-semibold">Actions used:</span> {currentPlayer.actionsUsed}/3</div>
                <div><span className="font-semibold">Drawn this turn:</span> {currentPlayer.hasDrawnThisTurn ? 'Yes' : 'No'}</div>
                <div><span className="font-semibold">Hand size:</span> {currentPlayer.hand.length}</div>
                <div><span className="font-semibold">Bank total:</span> {sumMoney(currentPlayer.bank)}M</div>
                <div><span className="font-semibold">Deck left:</span> {game.deck.length}</div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Game log</h2>
              <div className="mt-4 max-h-[500px] space-y-2 overflow-auto text-sm text-slate-700">
                {game.log.map((entry, index) => (
                  <div key={index} className="rounded-2xl bg-slate-50 p-3">{entry}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{currentPlayer.name}'s hand</h2>
                <span className={`text-xs font-medium ${currentPlayer.hand.length <= 7 ? 'text-slate-500' : 'text-red-600'}`}>
                  {currentPlayer.hand.length <= 7 ? 'Within hand limit' : 'Discard to 7 before ending turn'}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {currentPlayer.hand.map((card) => (
                  <div key={card.id} className="space-y-2">
                    <AppCard card={card} compact />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => bankCard(card.id)} className="rounded-xl border px-3 py-2 text-xs font-semibold">Bank</button>
                      <button type="button" onClick={() => playCard(card.id)} className="rounded-xl border px-3 py-2 text-xs font-semibold">Play</button>
                      <button type="button" onClick={() => discardCard(card.id)} className="col-span-2 rounded-xl border px-3 py-2 text-xs font-semibold">Discard</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">All players</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {game.players.map((player) => (
                  <div key={player.id} className={`rounded-2xl border p-4 ${player.id === currentPlayer.id ? 'border-slate-900 bg-slate-50' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-bold">{player.name}</div>
                      <div className="text-xs text-slate-500">Bank: {sumMoney(player.bank)}M</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Hand: {player.hand.length} • Full sets: {fullSetsCount(player)}</div>
                    <div className="mt-4 space-y-3">
                      {boardSetEntries(player.board).map(([category, cards]) => {
                        const propertyCards = cards.filter((c): c is PropertyCard => c.type === 'property');
                        const complete = propertyCards.length > 0 && propertyCards.length >= propertyCards[0].setSize;
                        return (
                          <div key={category} className="rounded-2xl border p-3">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">{category}</div>
                              <div className="text-xs text-slate-500">Rent {getSetRent(cards)}M {complete ? '• Complete' : ''}</div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {cards.map((card) => (
                                <span key={card.id} className={`rounded-full border px-2 py-1 text-xs ${'category' in card && card.category ? COLORS[card.category] || COLORS.Wild : 'bg-slate-100'}`}>
                                  {card.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Generated categories</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {game.categories.map((category) => (
                  <div key={category.category} className="rounded-2xl bg-slate-50 p-3">
                    <div className="font-medium">{category.category}</div>
                    <div>{category.count} cards • full set at {category.setSize}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Source stats</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <div>Homes loaded: {game.homesLoaded}</div>
                <div>Places loaded: {game.placesLoaded}</div>
                <div>Property cards: {game.propertyCount}</div>
                <div>Total deck: {game.initialDeckSize}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LocalopolyApp() {
  const [locationQuery, setLocationQuery] = useState('Rogers Park, Chicago, IL');
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2']);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['Food', 'Coffee', 'Parks', 'Shopping', 'Fun']);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [game, setGame] = useState<GameState | null>(null);

  const selectedTypes = useMemo(() => {
    return PLACE_TYPE_GROUPS.filter((g) => selectedGroups.includes(g.label)).flatMap((g) => [...g.types]);
  }, [selectedGroups]);

  function startGameFromDataset(nextDataset: Dataset, areaNameOverride?: string, center?: LatLng | null) {
    const built = buildDeckFromGeneratedData(nextDataset);
    if (built.propertyCount < 8) {
      throw new Error('Not enough local results to make a good deck. Try a denser location.');
    }

    const players = createPlayers(playerNames.map((name, idx) => name.trim() || `Player ${idx + 1}`));
    let workingDeck = [...built.deck];
    for (let i = 0; i < players.length; i += 1) {
      const { drawn, remainder } = drawCards(workingDeck, 5);
      players[i].hand = drawn;
      workingDeck = remainder;
    }

    setDataset(nextDataset);
    if (center) setMapCenter(center);
    setGame({
      title: 'Localopoly',
      areaName: areaNameOverride || nextDataset.areaName,
      players,
      currentPlayerIndex: 0,
      deck: workingDeck,
      discard: [],
      log: [`Game started for ${areaNameOverride || nextDataset.areaName}.`],
      initialDeckSize: built.deck.length,
      propertyCount: built.propertyCount,
      categories: built.categories,
      homesLoaded: (nextDataset.houses || []).length,
      placesLoaded: (nextDataset.places || []).length,
    });
  }

  async function generateLocalBoard() {
    setError('');
    setLoading(true);
    try {
      if (!GOOGLE_MAPS_KEY) {
        throw new Error('Missing Google Maps API key. Use the demo board for now or add PUBLIC_GOOGLE_MAPS_API_KEY.');
      }
      if (!BACKEND_BASE) {
        throw new Error('Missing local backend base URL. Use the demo board for now or add PUBLIC_LOCAL_MONOPOLY_BACKEND.');
      }

      const geocode = await geocodeLocation(GOOGLE_MAPS_KEY, locationQuery);
      setMapCenter(geocode.location);

      const generated = await fetchGeneratedDataset({
        locationQuery: geocode.formattedAddress,
        center: geocode.location,
        bounds: geocode.bounds
          ? {
              north: geocode.bounds.northeast.lat,
              east: geocode.bounds.northeast.lng,
              south: geocode.bounds.southwest.lat,
              west: geocode.bounds.southwest.lng,
            }
          : undefined,
        selectedTypes,
      });

      startGameFromDataset(generated, generated.areaName || geocode.formattedAddress, geocode.location);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function useDemoBoard() {
    setError('');
    setMapCenter({ lat: 42.0085, lng: -87.6672 });
    startGameFromDataset(SAMPLE_DATASET, SAMPLE_DATASET.areaName, { lat: 42.0085, lng: -87.6672 });
  }

  if (game) {
    return <GameScreen game={game} setGame={setGame} onReset={() => setGame(null)} />;
  }

  return (
    <SetupScreen
      locationQuery={locationQuery}
      setLocationQuery={setLocationQuery}
      playerNames={playerNames}
      setPlayerNames={setPlayerNames}
      selectedGroups={selectedGroups}
      setSelectedGroups={setSelectedGroups}
      onGenerate={generateLocalBoard}
      onUseDemo={useDemoBoard}
      loading={loading}
      error={error}
      dataset={dataset}
      mapCenter={mapCenter}
    />
  );
}
