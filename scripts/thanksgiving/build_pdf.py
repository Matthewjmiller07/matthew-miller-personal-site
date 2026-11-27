"""Build the printable Thanksgiving gratitude source sheet.

Reads src/data/thanksgiving-gratitude.json and the film stills in public/thanksgiving/stills,
renders a letter-size booklet with Playwright, and writes public/thanksgiving/gratitude-source-sheet.pdf.

    python3 scripts/thanksgiving/build_pdf.py
"""
import base64, html, io, json, pathlib
import qrcode
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / "src/data/thanksgiving-gratitude.json").read_text())
STILLS = ROOT / "public/thanksgiving/stills"
OUT = ROOT / "public/thanksgiving/gratitude-source-sheet.pdf"
URL = "https://theothermatthewmiller.com/thanksgiving"

# Section index -> film still used as its opener (None = typographic opener)
OPENER = {0: None, 1: "still1.jpg", 2: None, 3: "still0.jpg", 4: "still3.jpg", 5: "still2.jpg"}


def data_uri(path, mime="image/jpeg"):
    return f"data:{mime};base64," + base64.b64encode(pathlib.Path(path).read_bytes()).decode()


def qr_uri(text):
    img = qrcode.make(text, border=1, box_size=8)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


e = lambda s: html.escape(s or "")


def para(s):
    return "".join(f"<p>{e(p)}</p>" for p in (s or "").split("\n\n"))


def source_html(n, s):
    he = f'<div class="he" dir="rtl" lang="he">{e(s["he"])}</div>' if s.get("he") else ""
    note = f'<div class="note">{e(s["note"])}</div>' if s.get("note") else ""
    cls = "src two" if s.get("he") else "src"
    return f"""
    <article class="{cls}">
      <header><span class="n">{n:02d}</span><span class="au">{e(s['author'])}</span><span class="ref">{e(s['ref'])}</span></header>
      <div class="body">{he}<div class="en">{para(s.get('en'))}</div></div>
      {note}
    </article>"""


