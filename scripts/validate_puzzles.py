#!/usr/bin/env python3
"""Validate public/puzzles.json (legacy single-round days and 3-round days).

Usage: python3 scripts/validate_puzzles.py [path/to/puzzles.json]

Exits 0 when every check passes, 1 otherwise. The refill routine and humans
run this same script, so the rules live in one place (see also
.agent/workflows/more_puzzles.md).
"""
import datetime
import json
import re
import sys
import unicodedata

PATH = sys.argv[1] if len(sys.argv) > 1 else "public/puzzles.json"

# Three-round days rotate through these themes in this exact order.
THEME_CYCLE = [
    "History",
    "Pop Culture",
    "Science & Nature",
    "Sports & Games",
    "Arts & Music",
    "Tech & Business",
    "Wildcard",
]
ROUND_TYPES = ["person", "place", "thing"]

# The one date gap that predates the 3-round format (the site had no puzzles).
ALLOWED_GAPS = {("2026-05-06", "2026-08-19")}

IGNORED_WORDS = {"a", "an", "the", "of", "and"}
SENTENCE_END = re.compile(r"[.!?][\"')\]]*$")


def norm(text):
    text = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c))


def words(text):
    return {w for w in re.sub(r"[^a-z ]", " ", norm(text)).split() if w not in IGNORED_WORDS}


def check_puzzle(label, answer, hints, errors):
    if not isinstance(answer, str) or not answer.strip():
        errors.append(f"{label}: missing answer")
        return
    if "-" in answer:
        errors.append(f"{label}: answer '{answer}' contains a hyphen")
    if len(answer.split()) > 2:
        errors.append(f"{label}: answer '{answer}' is more than 2 words")
    if not isinstance(hints, list) or len(hints) != 3:
        errors.append(f"{label}: needs exactly 3 hints")
        return
    answer_words = words(answer)
    for i, hint in enumerate(hints, 1):
        if not isinstance(hint, str) or not SENTENCE_END.search(hint.strip()):
            errors.append(f"{label}: hint {i} is not a full sentence ending in punctuation")
            continue
        leaked = answer_words & words(hint)
        if leaked:
            errors.append(f"{label}: hint {i} contains answer word(s) {sorted(leaked)}")


def main():
    errors = []
    try:
        data = json.load(open(PATH))
    except Exception as exc:  # noqa: BLE001
        print(f"FAILED: cannot parse {PATH}: {exc}")
        return 1
    if not isinstance(data, list):
        print("FAILED: top level must be a JSON array")
        return 1

    seen_answers = {}
    prev_date = None
    prev_new_theme = None
    legacy = new = 0

    for idx, day in enumerate(data):
        date_str = day.get("date", "")
        try:
            date = datetime.date.fromisoformat(date_str)
        except ValueError:
            errors.append(f"entry {idx}: bad date '{date_str}'")
            continue

        if prev_date is not None:
            gap = (date - prev_date).days
            if gap < 1:
                errors.append(f"{date_str}: dates must be strictly increasing")
            elif gap > 1 and (prev_date.isoformat(), date_str) not in ALLOWED_GAPS:
                errors.append(f"{date_str}: gap of {gap - 1} missing day(s) after {prev_date}")
        prev_date = date

        if "rounds" in day:
            new += 1
            theme = day.get("theme")
            if theme not in THEME_CYCLE:
                errors.append(f"{date_str}: unknown theme '{theme}'")
            elif prev_new_theme is not None:
                expected = THEME_CYCLE[(THEME_CYCLE.index(prev_new_theme) + 1) % len(THEME_CYCLE)]
                if theme != expected:
                    errors.append(f"{date_str}: theme '{theme}' breaks rotation (expected '{expected}')")
            if theme in THEME_CYCLE:
                prev_new_theme = theme

            rounds = day["rounds"]
            if [r.get("type") for r in rounds] != ROUND_TYPES:
                errors.append(f"{date_str}: rounds must be exactly {ROUND_TYPES} in order")
            for r in rounds:
                label = f"{date_str} {r.get('type')}"
                check_puzzle(label, r.get("answer"), r.get("hints"), errors)
                key = norm(str(r.get("answer", ""))).strip()
                if key in seen_answers:
                    errors.append(f"{label}: duplicate answer '{r.get('answer')}' (also {seen_answers[key]})")
                seen_answers[key] = label
        else:
            legacy += 1
            label = date_str
            check_puzzle(label, day.get("answer"), day.get("hints"), errors)
            key = norm(str(day.get("answer", ""))).strip()
            if key in seen_answers:
                errors.append(f"{label}: duplicate answer '{day.get('answer')}' (also {seen_answers[key]})")
            seen_answers[key] = label

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        return 1

    last = data[-1]["date"] if data else "n/a"
    print(f"OK: {len(data)} days ({legacy} legacy, {new} three-round), {len(seen_answers)} unique answers, last date {last}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
