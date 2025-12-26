import json
import sys

def duplicate_check_hook(pairs):
    result = {}
    seen_keys = set()
    for key, value in pairs:
        if key in seen_keys:
            raise ValueError(f"Duplicate key found: {key}")
        seen_keys.add(key)
        result[key] = value
    return result

allowed_keys = {"date", "theme", "answer", "clues"}

try:
    with open('public/puzzles.json', 'r') as f:
        data = json.load(f, object_pairs_hook=duplicate_check_hook)
    
    print("No duplicate keys found.")
    
    for i, item in enumerate(data):
        keys = set(item.keys())
        unknown = keys - allowed_keys
        if unknown:
            print(f"Item at index {i} has unknown keys: {unknown}")
        missing = allowed_keys - keys
        if missing:
            print(f"Item at index {i} is missing keys: {missing}")

except ValueError as e:
    print(f"JSON Error: {e}")
except Exception as e:
    print(f"Error: {e}")
