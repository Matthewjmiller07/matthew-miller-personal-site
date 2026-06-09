import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CITIES = [
  { label: "Jerusalem", latitude: 31.7683, longitude: 35.2137, tzid: "Asia/Jerusalem" },
  { label: "Ra'anana / Tel Aviv", latitude: 32.0853, longitude: 34.7818, tzid: "Asia/Jerusalem" },
  { label: "Bnei Brak", latitude: 32.0841, longitude: 34.8337, tzid: "Asia/Jerusalem" },
  { label: "Haifa", latitude: 32.7940, longitude: 34.9896, tzid: "Asia/Jerusalem" },
  { label: "Beer Sheva", latitude: 31.2518, longitude: 34.7913, tzid: "Asia/Jerusalem" },
  { label: "New York", latitude: 40.6501, longitude: -73.9496, tzid: "America/New_York" },
  { label: "Los Angeles", latitude: 34.0522, longitude: -118.2437, tzid: "America/Los_Angeles" },
  { label: "Chicago", latitude: 41.8781, longitude: -87.6298, tzid: "America/Chicago" },
  { label: "London", latitude: 51.5074, longitude: -0.1278, tzid: "Europe/London" },
  { label: "Toronto", latitude: 43.6532, longitude: -79.3832, tzid: "America/Toronto" },
  { label: "Montreal", latitude: 45.5051, longitude: -73.5540, tzid: "America/Toronto" },
  { label: "Paris", latitude: 48.8566, longitude: 2.3522, tzid: "Europe/Paris" },
  { label: "Melbourne", latitude: -37.8136, longitude: 144.9631, tzid: "Australia/Melbourne" },
];

const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getWeek() {
  const now = new Date();
  const day = now.getDay();
  const sun = new Date(now);
  sun.setDate(now.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    return d;
  });
}

// Slice HH:MM directly from ISO string — avoids local-timezone conversion
function formatTime(isoStr?: string) {
  if (!isoStr) return "—";
  const match = isoStr.match(/T(\d{2}):(\d{2})/);
  if (!match) return "—";
  return `${parseInt(match[1], 10)}:${match[2]}`;
}

interface DayTimes {
  sunrise?: string;
  sofZmanShma?: string;
  sofZmanShmaMGA?: string;
  sofZmanTfilla?: string;
  sofZmanTfillaMGA?: string;
  sunset?: string;
  [key: string]: string | undefined;
}

// The background image is 1086 × 1448 (ratio ≈ 0.75)
// Parchment content zone: ~26%–83% vertically, ~14%–86% horizontally
const BG = "/images/zmanim-board-bg.png";

