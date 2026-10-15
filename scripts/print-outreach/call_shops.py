#!/usr/bin/env python3
"""Call print shops in Hebrew with Vapi and ask for a bulk quote on the Leshem Yichud card.

Dry run by default: it prints who it would call. Add --go to place calls.

  python3 scripts/print-outreach/call_shops.py              # list the next shops
  python3 scripts/print-outreach/call_shops.py --go --limit 3

Shops come from Supabase print_shops (status 'new', with a phone, by priority). Each finished call
is posted by Vapi to the vapi-print-calls edge function, which stores the recording, transcript,
summary and extracted prices in print_shop_calls / print_quotes and updates the shop's status.

Cost: Azure Hebrew voice and transcriber plus gpt-4o-mini, capped at 150 s per call, from the
Twilio number (US caller ID). Roughly $0.15–0.40 per answered call. --budget stops the run once
Vapi's reported spend for this run reaches it.

Needs in .env: VAPI_API_KEY, VAPI_WEBHOOK_TOKEN, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
Call shops Sunday–Thursday, 10:00–16:00 Israel time.
"""
import argparse
import json
import os
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for line in (ROOT / '.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"'))

VAPI = 'https://api.vapi.ai'
SB = os.environ['PUBLIC_SUPABASE_URL']
WEBHOOK = f'{SB}/functions/v1/vapi-print-calls'
PHONE_NUMBER_ID = '24085f84-383d-491b-957d-4a77f7b1f300'  # "RJD" Twilio number; the Vapi number is US-only
QUOTE_LINK = 'theothermatthewmiller.com/print-quote'

PROMPT = f"""את/ה עוזר/ת קולי/ת אוטומטי/ת שמתקשר/ת בשם מתיו מילר מרעננה לבית דפוס תלת מימד.
דבר/י עברית טבעית, קצרה ומנומסת. משפט או שניים בכל פעם, ותן/י לצד השני לדבר.

בתחילת השיחה אמור/י שאת/ה עוזר/ת אוטומטי/ת ושהשיחה מוקלטת לצורך תיעוד ההצעה.

המטרה: הצעת מחיר להדפסה בכמות של כרטיס תפילה קטן לתיק התפילין.
- PLA, שלושה צבעים: כחול כהה, לבן וזהב. FDM, שכבה 0.2. אפשר עם AMS או החלפת סליל ידנית.
- גודל כיס: 8 על 11.5 ס״מ, עובי 2.6 מ״מ, בערך 20 גרם, בערך 55 דקות הדפסה ליחידה.
- יש גם גודל רגיל: 10.5 על 15 ס״מ, בערך 35 גרם.
- כמויות: 25, 50, 100, 250.
- הקבצים (3MF ו-STL) מוכנים באתר: {QUOTE_LINK}  — אפשר להקריא: "דה אָדֶר מָתְיוּ מִילֶר נקודה קום, סלאש פְּרִינְט קְווֹט".

שאל/י: האם הם מדפיסים בשלושה צבעים, מחיר ליחידה לכל כמות, זמן אספקה, ושם ואימייל או וואטסאפ לשליחת הקבצים.
אם מבקשים לשלוח בוואטסאפ או במייל: אמור/י שמתיו יחזור אליהם עם הקבצים, ורשום/י את הפרטים.
אם אין להם מחיר עכשיו: בקש/י שיכניסו הצעה בקישור, או שמתיו יחזור אליהם.
אם לא מעוניינים או מבקשים לא להתקשר: הודה/י בנימוס וסיים/י מיד.
אל תתחייב/י להזמנה ואל תמסור/י מידע אישי נוסף. השיחה עד שתי דקות. סיים/י בתודה."""

FIRST = 'שלום, אני עוזר אוטומטי שמתקשר בשם מתיו מילר מרעננה, והשיחה מוקלטת. רציתי לשאול על הצעת מחיר להדפסת תלת מימד בכמות. יש לך דקה?'

