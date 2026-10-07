export function formatDateToYMD_Local(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateForDisplay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getTimeUntilTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow - now;
}

export function formatDuration(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function normalizeAnswer(str) {
  // Remove common articles from the beginning of the string
  // Also normalize accents/diacritics (e.g., "Pokémon" becomes "Pokemon")
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters into base + combining marks
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/^(the|a|an)\s+/i, '');
}

export function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
    navigator.userAgent
  );
}

export const ROUND_TYPES = {
  person: { label: "Person", emoji: "👤", prompt: "Who is this?" },
  place: { label: "Place", emoji: "📍", prompt: "Where is this?" },
  thing: { label: "Thing", emoji: "🧩", prompt: "What is this?" },
};

// Puzzle days come in two shapes: legacy single-round days ({answer, hints})
// and three-round days ({rounds: [{type, answer, hints}, ...]}). The app
// always plays a list of rounds, so legacy days become a one-round list.
export function getRounds(puzzle) {
  if (puzzle.rounds) return puzzle.rounds;
  return [{ type: null, answer: puzzle.answer, hints: puzzle.hints }];
}

// One star per round: gold = solved on the first clue, blue = solved on any
// later clue, hollow = never solved ("none" = round not played yet).
export function roundRating(roundResult) {
  if (!roundResult) return "none";
  if (!roundResult.won) return "miss";
  return roundResult.hints === 1 ? "gold" : "blue";
}

// Emoji for plain-text share cards (there is no blue star emoji).
const RATING_EMOJI = { gold: "⭐️", blue: "🔷", miss: "☆", none: "☆" };

export function ratingEmoji(roundResult) {
  return RATING_EMOJI[roundRating(roundResult)];
}

// Three gold stars on a three-round day is the special perfect result.
export function isTripleGold(roundResults, total) {
  return (
    total === 3 &&
    roundResults.length === 3 &&
    roundResults.every((r) => roundRating(r) === "gold")
  );
}

// Stored results are either legacy {won, hints} or {rounds: [{won, hints}]}.
export function getRoundResults(result) {
  if (!result) return [];
  if (result.rounds) return result.rounds;
  return [{ won: result.won, hints: result.hints }];
}

// The streak continues when at least two thirds of the rounds are solved
// (1 of 1 for legacy days, 2 of 3 for three-round days).
export function streakQualifies(roundResults) {
  const solved = roundResults.filter((r) => r.won).length;
  return solved >= Math.ceil((roundResults.length * 2) / 3);
}

const ARCHIVE_RESULTS_KEY = "archiveResults";

// Per-puzzle results, keyed by date, so the archive list can show which
// past puzzles have been solved. Independent of the daily streak, which
// only tracks today's puzzle.
export function getArchiveResults() {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_RESULTS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getArchiveResult(dateStr) {
  return getArchiveResults()[dateStr] || null;
}

export function saveArchiveResult(dateStr, result) {
  const all = getArchiveResults();
  all[dateStr] = result;
  localStorage.setItem(ARCHIVE_RESULTS_KEY, JSON.stringify(all));
}
