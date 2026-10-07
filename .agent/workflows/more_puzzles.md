---
description: How to generate more puzzle days when the user says "More puzzles" (three rounds per day)
---

When the user prompts you with "More puzzles", you must generate exactly 30 days of new puzzle days and append them to `public/puzzles.json`. Each day has THREE rounds: a Person, a Place, and a Thing.

Follow these strict steps:

1. **Read existing puzzles**: Read `public/puzzles.json`.
2. **Find the latest date and theme**: Note the date and `theme` of the very last entry.
3. **Collect every existing answer**: Legacy days have a top-level `answer`; three-round days have `rounds[].answer`. You must NEVER reuse any of them (compare case-insensitively, ignoring accents).
4. **Generate 30 new days**: They start on the day AFTER the latest date, one per calendar day, no gaps.
5. **Enforce theme rotation**: Themes follow this fixed 7-day cycle, continuing unbroken from the last entry's theme:
   1. History
   2. Pop Culture
   3. Science & Nature
   4. Sports & Games
   5. Arts & Music
   6. Tech & Business
   7. Wildcard
6. **Use the entry format** (three-round days only; legacy single-round entries are never created any more):

   ```json
   {
     "date": "YYYY-MM-DD",
     "theme": "History",
     "rounds": [
       { "type": "person", "answer": "...", "hints": ["...", "...", "..."] },
       { "type": "place",  "answer": "...", "hints": ["...", "...", "..."] },
       { "type": "thing",  "answer": "...", "hints": ["...", "...", "..."] }
     ]
   }
   ```

   The three rounds are always in the order person, place, thing.

7. **Keep each slot broad so the supply never runs out.** The three answers in a day share the theme's *domain*, not one story. Every slot is a wide category, so do not limit yourself to the most famous examples; lesser-known but recognizable answers are encouraged, and a mix of easy and harder answers is good.

   | Theme | Person (anyone who...) | Place (any...) | Thing (any...) |
   |---|---|---|---|
   | **History** | Ruler, leader, explorer, activist, general, writer, inventor, or pioneer of any era | Historic site, ancient city, battlefield, monument, landmark, or historic building | Artifact, document, event, war, movement, era, structure, or discovery |
   | **Pop Culture** | Actor, musician, director, creator, influencer, comedian, or fictional character | Real or fictional location tied to entertainment: studio, theme park, fictional world, venue, or city | Film, show, game, franchise, song, album, toy, gadget, meme, or iconic prop |
   | **Science & Nature** | Anyone involved in science, medicine, math, engineering, exploration, space, or conservation | Natural wonder, ecosystem, park, ocean feature, planet, moon, observatory, lab, or climate region | Species, animal, plant, element, phenomenon, disease, body part, instrument, or scientific concept |
   | **Sports & Games** | Athlete, coach, referee, chess master, esports player, or any sports figure | Stadium, arena, track, course, circuit, court, or event venue | Sport, game, equipment, move, rule, term, trophy, or event |
   | **Arts & Music** | Painter, sculptor, composer, musician, singer, author, poet, architect, dancer, photographer, or designer | Museum, gallery, theater, concert hall, studio, festival site, or famous artistic building | Artwork, instrument, genre, musical piece, book, art movement, dance, or literary form |
   | **Tech & Business** | Founder, CEO, inventor, engineer, programmer, investor, economist, or pioneer | Tech hub, headquarters, factory, exchange, industrial city, or famous marketplace | Product, company, brand, device, software, currency, invention, or technology concept |
   | **Wildcard** | Any person from any field | Any place anywhere | Any thing at all (food, animal, object, concept, tradition) |

   For Wildcard, make the three answers come from three clearly different domains.

8. **Enforce answer constraints** (for every round):
   - Exactly 1 or 2 words. NO hyphens (so avoid "Pac-Man", "Spider-Man", etc.).
   - No ambiguous alternate names or spellings.
   - ABSOLUTELY UNIQUE across the whole file and within the day.
   - Sophisticated and specific; avoid 'basic' everyday answers (e.g., avoid "Pizza", "Soccer").
   - Well enough known that a curious adult could get it with hint 3.

9. **Enforce hint constraints** (3 hints per round):
   - Hint 1: genuinely vague. It must fit many different well-known answers in the category; describe the era, field, or a general trait, NOT a signature fact, famous quote, nickname, or defining achievement. Most players should NOT get it from hint 1 alone (~80% miss rate).
   - Hint 2: conceptually specific, narrowing to a handful of candidates (~60% miss rate).
   - Hint 3: highly specific and decisive for anyone who knows the subject (~30% miss rate).
   - Hints must be full sentences ending in punctuation.
   - Refer to the answer with broad category words ("this individual", "this place", "this creation"), not narrow ones.
   - Hints MUST NOT contain any word from the answer (e.g. no "Wall" or "Street" in hints for "Wall Street").

10. **Validate before writing**: run `python3 scripts/validate_puzzles.py` on the result. Every check must pass (contiguous dates, theme rotation, unique answers, 1-2 word answers, exactly 3 hints each, no answer words leaking into hints, valid JSON). Fix anything it reports and re-run.

11. **Append puzzles**: Use a reliable method (like a short Python script) to load `public/puzzles.json`, append the 30 new day objects, and write it back with `json.dump(..., indent=2)` plus a trailing newline. DO NOT ask the user for an implementation plan or explicit review before appending. Just generate them, validate, and append them directly to the file.
