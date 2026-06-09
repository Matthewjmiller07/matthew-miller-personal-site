/* Sof Zman Krias Shma Widget — theothermatthewmiller.com/zmanim */
(function () {
  'use strict';

  var BASE = 'https://theothermatthewmiller.com';
  var BG   = BASE + '/images/zmanim-board-bg.png';
  var SITE = BASE + '/zmanim';

  var CITIES = [
    { label: 'Jerusalem',           lat: 31.7683,  lng:  35.2137, tzid: 'Asia/Jerusalem' },
    { label: "Ra'anana / Tel Aviv", lat: 32.0853,  lng:  34.7818, tzid: 'Asia/Jerusalem' },
    { label: 'Bnei Brak',           lat: 32.0841,  lng:  34.8337, tzid: 'Asia/Jerusalem' },
    { label: 'Haifa',               lat: 32.7940,  lng:  34.9896, tzid: 'Asia/Jerusalem' },
    { label: 'Beer Sheva',          lat: 31.2518,  lng:  34.7913, tzid: 'Asia/Jerusalem' },
    { label: 'New York',            lat: 40.6501,  lng: -73.9496, tzid: 'America/New_York' },
    { label: 'Los Angeles',         lat: 34.0522,  lng: -118.2437,tzid: 'America/Los_Angeles' },
    { label: 'Chicago',             lat: 41.8781,  lng: -87.6298, tzid: 'America/Chicago' },
    { label: 'London',              lat: 51.5074,  lng:  -0.1278, tzid: 'Europe/London' },
    { label: 'Toronto',             lat: 43.6532,  lng: -79.3832, tzid: 'America/Toronto' },
    { label: 'Montreal',            lat: 45.5051,  lng: -73.5540, tzid: 'America/Toronto' },
    { label: 'Paris',               lat: 48.8566,  lng:   2.3522, tzid: 'Europe/Paris' },
    { label: 'Melbourne',           lat: -37.8136, lng: 144.9631, tzid: 'Australia/Melbourne' },
  ];

  var DAYS_HE  = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  var MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function pad(n) { return String(n).padStart(2, '0'); }
  function toDateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }

  function getWeek() {
    var now = new Date(), day = now.getDay(), sun = new Date(now);
    sun.setDate(now.getDate() - day);
    return Array.from({length:7}, function(_, i){
      var d = new Date(sun); d.setDate(sun.getDate() + i); return d;
    });
  }

  function fmt(iso) {
    if (!iso) return '—';
    var m = iso.match(/T(\d{2}):(\d{2})/);
    return m ? parseInt(m[1],10) + ':' + m[2] : '—';
  }

  // ── Widget state ────────────────────────────────────────────────────────────
  var state = { cityIdx: 5, weekData: [], parasha: '', hebrewDate: '', loading: true, error: null, open: false };

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    var host = document.getElementById('zmanim-widget');
    if (!host) return;

    injectStyles();

    host.style.cssText = 'font-family:Georgia,"Times New Roman",serif;display:block;';

    // Outer wrapper — maintains 1086:1448 aspect ratio
    var wrap = el('div', {
      style: 'position:relative;width:100%;max-width:420px;aspect-ratio:1086/1448;margin:0 auto;',
    });

    // Background frame image
    var img = el('img', {
      src: BG, alt: '', 'aria-hidden': 'true',
      style: 'position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none;pointer-events:none;',
    });
    wrap.appendChild(img);

    // Overlay layer
    var overlay = el('div', { style: 'position:absolute;inset:0;' });
    wrap.appendChild(overlay);
    host.appendChild(wrap);

    buildOverlay(overlay);
    fetchData();

    // Close dropdown on outside click
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#zmw-city-wrap')) closeDropdown(overlay);
    });
  }

  // ── Build the overlay (city selector + white paper) ─────────────────────────
  function buildOverlay(overlay) {
    overlay.innerHTML = '';

    // City selector — sits above the paper in the frame title zone
    var cityWrap = el('div', {
      id: 'zmw-city-wrap',
      style: 'position:absolute;top:26%;width:100%;text-align:center;z-index:30;',
    });

    var cityBtn = el('button', {
      id: 'zmw-city-btn',
      style: [
        'background:rgba(80,12,24,0.88);color:#f5e8d0;',
        'border:1px solid rgba(212,165,32,0.55);border-radius:3px;',
        'padding:1.8% 5%;font-size:min(3.2vw,12.5px);cursor:pointer;',
        'font-family:inherit;font-weight:700;letter-spacing:.4px;',
        'box-shadow:0 2px 6px rgba(0,0,0,.35);',
      ].join(''),
    });
    cityBtn.textContent = '📍 ' + CITIES[state.cityIdx].label + ' ▾';
    cityBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      state.open = !state.open;
      renderDropdown(cityWrap, overlay);
    });
    cityWrap.appendChild(cityBtn);

    // Dropdown placeholder
    var dropPlaceholder = el('div', { id: 'zmw-drop' });
    cityWrap.appendChild(dropPlaceholder);

    overlay.appendChild(cityWrap);

    // White paper — positioned within the parchment zone of the image
    // Image zones (% of 1086×1448): parchment starts ~27% top, ends ~81% top, sides ~14%
    var paper = el('div', {
      id: 'zmw-paper',
      style: [
        'position:absolute;top:28.5%;bottom:19%;left:14%;right:14%;',
        'background:#fff;',
        'box-shadow:0 2px 16px rgba(0,0,0,.25),0 1px 4px rgba(0,0,0,.15);',
        'overflow:hidden;display:flex;flex-direction:column;align-items:stretch;',
        'padding:3% 4%;box-sizing:border-box;',
      ].join(''),
    });
    overlay.appendChild(paper);

    // Transparent footer link (over the baked-in logo at bottom of image)
    var footerLink = el('a', {
      href: SITE, target: '_blank', rel: 'noopener noreferrer',
      'aria-label': 'theothermatthewmiller.com/zmanim',
      style: 'position:absolute;top:82.5%;left:17%;right:17%;height:10%;z-index:20;cursor:pointer;border-radius:4px;',
    });
    overlay.appendChild(footerLink);

    renderPaper(paper);
  }

  function renderDropdown(cityWrap, overlay) {
    var existing = document.getElementById('zmw-drop-menu');
    if (existing) existing.remove();
    if (!state.open) return;

    var menu = el('div', {
      id: 'zmw-drop-menu',
      style: [
        'position:absolute;top:105%;left:50%;transform:translateX(-50%);',
        'background:#1e0608;border:1px solid #8b1a2b;border-radius:4px;',
        'z-index:999;min-width:200px;max-height:220px;overflow-y:auto;',
        'box-shadow:0 8px 32px rgba(0,0,0,.75);',
      ].join(''),
    });

    CITIES.forEach(function(c, i) {
      var item = el('div', {
        style: [
          'padding:7px 16px;font-size:min(3vw,12px);cursor:pointer;',
          'border-bottom:1px solid rgba(255,255,255,.05);',
          'color:' + (i === state.cityIdx ? '#f5c842' : '#f0e8dc') + ';',
          'font-weight:' + (i === state.cityIdx ? '700' : '400') + ';',
          'background:' + (i === state.cityIdx ? 'rgba(139,26,43,.4)' : 'transparent') + ';',
        ].join(''),
      });
      item.textContent = (i === state.cityIdx ? '✓ ' : '   ') + c.label;
      item.addEventListener('mouseenter', function(){ this.style.background = 'rgba(139,26,43,.25)'; });
      item.addEventListener('mouseleave', function(){ this.style.background = i === state.cityIdx ? 'rgba(139,26,43,.4)' : 'transparent'; });
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        state.cityIdx = i;
        state.open = false;
        updateCityBtn();
        renderDropdown(cityWrap, overlay);
        fetchData();
      });
      menu.appendChild(item);
    });

    cityWrap.appendChild(menu);
  }

  function closeDropdown(overlay) {
    state.open = false;
    var m = document.getElementById('zmw-drop-menu');
    if (m) m.remove();
  }

  function updateCityBtn() {
    var btn = document.getElementById('zmw-city-btn');
    if (btn) btn.textContent = '📍 ' + CITIES[state.cityIdx].label + ' ▾';
  }

  // ── Render paper content ────────────────────────────────────────────────────
  function renderPaper(paper) {
    if (!paper) { paper = document.getElementById('zmw-paper'); }
    if (!paper) return;
    paper.innerHTML = '';

    if (state.loading) {
      var ldg = el('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;' });
      ldg.innerHTML = '<div style="display:flex;gap:5px;" id="zmw-orbs"></div>' +
        '<div style="font-size:min(3.5vw,13px);color:#8b1a2b;direction:rtl;">טוען זמנים…</div>';
      paper.appendChild(ldg);
      animateOrbs();
      return;
    }

    if (state.error) {
      var err = el('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;direction:rtl;' });
      var errMsg = el('div', { style: 'font-size:min(3vw,12px);color:#8b1a2b;' });
      errMsg.textContent = state.error;
      var retryBtn = el('button', { style: 'padding:4px 14px;font-size:min(3vw,11px);background:#8b1a2b;color:#fff;border:none;cursor:pointer;border-radius:3px;font-family:inherit;' });
      retryBtn.textContent = 'נסה שוב';
      retryBtn.addEventListener('click', fetchData);
      err.appendChild(errMsg);
      err.appendChild(retryBtn);
      paper.appendChild(err);
      return;
    }

    var week     = getWeek();
    var todayIdx = new Date().getDay();
    var s = week[0], e = week[6];
    var dateRange = s.getMonth() === e.getMonth()
      ? MONTHS[s.getMonth()] + ' ' + s.getDate() + '–' + e.getDate()
      : MONTHS[s.getMonth()] + ' ' + s.getDate() + ' – ' + MONTHS[e.getMonth()] + ' ' + e.getDate();
    var todayT = state.weekData[todayIdx] || {};

    // ── Parasha + date header ─────────────────────────────────────────────
    var hdr = el('div', { style: 'text-align:center;direction:rtl;margin-bottom:2%;line-height:1.2;' });
    hdr.innerHTML =
      '<div style="font-size:min(4.8vw,18px);font-weight:800;color:#3a0a14;">' + esc(state.parasha || 'פרשת השבוע') + '</div>' +
      (state.hebrewDate ? '<div style="font-size:min(2.4vw,9px);color:#999;">' + esc(state.hebrewDate) + '</div>' : '') +
      '<div style="font-size:min(2.8vw,11px);font-weight:600;color:#555;direction:ltr;">' + esc(dateRange) + '</div>';
    paper.appendChild(hdr);

    // ── Big today time ────────────────────────────────────────────────────
    var bigWrap = el('div', { style: 'text-align:center;margin-bottom:2%;' });
    var bigTime = el('div', { style: 'font-size:min(16vw,62px);font-weight:900;color:#111;line-height:1;letter-spacing:-2px;font-variant-numeric:tabular-nums;' });
    bigTime.textContent = fmt(todayT.sofZmanShma);
    var mgaTime = el('div', { style: 'font-size:min(2.8vw,11px);color:#666;margin-top:1px;' });
    mgaTime.textContent = 'למג״א ' + fmt(todayT.sofZmanShmaMGA);
    bigWrap.appendChild(bigTime);
    bigWrap.appendChild(mgaTime);
    paper.appendChild(bigWrap);

    // ── Full week table ───────────────────────────────────────────────────
    var tbl = el('table', { style: 'width:100%;border-collapse:collapse;font-size:min(2.6vw,10.5px);border-top:1.5px solid #3a0a14;flex:1;' });

    var thead = el('thead');
    var headRow = el('tr');
    [
      { label: 'יום',      bg: '#ede5d3', col: '#3a0a14', dir: 'rtl' },
      { label: 'הנץ',     bg: '#ede5d3', col: '#3a0a14', dir: 'rtl' },
      { label: 'ק״ש',     bg: '#3a0a14', col: '#fff',    dir: 'rtl' },
      { label: 'מג״א',    bg: '#5a1a28', col: '#f0d8a8', dir: 'rtl' },
      { label: 'שקיעה',   bg: '#ede5d3', col: '#3a0a14', dir: 'rtl' },
    ].forEach(function(h) {
      var th = el('th', {
        style: 'padding:3px 2px;font-weight:700;background:' + h.bg + ';color:' + h.col + ';' +
               'direction:' + h.dir + ';text-align:center;border-bottom:1.5px solid #3a0a14;',
      });
      th.textContent = h.label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    tbl.appendChild(thead);

    var tbody = el('tbody');
    week.forEach(function(_, i) {
      var t        = state.weekData[i] || {};
      var isToday  = i === todayIdx;
      var isShab   = i === 6;
      var rowBg    = isToday ? 'rgba(139,26,43,.09)' : isShab ? 'rgba(212,165,32,.07)' : i % 2 ? '#fdfaf6' : '#fff';
      var dayCol   = isToday ? '#8b1a2b' : isShab ? '#5a3e00' : '#222';
      var dayWt    = isToday ? '800' : isShab ? '700' : '500';
      var border   = '1px solid rgba(200,180,150,.4)';

      var tr = el('tr', { style: 'background:' + rowBg + ';' });

      // Day name
      var tdDay = el('td', { style: 'padding:3px 3px;direction:rtl;text-align:center;font-weight:' + dayWt + ';color:' + dayCol + ';border-bottom:' + border + ';' });
      tdDay.textContent = DAYS_HE[i];

      // Sunrise
      var tdSun = cell(fmt(t.sunrise), isToday, '#555', border);

      // Sof zman shma GRA
      var tdGra = el('td', { style: 'padding:3px 2px;text-align:center;background:' + (isToday ? '#5a0f1e' : '#3a0a14') + ';color:#fff;font-weight:' + (isToday ? '900' : '700') + ';border-bottom:1px solid #2a0a10;' });
      tdGra.textContent = fmt(t.sofZmanShma);

      // Sof zman shma MGA
      var tdMga = el('td', { style: 'padding:3px 2px;text-align:center;background:' + (isToday ? 'rgba(90,26,40,.55)' : 'rgba(58,10,20,.18)') + ';color:' + (isToday ? '#fde8a0' : '#5a1a28') + ';font-weight:' + (isToday ? '700' : '500') + ';border-bottom:' + border + ';' });
      tdMga.textContent = fmt(t.sofZmanShmaMGA);

      // Sunset
      var tdSet = cell(fmt(t.sunset), isToday, '#555', border);

      [tdDay, tdSun, tdGra, tdMga, tdSet].forEach(function(td){ tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    paper.appendChild(tbl);

    // ── Tefila times ──────────────────────────────────────────────────────
    var tefila = el('div', {
      style: 'text-align:center;font-size:min(2.6vw,10px);color:#3a0a14;line-height:2;direction:rtl;' +
             'border-top:1px solid rgba(139,26,43,.25);padding-top:2%;margin-top:2%;',
    });
    tefila.innerHTML =
      '<div>ס״ז תפילה גר״א &nbsp; ' + fmt(todayT.sofZmanTfilla) + '</div>' +
      '<div>ס״ז תפילה מג״א &nbsp; ' + fmt(todayT.sofZmanTfillaMGA) + '</div>';
    paper.appendChild(tefila);

    // ── Live badge ────────────────────────────────────────────────────────
    var badge = el('div', {
      style: 'display:flex;align-items:center;justify-content:center;gap:5px;margin-top:2%;' +
             'background:rgba(237,229,211,.7);border:1px solid rgba(194,169,138,.6);' +
             'border-radius:20px;padding:2px 10px;align-self:center;',
    });
    badge.innerHTML =
      '<div style="width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 5px #22c55e;"></div>' +
      '<span style="font-size:min(2.2vw,8.5px);font-weight:700;color:#3a0a14;letter-spacing:.4px;">Live · hebcal.com</span>';
    paper.appendChild(badge);
  }

  // ── Data fetching ────────────────────────────────────────────────────────────
  function fetchData() {
    state.loading = true;
    state.error   = null;
    state.weekData = [];
    state.parasha  = '';
    state.hebrewDate = '';
    renderPaper();

    var c    = CITIES[state.cityIdx];
    var week = getWeek();
    var tz   = encodeURIComponent(c.tzid);

    var zmFetches = week.map(function(d) {
      return fetch('https://www.hebcal.com/zmanim?cfg=json&date=' + toDateStr(d) +
        '&latitude=' + c.lat + '&longitude=' + c.lng + '&tzid=' + tz + '&sec=0')
        .then(function(r){ return r.json(); })
        .then(function(j){ return j.times || {}; })
        .catch(function(){ return {}; });
    });

    var shFetch = fetch('https://www.hebcal.com/shabbat?cfg=json&latitude=' + c.lat +
      '&longitude=' + c.lng + '&tzid=' + tz + '&b=18&M=on&lg=s')
      .then(function(r){ return r.json(); }).catch(function(){ return {}; });

    var cvFetch = fetch('https://www.hebcal.com/converter?cfg=json&date=' + toDateStr(week[0]) + '&g2h=1')
      .then(function(r){ return r.json(); }).catch(function(){ return {}; });

    Promise.all(zmFetches.concat([shFetch, cvFetch])).then(function(res) {
      state.weekData   = res.slice(0, 7);
      var shData       = res[7] || {};
      var pItem        = (shData.items || []).find(function(i){ return i.category === 'parashat'; });
      state.parasha    = pItem ? pItem.hebrew : '';
      state.hebrewDate = (res[8] || {}).hebrew || '';
      state.loading    = false;
      renderPaper();
    }).catch(function(e) {
      console.error('[zmanim-widget]', e);
      state.error   = 'לא ניתן לטעון זמנים';
      state.loading = false;
      renderPaper();
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k){ node.setAttribute(k, attrs[k]); });
    return node;
  }

  function cell(text, isToday, color, border) {
    var td = el('td', { style: 'padding:3px 2px;text-align:center;color:' + (isToday ? '#3a0a14' : color) + ';border-bottom:' + border + ';font-weight:' + (isToday ? '700' : '400') + ';' });
    td.textContent = text;
    return td;
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var _orbTimer;
  function animateOrbs() {
    var container = document.getElementById('zmw-orbs');
    if (!container) return;
    container.innerHTML = '';
    [0, 1, 2].forEach(function(i) {
      var orb = el('div', { style: 'width:8px;height:8px;background:#8b1a2b;border-radius:50%;display:inline-block;margin:0 2px;' });
      container.appendChild(orb);
      var phase = 0;
      (function tick() {
        if (!document.getElementById('zmw-orbs')) return;
        var offset = Math.sin((Date.now() / 300) + i * 2) * 6;
        orb.style.transform = 'translateY(' + offset + 'px)';
        orb.style.opacity = 0.4 + (Math.sin((Date.now() / 300) + i * 2) + 1) * 0.3;
        requestAnimationFrame(tick);
      })();
    });
  }

  // ── Inject widget CSS (scoped to host element) ────────────────────────────────
  function injectStyles() {
    if (document.getElementById('zmw-styles')) return;
    var style = document.createElement('style');
    style.id = 'zmw-styles';
    style.textContent = [
      '#zmanim-widget * { box-sizing: border-box; }',
      '#zmw-paper { scrollbar-width: thin; }',
      '#zmw-paper::-webkit-scrollbar { width: 4px; }',
      '#zmw-paper::-webkit-scrollbar-thumb { background: #c2a98a; border-radius: 2px; }',
      '#zmw-city-btn:hover { filter: brightness(1.15); }',
      '#zmw-city-btn:focus { outline: 2px solid rgba(212,165,32,.6); outline-offset: 2px; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
