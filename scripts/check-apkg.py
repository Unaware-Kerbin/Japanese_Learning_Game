import json
import sqlite3
import sys
import tempfile
import zipfile

path, expect_path = sys.argv[1], sys.argv[2]
expect = json.loads(open(expect_path, encoding='utf-8').read())
with zipfile.ZipFile(path) as package:
    names = set(package.namelist())
    if 'collection.anki2' not in names or 'media' not in names:
        raise SystemExit(f'missing collection structure: {sorted(names)}')
    media = json.loads(package.read('media').decode('utf-8'))
    if media != {}:
        raise SystemExit(f'media map is {media!r}')
    raw = package.read('collection.anki2')

if not raw.startswith(b'SQLite format 3'):
    raise SystemExit('collection.anki2 is not a sqlite database')

handle = tempfile.NamedTemporaryFile(suffix='.anki2')
handle.write(raw)
handle.flush()
db = sqlite3.connect(handle.name)
notes = db.execute('select count(*) from notes').fetchone()[0]
cards = db.execute('select count(*) from cards').fetchone()[0]
if notes != expect['count'] or cards != notes:
    raise SystemExit(f'note count {notes} cards {cards} expected {expect["count"]}')

models = json.loads(db.execute('select models from col').fetchone()[0])
decks = json.loads(db.execute('select decks from col').fetchone()[0])
model = next(iter(models.values()))
if model.get('name') != 'Michi Dojo':
    raise SystemExit(f'model name {model.get("name")!r}')
fields = [field.get('name') for field in model.get('flds', [])]
if fields != ['Front', 'Back', 'Extra']:
    raise SystemExit(f'fields {fields}')
if not model.get('tmpls'):
    raise SystemExit('model has no cards')

deck = next((item for item in decks.values() if item.get('name') == 'Michi Dojo'), None)
if deck is None:
    raise SystemExit('deck Michi Dojo is missing')
desc = deck.get('desc') or ''
for fact in ('OpenJLPT', 'CC BY-SA 4.0', 'EDRDG', 'JMdict/KANJIDIC2', 'Jonathan Waller', 'Tatoeba', 'original'):
    if fact not in desc:
        raise SystemExit(f'description missing {fact}')

rows = db.execute(
    '''select notes.flds, notes.tags, cards.due
       from cards join notes on notes.id = cards.nid
       order by cards.due'''
).fetchall()
fronts = []
for flds, tags, _due in rows:
    parts = flds.split('\x1f')
    if len(parts) != 3 or not parts[0].strip() or not parts[1].strip():
        raise SystemExit('empty note field')
    if ' michi ' not in f' {tags} ':
        raise SystemExit(f'tags missing michi: {tags!r}')
    fronts.append(parts[0])

if fronts != expect['fronts']:
    raise SystemExit('exported fronts do not match the lesson order')

print(notes)
