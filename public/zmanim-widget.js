/* Sof Zman Krias Shma Widget — theothermatthewmiller.com/zmanim-widget
   Embed: <div id="zmanim-widget"></div>
          <script src="https://theothermatthewmiller.com/zmanim-widget.js"></script> */
(function () {
  'use strict';

  var BASE = 'https://theothermatthewmiller.com';
  var BG   = BASE + '/images/zmanim-board-bg.png';
  var SITE = BASE + '/zmanim-widget';

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

  var DAYS_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  var MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function pad(n)      { return String(n).padStart(2,'0'); }
  function toDate(d)   { return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function getWeek()   {
    var now=new Date(),day=now.getDay(),sun=new Date(now);
    sun.setDate(now.getDate()-day);
    return Array.from({length:7},function(_,i){var d=new Date(sun);d.setDate(sun.getDate()+i);return d;});
  }
  function fmt(iso) {
    if(!iso)return'—';
    var m=iso.match(/T(\d{2}):(\d{2})/);
    return m?parseInt(m[1],10)+':'+m[2]:'—';
  }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function el(tag,attrs,children){
    var n=document.createElement(tag);
    if(attrs)Object.keys(attrs).forEach(function(k){
      if(k==='style'&&typeof attrs[k]==='object'){
        Object.assign(n.style,attrs[k]);
      } else {
        n.setAttribute(k,attrs[k]);
      }
    });
    if(children)children.forEach(function(c){if(c)n.appendChild(typeof c==='string'?document.createTextNode(c):c);});
    return n;
  }
  function div(style,children){ return el('div',{style:style},children); }

  // ── State ────────────────────────────────────────────────────────────────────
  var S = {
    cityIdx:5, weekData:[], parasha:'', hebrewDate:'',
    loading:true, error:null, open:false,
    baseFont:10,   // px — set by ResizeObserver
  };

  var wrap, paper, cityBtn, dropMenu;

  // ── Boot ─────────────────────────────────────────────────────────────────────
  function init() {
    var host=document.getElementById('zmanim-widget');
    if(!host)return;
    injectStyles();
    host.style.cssText='font-family:Georgia,"Times New Roman",serif;display:block;';

    // Outer — maintains image aspect ratio
    wrap=el('div',{style:'position:relative;width:100%;max-width:420px;aspect-ratio:1086/1448;margin:0 auto;'});

    // Background frame
    wrap.appendChild(el('img',{src:BG,alt:'','aria-hidden':'true',
      style:'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;'}));

    var overlay=div('position:absolute;inset:0;');

    // White paper — parchment zone: top 27%, bottom 17.5%, sides 14%
    paper=div([
      'position:absolute;top:27%;bottom:17.5%;left:14%;right:14%;',
      'background:#fff;',
      'box-shadow:0 2px 12px rgba(0,0,0,.22),0 1px 4px rgba(0,0,0,.12);',
      'display:flex;flex-direction:column;overflow:hidden;',
      'padding:0;box-sizing:border-box;',
    ].join(''));
    overlay.appendChild(paper);

    // Transparent footer link over baked-in logo
    overlay.appendChild(el('a',{
      href:SITE,target:'_blank',rel:'noopener noreferrer',
      'aria-label':'theothermatthewmiller.com/zmanim-widget',
      style:'position:absolute;top:82.5%;left:17%;right:17%;height:10%;z-index:20;cursor:pointer;border-radius:4px;',
    }));

    wrap.appendChild(overlay);
    host.appendChild(wrap);

    // Scale base font whenever container resizes
    if(window.ResizeObserver){
      new ResizeObserver(function(entries){
        var w=entries[0].contentRect.width;
        S.baseFont=Math.min(11,Math.max(6.5,w*0.026));
        renderPaper();
      }).observe(wrap);
    } else {
      S.baseFont=10;
    }

    // Close dropdown on outside click
    document.addEventListener('click',function(e){
      if(dropMenu&&!wrap.contains(e.target)){closeDropdown();}
    });

    fetchData();
  }

  // ── Render paper ──────────────────────────────────────────────────────────────
  function renderPaper() {
    if(!paper)return;
    paper.innerHTML='';
    var b=S.baseFont; // shorthand

    // ── City selector row (inside the paper, at the very top) ─────────────────
    var cityRow=div([
      'display:flex;align-items:center;justify-content:center;',
      'background:linear-gradient(135deg,#5a0f1e,#3a0a14);',
      'padding:'+(b*0.35)+'px '+(b*0.6)+'px;',
      'position:relative;flex-shrink:0;',
    ].join(''));

    cityBtn=el('button',{
      id:'zmw-city-btn',
      style:[
        'background:transparent;border:none;color:#f5e8d0;',
        'font-size:'+b+'px;cursor:pointer;font-family:inherit;font-weight:700;',
        'letter-spacing:.3px;display:flex;align-items:center;gap:'+(b*.4)+'px;',
        'padding:0;',
      ].join(''),
    });
    cityBtn.textContent='📍 '+CITIES[S.cityIdx].label+' ▾';
    cityBtn.addEventListener('click',function(e){
      e.stopPropagation();
      S.open=!S.open;
      if(S.open)openDropdown(); else closeDropdown();
    });
    cityRow.appendChild(cityBtn);

    // Dropdown anchor
    dropMenu=null;
    var dropAnchor=div('position:absolute;top:100%;left:50%;transform:translateX(-50%);z-index:999;');
    cityRow.appendChild(dropAnchor);
    paper.appendChild(cityRow);

    if(S.open){
      var menu=div([
        'background:#1e0608;border:1px solid #8b1a2b;border-radius:4px;',
        'min-width:180px;max-height:200px;overflow-y:auto;',
        'box-shadow:0 8px 28px rgba(0,0,0,.75);',
      ].join(''));
      CITIES.forEach(function(c,i){
        var item=div([
          'padding:'+(b*0.55)+'px '+(b*1.2)+'px;font-size:'+(b*.95)+'px;cursor:pointer;',
          'border-bottom:1px solid rgba(255,255,255,.05);',
          'color:'+(i===S.cityIdx?'#f5c842':'#f0e8dc')+';',
          'font-weight:'+(i===S.cityIdx?'700':'400')+';',
          'background:'+(i===S.cityIdx?'rgba(139,26,43,.4)':'transparent')+';',
        ].join(''));
        item.textContent=(i===S.cityIdx?'✓ ':'   ')+c.label;
        item.addEventListener('mouseenter',function(){this.style.background='rgba(139,26,43,.25)';});
        item.addEventListener('mouseleave',function(){this.style.background=i===S.cityIdx?'rgba(139,26,43,.4)':'transparent';});
        item.addEventListener('click',function(e){
          e.stopPropagation();
          S.cityIdx=i; S.open=false;
          closeDropdown();
          fetchData();
        });
        menu.appendChild(item);
      });
      dropMenu=menu;
      dropAnchor.appendChild(menu);
    }

    // ── Content area ────────────────────────────────────────────────────────────
    var content=div('flex:1;overflow:hidden;display:flex;flex-direction:column;padding:'+(b*.5)+'px '+(b*.7)+'px '+(b*.4)+'px;gap:'+(b*.3)+'px;');
    paper.appendChild(content);

    if(S.loading){
      var ldg=div('flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:'+(b*.6)+'px;');
      ldg.innerHTML='<div style="display:flex;gap:4px;" id="zmw-orbs"></div>'+
        '<div style="font-size:'+b+'px;color:#8b1a2b;direction:rtl;">טוען זמנים…</div>';
      content.appendChild(ldg);
      animateOrbs();
      return;
    }

    if(S.error){
      var errWrap=div('flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:'+(b*.7)+'px;direction:rtl;');
      var errMsg=div('font-size:'+b+'px;color:#8b1a2b;');
      errMsg.textContent=S.error;
      var retryBtn=el('button',{style:'padding:'+(b*.3)+'px '+(b*.9)+'px;font-size:'+(b*.9)+'px;background:#8b1a2b;color:#fff;border:none;cursor:pointer;border-radius:3px;font-family:inherit;'});
      retryBtn.textContent='נסה שוב';
      retryBtn.addEventListener('click',fetchData);
      errWrap.appendChild(errMsg); errWrap.appendChild(retryBtn);
      content.appendChild(errWrap);
      return;
    }

    var week=getWeek(), todayIdx=new Date().getDay();
    var s=week[0],e=week[6];
    var dateRange=s.getMonth()===e.getMonth()
      ?MONTHS[s.getMonth()]+' '+s.getDate()+'–'+e.getDate()
      :MONTHS[s.getMonth()]+' '+s.getDate()+' – '+MONTHS[e.getMonth()]+' '+e.getDate();
    var todayT=S.weekData[todayIdx]||{};

    // Parasha + date (single compact line)
    var hdr=div('text-align:center;direction:rtl;flex-shrink:0;line-height:1.25;');
    hdr.innerHTML=
      '<div style="font-size:'+(b*1.55)+'px;font-weight:800;color:#3a0a14;">'+esc(S.parasha||'פרשת השבוע')+'</div>'+
      (S.hebrewDate?'<div style="font-size:'+(b*.78)+'px;color:#999;">'+esc(S.hebrewDate)+'</div>':'')+
      '<div style="font-size:'+(b*.9)+'px;font-weight:600;color:#555;direction:ltr;">'+esc(dateRange)+'</div>';
    content.appendChild(hdr);

    // Big time
    var bigWrap=div('text-align:center;flex-shrink:0;line-height:1;');
    bigWrap.innerHTML=
      '<div style="font-size:'+(b*4.4)+'px;font-weight:900;color:#111;letter-spacing:-1px;font-variant-numeric:tabular-nums;line-height:1;">'+fmt(todayT.sofZmanShma)+'</div>'+
      '<div style="font-size:'+(b*.88)+'px;color:#666;margin-top:1px;">למג״א '+fmt(todayT.sofZmanShmaMGA)+'</div>';
    content.appendChild(bigWrap);

    // Full week table
    var tbl=el('table',{style:'width:100%;border-collapse:collapse;font-size:'+(b*.84)+'px;border-top:1.5px solid #3a0a14;flex-shrink:0;'});
    var thead=el('thead'),hRow=el('tr');
    [{t:'יום',bg:'#ede5d3',c:'#3a0a14'},{t:'הנץ',bg:'#ede5d3',c:'#3a0a14'},
     {t:'ק״ש',bg:'#3a0a14',c:'#fff'},{t:'מג״א',bg:'#5a1a28',c:'#f0d8a8'},{t:'שקיעה',bg:'#ede5d3',c:'#3a0a14'}
    ].forEach(function(h){
      var th=el('th',{style:'padding:'+(b*.28)+'px '+(b*.2)+'px;font-weight:700;background:'+h.bg+';color:'+h.c+';direction:rtl;text-align:center;border-bottom:1.5px solid #3a0a14;'});
      th.textContent=h.t; hRow.appendChild(th);
    });
    thead.appendChild(hRow); tbl.appendChild(thead);

    var tbody=el('tbody');
    week.forEach(function(_,i){
      var t=S.weekData[i]||{}, isToday=i===todayIdx, isShab=i===6;
      var rowBg=isToday?'rgba(139,26,43,.09)':isShab?'rgba(212,165,32,.07)':i%2?'#fdfaf6':'#fff';
      var bdr='1px solid rgba(200,180,150,.4)';
      var p=b*.26+'px '+(b*.2)+'px';
      var tr=el('tr',{style:'background:'+rowBg+';'});

      var tdDay=el('td',{style:'padding:'+p+';direction:rtl;text-align:center;font-weight:'+(isToday?'800':isShab?'700':'500')+';color:'+(isToday?'#8b1a2b':isShab?'#5a3e00':'#222')+';border-bottom:'+bdr+';'});
      tdDay.textContent=DAYS_HE[i];

      var tdSun=el('td',{style:'padding:'+p+';text-align:center;color:'+(isToday?'#3a0a14':'#555')+';border-bottom:'+bdr+';font-weight:'+(isToday?'700':'400')+';'});
      tdSun.textContent=fmt(t.sunrise);

      var tdGra=el('td',{style:'padding:'+p+';text-align:center;background:'+(isToday?'#5a0f1e':'#3a0a14')+';color:#fff;font-weight:'+(isToday?'900':'700')+';border-bottom:1px solid #2a0a10;'});
      tdGra.textContent=fmt(t.sofZmanShma);

      var tdMga=el('td',{style:'padding:'+p+';text-align:center;background:'+(isToday?'rgba(90,26,40,.55)':'rgba(58,10,20,.15)')+';color:'+(isToday?'#fde8a0':'#5a1a28')+';font-weight:'+(isToday?'700':'500')+';border-bottom:'+bdr+';'});
      tdMga.textContent=fmt(t.sofZmanShmaMGA);

      var tdSet=el('td',{style:'padding:'+p+';text-align:center;color:'+(isToday?'#3a0a14':'#555')+';border-bottom:'+bdr+';font-weight:'+(isToday?'700':'400')+';'});
      tdSet.textContent=fmt(t.sunset);

      [tdDay,tdSun,tdGra,tdMga,tdSet].forEach(function(td){tr.appendChild(td);});
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    content.appendChild(tbl);

    // Tefila + live badge
    var footer=div('text-align:center;flex-shrink:0;border-top:1px solid rgba(139,26,43,.2);padding-top:'+(b*.35)+'px;');
    footer.innerHTML=
      '<div style="font-size:'+(b*.82)+'px;color:#3a0a14;direction:rtl;line-height:1.9;">'+
        '<span>ס״ז תפילה גר״א &nbsp;'+fmt(todayT.sofZmanTfilla)+'</span>'+
        ' &nbsp;·&nbsp; '+
        '<span>מג״א '+fmt(todayT.sofZmanTfillaMGA)+'</span>'+
      '</div>'+
      '<div style="display:inline-flex;align-items:center;gap:4px;margin-top:'+(b*.25)+'px;'+
        'background:rgba(237,229,211,.7);border:1px solid rgba(194,169,138,.6);border-radius:20px;padding:1px 8px;">'+
        '<div style="width:5px;height:5px;border-radius:50%;background:#22c55e;box-shadow:0 0 4px #22c55e;"></div>'+
        '<span style="font-size:'+(b*.72)+'px;font-weight:700;color:#3a0a14;letter-spacing:.3px;">Live · hebcal.com</span>'+
      '</div>';
    content.appendChild(footer);
  }

  function openDropdown(){ S.open=true; renderPaper(); }
  function closeDropdown(){ S.open=false; renderPaper(); }

  // ── Data fetching ─────────────────────────────────────────────────────────────
  function fetchData(){
    S.loading=true; S.error=null; S.weekData=[]; S.parasha=''; S.hebrewDate='';
    renderPaper();
    var c=CITIES[S.cityIdx], week=getWeek(), tz=encodeURIComponent(c.tzid);
    var zmF=week.map(function(d){
      return fetch('https://www.hebcal.com/zmanim?cfg=json&date='+toDate(d)+'&latitude='+c.lat+'&longitude='+c.lng+'&tzid='+tz+'&sec=0')
        .then(function(r){return r.json();}).then(function(j){return j.times||{};}).catch(function(){return{};});
    });
    var shF=fetch('https://www.hebcal.com/shabbat?cfg=json&latitude='+c.lat+'&longitude='+c.lng+'&tzid='+tz+'&b=18&M=on&lg=s').then(function(r){return r.json();}).catch(function(){return{};});
    var cvF=fetch('https://www.hebcal.com/converter?cfg=json&date='+toDate(week[0])+'&g2h=1').then(function(r){return r.json();}).catch(function(){return{};});
    Promise.all(zmF.concat([shF,cvF])).then(function(res){
      S.weekData=res.slice(0,7);
      var pItem=(res[7].items||[]).find(function(i){return i.category==='parashat';});
      S.parasha=pItem?pItem.hebrew:'';
      S.hebrewDate=(res[8]||{}).hebrew||'';
      S.loading=false; renderPaper();
    }).catch(function(e){
      console.error('[zmanim-widget]',e);
      S.error='לא ניתן לטעון זמנים'; S.loading=false; renderPaper();
    });
  }

  // ── Loading animation ─────────────────────────────────────────────────────────
  function animateOrbs(){
    var c=document.getElementById('zmw-orbs');
    if(!c)return;
    c.innerHTML='';
    [0,1,2].forEach(function(i){
      var o=el('div',{style:'width:7px;height:7px;background:#8b1a2b;border-radius:50%;display:inline-block;'});
      c.appendChild(o);
      (function tick(){
        if(!document.getElementById('zmw-orbs'))return;
        var v=Math.sin(Date.now()/280+i*2);
        o.style.transform='translateY('+(v*6)+'px)';
        o.style.opacity=0.4+(v+1)*0.3;
        requestAnimationFrame(tick);
      })();
    });
  }

  // ── Styles ────────────────────────────────────────────────────────────────────
  function injectStyles(){
    if(document.getElementById('zmw-styles'))return;
    var s=document.createElement('style');
    s.id='zmw-styles';
    s.textContent=[
      '#zmanim-widget *{box-sizing:border-box;}',
      '#zmw-city-btn:hover{opacity:.85;}',
      '#zmw-city-btn:focus{outline:2px solid rgba(212,165,32,.6);outline-offset:2px;}',
    ].join('');
    document.head.appendChild(s);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  } else {
    init();
  }

})();