SCHEMA = {
    'type': 'object',
    'properties': {
        'multicolor': {'type': 'boolean', 'description': 'Can they print the three colours'},
        'size': {'type': 'string', 'description': 'pocket or standard, whichever the prices are for'},
        'price_25': {'type': 'number', 'description': 'ILS per unit at 25 units'},
        'price_50': {'type': 'number'},
        'price_100': {'type': 'number'},
        'price_250': {'type': 'number'},
        'unit_price': {'type': 'number', 'description': 'ILS per unit if only one figure was given'},
        'setup_fee': {'type': 'number'},
        'lead_time': {'type': 'string'},
        'contact_name': {'type': 'string'},
        'email': {'type': 'string'},
        'whatsapp': {'type': 'string'},
        'wants_files_sent': {'type': 'boolean'},
        'callback_needed': {'type': 'boolean'},
        'do_not_call': {'type': 'boolean', 'description': 'They asked not to be called again'},
        'notes': {'type': 'string', 'description': 'Anything else relevant, in English'},
    },
}

ASSISTANT = {
    'name': 'Print quote caller (Hebrew)',
    'firstMessage': FIRST,
    'model': {'provider': 'openai', 'model': 'gpt-4o-mini', 'temperature': 0.4,
              'messages': [{'role': 'system', 'content': PROMPT}]},
    'voice': {'provider': 'azure', 'voiceId': 'he-IL-AvriNeural'},
    'transcriber': {'provider': 'azure', 'language': 'he-IL'},
    'maxDurationSeconds': 150,
    'silenceTimeoutSeconds': 20,
    'voicemailDetection': {'provider': 'vapi'},
    'endCallPhrases': ['להתראות', 'תודה רבה ולהתראות'],
    'artifactPlan': {'recordingEnabled': True},
    'analysisPlan': {
        'summaryPlan': {'enabled': True},
        'structuredDataPlan': {'enabled': True, 'schema': SCHEMA},
    },
    'server': {'url': WEBHOOK, 'headers': {'x-outreach-token': os.environ.get('VAPI_WEBHOOK_TOKEN', '')}},
    'serverMessages': ['end-of-call-report'],
}


def req(method, url, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json', **(headers or {})})
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read() or 'null')


def vapi(method, path, body=None):
    return req(method, VAPI + path, body, {'Authorization': f"Bearer {os.environ['VAPI_API_KEY']}"})


def sb(method, path, body=None):
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    return req(method, f'{SB}/rest/v1/{path}', body, {'apikey': key, 'Authorization': f'Bearer {key}', 'Prefer': 'return=representation'})


def assistant_id():
    for a in vapi('GET', '/assistant?limit=100'):
        if a.get('name') == ASSISTANT['name']:
            vapi('PATCH', f"/assistant/{a['id']}", ASSISTANT)
            return a['id']
    return vapi('POST', '/assistant', ASSISTANT)['id']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--go', action='store_true', help='place the calls (default is a dry run)')
    ap.add_argument('--limit', type=int, default=3)
    ap.add_argument('--budget', type=float, default=2.0, help='stop once this run has spent this many USD')
    args = ap.parse_args()

    shops = sb('GET', 'print_shops?status=eq.new&phone=not.is.null&order=priority,id&select=id,name,city,phone')[: args.limit]
    for s in shops:
        print(f"{s['id']:>3}  {s['name']:<28} {s['city']:<20} {s['phone']}")
    if not args.go:
        print('\nDry run. Add --go to call these shops.')
        return

    aid = assistant_id()
    spent = 0.0
    for s in shops:
        if spent >= args.budget:
            print(f'Budget reached (${spent:.2f}); stopping.')
            break
        call = vapi('POST', '/call', {
            'assistantId': aid,
            'phoneNumberId': PHONE_NUMBER_ID,
            'customer': {'number': s['phone'], 'name': s['name']},
            'metadata': {'shop_id': s['id']},
        })
        print(f"Calling {s['name']} ({call['id']})…", flush=True)
        while True:
            time.sleep(10)
            c = vapi('GET', f"/call/{call['id']}")
            if c.get('status') == 'ended':
                break
        spent += float(c.get('cost') or 0)
        print(f"  ended: {c.get('endedReason')}  cost ${c.get('cost')}  (run total ${spent:.2f})")
        print(f"  {(c.get('analysis') or {}).get('summary') or ''}")


if __name__ == '__main__':
    main()
