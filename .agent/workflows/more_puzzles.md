---
description: How to generate more puzzles when the user says "More puzzles"
---

When the user prompts you with "More puzzles", you must generate exactly 30 days of new puzzles and append them to `public/puzzles.json`.

Follow these strict steps:

1. **Read existing puzzles**: Use `view_file` on `public/puzzles.json`.
2. **Find the latest date**: Note the date of the very last puzzle in the array.
3. **Check for duplicates**: Read all existing `answer` values to ensure you NEVER reuse an answer.
4. **Generate 30 new puzzles**: The new puzzles must start on the day *after* the latest date found in step 2.
5. **Enforce Theme Rotation**: Ensure the 7-day theme rotation is perfectly maintained:
   1. Genius Ideas
   2. Famous People
   3. Pop Culture
   4. Food & Fun
   5. Sports & Games
   6. Wildcard
   7. Around the World
6. **Enforce Answer Constraints**: 
   - Must be exactly 1 or 2 words.
   - NO hyphens.
   - NO ambiguous alternate names.
   - ABSOLUTELY UNIQUE (has never been used in `puzzles.json` before).
   - **Sophisticated Concepts:** Avoid 'basic' or overly common everyday answers (e.g., avoid "Pizza", "Soccer", "Taco"). Choose advanced, specific, and interesting answers instead (e.g., "Saffron", "Fencing", "Kimchi").
   - **Sports & Games Theme:** Answers do NOT have to be the literal name of a sport. They can also represent famous athletes, specific maneuvers (e.g., "Bicycle Kick"), equipment, or outcomes (e.g., "Checkmate").
   - **Wildcard Theme:** Must be truly random and highly varied subjects with no particular theme. Do not falsely limit this to weather or nature phenomena.
7. **Enforce Hint Constraints**:
   - Hint 1: Vague (~80% miss rate)
   - Hint 2: Conceptually specific (~60% miss rate)
   - Hint 3: Highly specific (~30% miss rate)
   - Hints must be full sentences.
   - Hints must contain category references so the user knows what the hint refers to, but keep them broad to maintain the vague difficulty curve (e.g., use "this individual" instead of "this American President", or "this creation" instead of "this television show").
   - Hints MUST NOT contain any words from the answer.
8. **Append Puzzles**: Use a reliable method (like a short node script) to parse `public/puzzles.json`, append the 30 new objects, and write it back. DO NOT ask the user for an implementation plan or explicit review before appending. Just generate them and append them directly to the file.