def build():
    secs, n = [], 0
    for i, sec in enumerate(DATA["sections"]):
        img = OPENER.get(i)
        if img:
            opener = f"""<div class="opener photo" style="background-image:url('{data_uri(STILLS / img)}')">
              <div class="ot"><div class="num">{['I','II','III','IV','V','VI'][i]}</div>
              <div class="ohe" dir="rtl">{e(sec['title_he'])}</div><h2>{e(sec['title'])}</h2><p>{e(sec['blurb'])}</p></div></div>"""
        else:
            opener = f"""<div class="opener type"><div class="num">{['I','II','III','IV','V','VI'][i]}</div>
              <div class="ohe big" dir="rtl">{e(sec['title_he'])}</div><h2>{e(sec['title'])}</h2><p>{e(sec['blurb'])}</p></div>"""
        items = []
        for s in sec["sources"]:
            n += 1
            items.append(source_html(n, s))
        secs.append(f'<section class="sec">{opener}{"".join(items)}</section>')

    qs = "".join(f"<li>{e(q)}</li>" for q in DATA["questions"])
    cover = data_uri(STILLS / "still2.jpg")
    doc = f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Frank+Ruhl+Libre:wght@400;500;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
  @page {{ size: letter; margin: 0.6in 0.65in 0.7in; }}
  @page :first {{ margin: 0; }}
  :root {{ --ink:#2a1a10; --soft:#5b4636; --gold:#b07a26; --ember:#a8471c; --rule:#e5d6bd; --wash:#faf3e6; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; font-family:'Cormorant Garamond', Georgia, serif; color:var(--ink); font-size:12.4pt; line-height:1.36; font-weight:500; }}
  .cover {{ position:relative; width:8.5in; height:11in; background:#120b07 url('{cover}') center/cover; page-break-after:always; color:#fbf3e4; }}
  .cover::after {{ content:''; position:absolute; inset:0; background:linear-gradient(180deg, rgba(18,11,7,.15) 0%, rgba(18,11,7,.55) 45%, rgba(18,11,7,.94) 78%); }}
  .cover .in {{ position:absolute; left:0.8in; right:0.8in; bottom:0.9in; z-index:2; }}
  .kick {{ font-family:Inter, sans-serif; font-weight:600; font-size:9pt; letter-spacing:.32em; text-transform:uppercase; color:#e8b965; }}
  .cover h1 {{ font-size:88pt; font-weight:600; margin:.08in 0 0; line-height:.95; }}
  .cover .he {{ font-family:'Frank Ruhl Libre', serif; font-size:34pt; color:#e8b965; margin-top:.1in; }}
  .cover .sub {{ font-size:17pt; font-style:italic; max-width:5.6in; margin-top:.18in; line-height:1.25; }}
  .cover .meta {{ font-family:Inter, sans-serif; font-size:9pt; letter-spacing:.12em; color:#d8c6aa; margin-top:.35in; display:flex; justify-content:space-between; align-items:flex-end; }}
  .cover .meta img {{ width:.85in; height:.85in; border:4px solid #fbf3e4; }}
  .intro {{ font-size:14.5pt; line-height:1.45; font-style:italic; color:var(--soft); border-left:3px solid var(--gold); padding:.05in 0 .05in .2in; margin:0 0 .3in; }}
  .toc {{ columns:2; column-gap:.4in; font-size:12pt; margin-bottom:.2in; }}
  .toc div {{ break-inside:avoid; padding:.06in 0; border-bottom:1px solid var(--rule); display:flex; gap:.12in; }}
  .toc b {{ font-family:Inter, sans-serif; font-size:8.5pt; color:var(--gold); width:.3in; padding-top:3px; }}
  .sec {{ margin-top:.4in; }}
  .opener {{ margin:0 0 .25in; break-inside:avoid; break-after:avoid; }}
  .src:first-of-type {{ break-before:avoid; }}
  .opener.photo {{ height:3.1in; background-size:cover; background-position:center; border-radius:3px; position:relative; color:#fbf3e4; }}
  .opener.photo::after {{ content:''; position:absolute; inset:0; border-radius:3px; background:linear-gradient(90deg, rgba(18,11,7,.9) 0%, rgba(18,11,7,.55) 55%, rgba(18,11,7,.1) 100%); }}
  .opener .ot {{ position:absolute; left:.35in; bottom:.3in; right:2.2in; z-index:2; }}
  .opener.type {{ border-top:2px solid var(--gold); border-bottom:1px solid var(--rule); padding:.25in 0 .2in; }}
  .num {{ font-family:Inter, sans-serif; font-weight:600; font-size:9pt; letter-spacing:.3em; color:#e8b965; }}
  .opener.type .num {{ color:var(--gold); }}
  .ohe {{ font-family:'Frank Ruhl Libre', serif; font-size:24pt; color:#e8b965; text-align:left; }}
  .ohe.big {{ font-size:34pt; color:var(--gold); }}
  .opener h2 {{ font-size:30pt; font-weight:600; margin:.02in 0 .04in; line-height:1; }}
  .opener p {{ margin:0; font-style:italic; font-size:13.5pt; }}
  .opener.type p {{ color:var(--soft); }}
  .src {{ break-inside:avoid; padding:.14in 0 .16in; border-bottom:1px solid var(--rule); }}
  .src header {{ display:flex; align-items:baseline; gap:.12in; margin-bottom:.06in; }}
  .src .n {{ font-family:Inter, sans-serif; font-size:8pt; font-weight:600; color:var(--gold); }}
  .src .au {{ font-weight:600; font-size:13.5pt; }}
  .src .ref {{ font-family:Inter, sans-serif; font-size:8pt; letter-spacing:.06em; color:var(--soft); text-transform:uppercase; margin-left:auto; text-align:right; max-width:3in; }}
  .src.two .body {{ display:grid; grid-template-columns: 1fr 1fr; gap:.25in; }}
  .src.two .body .he {{ order:2; }}
  .src .he {{ font-family:'Frank Ruhl Libre', serif; font-size:13.5pt; line-height:1.6; text-align:right; }}
  .src .en p {{ margin:0 0 .06in; }}
  .note {{ margin-top:.06in; font-family:Inter, sans-serif; font-size:8.6pt; color:var(--ember); }}
  .end {{ page-break-before:always; }}
  .end h2 {{ font-size:30pt; font-weight:600; margin:0 0 .05in; }}
  .end ol {{ font-size:15pt; line-height:1.4; padding-left:.3in; }}
  .end ol li {{ margin-bottom:.16in; padding-left:.08in; }}
  .practice {{ background:var(--wash); border:1px solid var(--rule); padding:.25in .3in; margin-top:.3in; border-radius:3px; }}
  .practice h3 {{ margin:0 0 .08in; font-size:18pt; }}
  .practice p {{ margin:0 0 .08in; }}
  .close {{ text-align:center; margin-top:.45in; }}
  .close .he {{ font-family:'Frank Ruhl Libre', serif; font-size:26pt; color:var(--gold); }}
  .close .en {{ font-style:italic; font-size:15pt; }}
</style></head><body>
<div class="cover"><div class="in">
  <div class="kick">A Thanksgiving source sheet</div>
  <h1>Gratitude</h1>
  <div class="he" dir="rtl">{e(DATA['title_he'])}</div>
  <div class="sub">From Adam's ingratitude to Leah's thanks, and why gratitude has to flow through us.</div>
  <div class="meta"><div>MATTHEW MILLER &nbsp;·&nbsp; THANKSGIVING 2026<br><br>Film, sheet and more: theothermatthewmiller.com/thanksgiving</div><img src="{qr_uri(URL)}"></div>
</div></div>
<div class="intro">{e(DATA['intro'])}</div>
<div class="toc">{''.join(f"<div><b>{['I','II','III','IV','V','VI'][i]}</b><span>{e(s['title'])}</span></div>" for i, s in enumerate(DATA['sections']))}</div>
{''.join(secs)}
<div class="end">
  <div class="kick" style="color:var(--gold)">At the table</div>
  <h2>Questions to pass around</h2>
  <ol>{qs}</ol>
  <div class="practice"><h3>A five-minute todah</h3>
    <p>The thanksgiving offering couldn't be finished alone, so you had to invite people. Before dessert, go around the table: each person names one thing they were given this year that they did not make or earn, and one person they will thank this week who isn't here.</p>
    <p>Then say it the old way: <i>Modeh ani</i>, "I admit it: I needed help."</p></div>
  <div class="close"><div class="he" dir="rtl">הוֹדוּ לַה׳ כִּי טוֹב</div><div class="en">Give thanks, for it is good.</div></div>
</div>
</body></html>"""
    with sync_playwright() as p:
        try:
            b = p.chromium.launch()
        except Exception:  # Python playwright without its own browser: use the preinstalled one
            b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])
        pg = b.new_page()
        pg.set_content(doc, wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        pg.pdf(path=str(OUT), format="Letter", print_background=True,
               display_header_footer=True, header_template="<span></span>",
               footer_template='<div style="width:100%;font-family:Inter,sans-serif;font-size:7pt;color:#9b8670;text-align:center;letter-spacing:.15em">GRATITUDE · A THANKSGIVING SOURCE SHEET · <span class="pageNumber"></span></div>')
        b.close()
    print(OUT, OUT.stat().st_size)


if __name__ == "__main__":
    build()