export default function ZmanimBoard({ defaultCityIdx = 5 }: { defaultCityIdx?: number }) {
  const [cityIdx, setCityIdx] = useState(defaultCityIdx);
  const [weekData, setWeekData] = useState<DayTimes[]>([]);
  const [parasha, setParasha] = useState("");
  const [hebrewDateStr, setHebrewDateStr] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const dropRef = useRef<HTMLDivElement>(null);

  const city = CITIES[cityIdx];
  const week = getWeek();
  const todayIdx = new Date().getDay();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setWeekData([]);
    setParasha("");
    setHebrewDateStr("");

    const { latitude, longitude, tzid } = city;
    const zmanimFetches = week.map(d =>
      fetch(`https://www.hebcal.com/zmanim?cfg=json&date=${toDateStr(d)}&latitude=${latitude}&longitude=${longitude}&tzid=${encodeURIComponent(tzid)}&sec=0`)
        .then(r => r.json()).then(j => (j.times ?? {}) as DayTimes).catch(() => ({} as DayTimes))
    );
    const shabbatFetch = fetch(
      `https://www.hebcal.com/shabbat?cfg=json&latitude=${latitude}&longitude=${longitude}&tzid=${encodeURIComponent(tzid)}&b=18&M=on&lg=s`
    ).then(r => r.json()).catch(() => ({}));
    const converterFetch = fetch(
      `https://www.hebcal.com/converter?cfg=json&date=${toDateStr(week[0])}&g2h=1`
    ).then(r => r.json()).catch(() => ({}));

    Promise.all([...zmanimFetches, shabbatFetch, converterFetch]).then(results => {
      setWeekData(results.slice(0, 7) as DayTimes[]);
      const shabbatData = results[7] as { items?: { category: string; hebrew: string }[] };
      const convData = results[8] as { hebrew?: string };
      setParasha(shabbatData?.items?.find(i => i.category === "parashat")?.hebrew || "");
      setHebrewDateStr(convData?.hebrew || "");
    }).catch(e => { console.error(e); setError("לא ניתן לטעון זמנים"); }).finally(() => setLoading(false));
  }, [cityIdx, tick]);

  const todayTimes = weekData[todayIdx] || {};
  const startDay = week[0], endDay = week[6];
  const dateRange = startDay.getMonth() === endDay.getMonth()
    ? `${MONTHS_EN[startDay.getMonth()]} ${startDay.getDate()}–${endDay.getDate()}`
    : `${MONTHS_EN[startDay.getMonth()]} ${startDay.getDate()} – ${MONTHS_EN[endDay.getMonth()]} ${endDay.getDate()}`;

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "16px", background: "transparent" }}>
      {/* Outer container — maintains image aspect ratio */}
      <div style={{ position: "relative", width: "100%", maxWidth: 400, aspectRatio: "1086 / 1448" }}>

        {/* Background frame image */}
        <img
          src={BG}
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", userSelect: "none" }}
        />

        {/* Transparent overlay — all dynamic content sits here */}
        <div style={{ position: "absolute", inset: 0, fontFamily: "'Georgia','Times New Roman',serif" }}>

          {/* City selector — sits just below the title block (~26.5% from top) */}
          <div
            ref={dropRef}
            style={{ position: "absolute", top: "26.5%", width: "100%", textAlign: "center", zIndex: 20 }}
          >
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                background: "rgba(90,15,30,0.85)",
                color: "#f5e8d0", border: "1px solid rgba(212,165,32,0.5)",
                borderRadius: 3, padding: "2.5% 5%",
                fontSize: "min(3vw, 12px)", cursor: "pointer",
                fontFamily: "inherit", letterSpacing: 0.5, fontWeight: 700,
                backdropFilter: "blur(2px)",
              }}
            >
              📍 {city.label} ▾
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scaleY: 0.9 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -6, scaleY: 0.9 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute", top: "110%", left: "50%",
                    transform: "translateX(-50%)",
                    background: "#1e0608", border: "1px solid #8b1a2b",
                    borderRadius: 4, zIndex: 999, minWidth: 190,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                    maxHeight: 240, overflowY: "auto",
                    transformOrigin: "top center",
                  }}
                >
                  {CITIES.map((c, i) => (
                    <div key={i}
                      onClick={() => { setCityIdx(i); setOpen(false); }}
                      style={{
                        padding: "7px 16px",
                        color: i === cityIdx ? "#f5c842" : "#f0e8dc",
                        fontSize: 12, cursor: "pointer",
                        background: i === cityIdx ? "rgba(139,26,43,0.4)" : "transparent",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        fontWeight: i === cityIdx ? 700 : 400,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(139,26,43,0.25)")}
                      onMouseLeave={e => (e.currentTarget.style.background = i === cityIdx ? "rgba(139,26,43,0.4)" : "transparent")}
                    >
                      {i === cityIdx ? "✓ " : "  "}{c.label}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main data — parchment zone: ~30%–82% vertical, ~15%–85% horizontal */}
          <div style={{
            position: "absolute",
            top: "30%", bottom: "20%",
            left: "15%", right: "15%",
            display: "flex", flexDirection: "column",
            alignItems: "center",
            overflow: "hidden",
          }}>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                  <LoadingOrb />
                  <div style={{ fontSize: "min(3.2vw, 13px)", color: "#8b1a2b", direction: "rtl" }}>טוען זמנים…</div>
                </motion.div>
              ) : error ? (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, direction: "rtl" }}>
                  <div style={{ fontSize: "min(5vw, 22px)" }}>⚠️</div>
                  <div style={{ fontSize: "min(3vw, 12px)", color: "#8b1a2b" }}>{error}</div>
                  <button onClick={() => setTick(t => t + 1)} style={{
                    padding: "4px 12px", fontSize: "min(2.8vw, 11px)",
                    background: "#8b1a2b", color: "white", border: "none",
                    cursor: "pointer", borderRadius: 3, fontFamily: "inherit",
                  }}>נסה שוב</button>
                </motion.div>
              ) : (
                <motion.div key="data" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5%" }}
                >
                  {/* Parasha + date */}
                  <div style={{ textAlign: "center", direction: "rtl", lineHeight: 1.2 }}>
                    <div style={{ fontSize: "min(4.5vw, 18px)", fontWeight: 800, color: "#3a0a14" }}>
                      {parasha || "פרשת השבוע"}
                    </div>
                    {hebrewDateStr && (
                      <div style={{ fontSize: "min(2.5vw, 10px)", color: "#888" }}>{hebrewDateStr}</div>
                    )}
                    <div style={{ fontSize: "min(3vw, 12px)", fontWeight: 600, color: "#444", direction: "ltr" }}>
                      {dateRange}
                    </div>
                  </div>

                  {/* Big sof zman shma time */}
                  <div style={{ textAlign: "center" }}>
                    <motion.div
                      key={todayTimes.sofZmanShma}
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                      style={{
                        fontSize: "min(17vw, 68px)", fontWeight: 900, color: "#111",
                        lineHeight: 1, letterSpacing: -2, fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatTime(todayTimes.sofZmanShma)}
                    </motion.div>
                    <div style={{ fontSize: "min(3vw, 12px)", color: "#555" }}>
                      למג״א {formatTime(todayTimes.sofZmanShmaMGA)}
                    </div>
                  </div>

                  {/* Weekly table */}
                  <table style={{
                    width: "100%", borderCollapse: "collapse",
                    fontSize: "min(2.8vw, 11px)",
                    borderTop: "1.5px solid #3a0a14",
                  }}>
                    <thead>
                      <tr>
                        {["יום", "הנץ", "ק״ש", "שקיעה"].map((h, i) => (
                          <th key={i} style={{
                            padding: "3px 2px", fontWeight: 700,
                            background: i === 2 ? "#3a0a14" : "rgba(237,229,211,0.7)",
                            color: i === 2 ? "white" : "#3a0a14",
                            direction: "rtl", textAlign: "center",
                            borderBottom: "1.5px solid #3a0a14",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {week.map((_, i) => {
                        const t = weekData[i] || {};
                        const isToday = i === todayIdx;
                        const isShabbat = i === 6;
                        return (
                          <tr key={i} style={{
                            background: isToday
                              ? "rgba(139,26,43,0.1)"
                              : isShabbat
                              ? "rgba(212,165,32,0.08)"
                              : i % 2 ? "rgba(253,250,246,0.6)" : "rgba(255,255,255,0.4)",
                          }}>
                            <td style={{
                              padding: "3px 3px", direction: "rtl", textAlign: "center",
                              fontWeight: isToday ? 800 : isShabbat ? 700 : 500,
                              color: isToday ? "#8b1a2b" : isShabbat ? "#5a3e00" : "#222",
                              borderBottom: "1px solid rgba(200,180,150,0.4)",
                            }}>{DAYS_HE[i]}</td>
                            <td style={{ padding: "3px 2px", textAlign: "center", color: "#555", borderBottom: "1px solid rgba(200,180,150,0.4)" }}>
                              {formatTime(t.sunrise)}
                            </td>
                            <td style={{
                              padding: "3px 2px", textAlign: "center",
                              background: isToday ? "#5a0f1e" : "#3a0a14",
                              color: "white", fontWeight: isToday ? 900 : 700,
                              borderBottom: "1px solid #2a0a10",
                              fontSize: isToday ? "min(3.2vw, 12.5px)" : undefined,
                            }}>
                              {formatTime(t.sofZmanShma)}
                            </td>
                            <td style={{ padding: "3px 2px", textAlign: "center", color: "#555", borderBottom: "1px solid rgba(200,180,150,0.4)" }}>
                              {formatTime(t.sunset)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Tefila times */}
                  <div style={{
                    textAlign: "center", fontSize: "min(2.8vw, 11px)",
                    color: "#3a0a14", lineHeight: 2, direction: "rtl",
                    borderTop: "1px solid rgba(139,26,43,0.25)",
                    paddingTop: "2%", width: "100%",
                  }}>
                    <div>ס״ז תפילה גר״א &nbsp; {formatTime(todayTimes.sofZmanTfilla)}</div>
                    <div>ס״ז תפילה מג״א &nbsp; {formatTime(todayTimes.sofZmanTfillaMGA)}</div>
                  </div>

                  {/* Live badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "rgba(237,229,211,0.7)", border: "1px solid rgba(194,169,138,0.6)",
                    borderRadius: 20, padding: "2px 10px",
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#22c55e", boxShadow: "0 0 5px #22c55e",
                    }} />
                    <span style={{ fontSize: "min(2.4vw, 9px)", fontWeight: 700, color: "#3a0a14", letterSpacing: 0.5 }}>
                      Live · hebcal.com
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Transparent clickable overlay on the baked-in footer */}
          <a
            href="https://theothermatthewmiller.com/zmanim"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="theothermatthewmiller.com/zmanim"
            style={{
              position: "absolute",
              top: "83%", left: "18%", right: "18%", height: "9%",
              zIndex: 10, cursor: "pointer",
              borderRadius: 4,
              outline: "none",
            }}
          />

        </div>
      </div>
    </div>
  );
}

function LoadingOrb() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 5 }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          style={{ width: 7, height: 7, background: "#8b1a2b", borderRadius: "50%" }}
          animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
