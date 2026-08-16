import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup, GeoJSON as GeoJSONLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place, Shul } from './types';
import { RAANANA, titleCase } from './lib';

interface Props {
  places: Place[];
  regions: GeoJSON.FeatureCollection | null;
  shuls: Shul[];
  /** How many times we've been to each settlement, keyed by semel yishuv. */
  placeCounts: Map<string, number>;
  /** How many minyanim at each shul, keyed by shul id. */
  shulCounts: Map<string, number>;
  /** When set, the next map click reports coordinates back instead of panning. */
  pinning: boolean;
  onPin?: (lat: number, lng: number) => void;
  showRegions: boolean;
  showShuls: boolean;
}

/** Sub-district shading — pale where we've barely been, deep where we keep going back. */
function regionFill(count: number): { fillColor: string; fillOpacity: number } {
  if (count === 0) return { fillColor: '#475569', fillOpacity: 0.08 };
  if (count < 3) return { fillColor: '#38bdf8', fillOpacity: 0.18 };
  if (count < 8) return { fillColor: '#22d3ee', fillOpacity: 0.28 };
  if (count < 20) return { fillColor: '#34d399', fillOpacity: 0.36 };
  return { fillColor: '#fbbf24', fillOpacity: 0.45 };
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );

export default function IsraelMap({
  places,
  regions,
  shuls,
  placeCounts,
  shulCounts,
  pinning,
  onPin,
  showRegions,
  showShuls,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const regionLayer = useRef<GeoJSONLayer | null>(null);
  const placeLayer = useRef<LayerGroup | null>(null);
  const shulLayer = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const framed = useRef(false);
  // Leaflet arrives asynchronously, usually after the tracker's data has already
  // landed. Without this the layer effects below would run once against a map that
  // doesn't exist yet and never fire again.
  const [ready, setReady] = useState(false);
  // Read inside Leaflet event handlers, which capture their first closure.
  const pinHandler = useRef<Props['onPin']>(onPin);
  const pinningRef = useRef(pinning);
  pinHandler.current = onPin;
  pinningRef.current = pinning;

  const placeByCode = useMemo(() => new Map(places.map((p) => [p.code, p])), [places]);

  /** Activity per sub-district, so the polygons can be shaded. */
  const regionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [code, count] of placeCounts) {
      const name = placeByCode.get(code)?.subdistrict_he;
      if (name) counts.set(name, (counts.get(name) ?? 0) + count);
    }
    return counts;
  }, [placeCounts, placeByCode]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !container.current || map.current) return;
      leaflet.current = L;

      const instance = L.map(container.current, {
        center: RAANANA,
        zoom: 9,
        scrollWheelZoom: false,
        preferCanvas: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(instance);

      instance.on('click', (event) => {
        if (pinningRef.current) pinHandler.current?.(event.latlng.lat, event.latlng.lng);
      });

      regionLayer.current = L.geoJSON(undefined, { interactive: true }).addTo(instance);
      placeLayer.current = L.layerGroup().addTo(instance);
      shulLayer.current = L.layerGroup().addTo(instance);
      map.current = instance;
      setReady(true);

      // Leaflet measures the container on creation; inside a tab that was hidden a
      // moment ago that measurement is zero, so nudge it once the layout settles.
      setTimeout(() => instance.invalidateSize(), 60);
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      setReady(false);
    };
  }, []);

  /* Region polygons ------------------------------------------------------- */
  useEffect(() => {
    const L = leaflet.current;
    const layer = regionLayer.current;
    if (!L || !layer || !regions) return;

    layer.clearLayers();
    if (!showRegions) return;

    layer.addData({
      ...regions,
      features: regions.features.filter((f) => f.properties?.level === 'subdistrict'),
    } as GeoJSON.FeatureCollection);

    layer.eachLayer((child) => {
      const feature = (child as unknown as { feature?: GeoJSON.Feature }).feature;
      const name = (feature?.properties as { name_he?: string; name_en?: string }) ?? {};
      const count = regionCounts.get(name.name_he ?? '') ?? 0;
      (child as unknown as { setStyle: (s: unknown) => void }).setStyle({
        color: '#94a3b8',
        weight: 1,
        opacity: 0.5,
        ...regionFill(count),
      });
      (child as unknown as { bindTooltip: (s: string) => void }).bindTooltip(
        `<strong>${escapeHtml(name.name_he || name.name_en || '')}</strong><br>` +
          `${count} ${count === 1 ? 'visit' : 'visits'} logged`
      );
    });
  }, [ready, regions, showRegions, regionCounts]);

  /* Places we've been ------------------------------------------------------ */
  useEffect(() => {
    const L = leaflet.current;
    const layer = placeLayer.current;
    if (!L || !layer) return;

    layer.clearLayers();
    const located: [number, number][] = [];
    for (const [code, count] of placeCounts) {
      const place = placeByCode.get(code);
      if (!place?.lat || !place?.lng) continue;
      located.push([place.lat, place.lng]);
      L.circleMarker([place.lat, place.lng], {
        radius: Math.min(6 + Math.sqrt(count) * 3, 22),
        color: '#f59e0b',
        weight: 2,
        fillColor: '#fbbf24',
        fillOpacity: 0.55,
      })
        .bindPopup(
          `<strong dir="auto">${escapeHtml(place.name_he)}</strong><br>` +
            `${escapeHtml(titleCase(place.name_en || ''))}<br>` +
            `<em>${count} ${count === 1 ? 'time' : 'times'}</em>`
        )
        .addTo(layer);
    }

    // Frame the map around wherever we've actually logged something, the first
    // time there's anything to frame — not the whole country, which reduces a
    // single new marker to a few pixels. Once framed, leave the view alone so
    // logging another entry doesn't yank the map out from under someone who's
    // already panned around.
    if (!framed.current && map.current && located.length) {
      framed.current = true;
      if (located.length === 1) {
        map.current.setView(located[0], 13);
      } else {
        map.current.fitBounds(L.latLngBounds(located), { padding: [32, 32], maxZoom: 13 });
      }
    }
  }, [ready, placeCounts, placeByCode]);

  /* Shuls ------------------------------------------------------------------ */
  useEffect(() => {
    const L = leaflet.current;
    const layer = shulLayer.current;
    if (!L || !layer) return;

    layer.clearLayers();
    if (!showShuls) return;

    for (const shul of shuls) {
      if (!shul.lat || !shul.lng) continue;
      const count = shulCounts.get(shul.id) ?? 0;
      L.circleMarker([shul.lat, shul.lng], {
        radius: count ? Math.min(5 + Math.sqrt(count) * 2.5, 16) : 5,
        color: count ? '#38bdf8' : '#64748b',
        weight: 2,
        fillColor: count ? '#0ea5e9' : '#94a3b8',
        fillOpacity: count ? 0.7 : 0.35,
      })
        .bindPopup(
          `<strong dir="auto">${escapeHtml(shul.name_he)}</strong><br>` +
            (shul.address_he ? `<span dir="auto">${escapeHtml(shul.address_he)}</span><br>` : '') +
            `<em>${count ? `${count} minyanim logged` : 'not yet davened here'}</em>`
        )
        .addTo(layer);
    }
  }, [ready, shuls, shulCounts, showShuls]);

  return (
    <div className={`il-map-wrap ${pinning ? 'is-pinning' : ''}`}>
      <div ref={container} className="il-map" />
      {pinning && <p className="il-map-hint">Click the map to place this shul.</p>}
    </div>
  );
}
