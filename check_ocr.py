import urllib.request
import json
r = urllib.request.urlopen('http://localhost:8000/api/forms')
forms = json.loads(r.read())
form = forms[-1]
words = form.get('extracted_data', {}).get('page1', [])
for w in words:
    if w['text'].lower() in ['latest', 'date-stamped', 'digital', 'photo', 'signature', 'inside', 'column']:
        print(f"{w['text']}: {w['bbox']}")
