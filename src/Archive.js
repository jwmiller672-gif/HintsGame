import styles from "./styles";
import Stars from "./Stars";
import {
  formatDateForDisplay,
  getArchiveResult,
  getRounds,
  getSavedRounds,
  isTripleGold,
} from "./gameUtils";

function resultBadge(puzzle, result) {
  const total = getRounds(puzzle).length;
  const played = getSavedRounds(result, total);
  if (played.length === 0) {
    return { content: "Not played", color: "#90a4ae" };
  }
  if (played.length < total) {
    return { content: `In progress (${played.length}/${total})`, color: "#f57c00" };
  }
  const special = isTripleGold(played, total);
  return {
    content: (
      <>
        <Stars results={played} total={total} size={18} special={special} />
        {special && " 🏆"}
      </>
    ),
    color: "#2c3e50",
  };
}

export default function Archive({ entries, onSelect, onBack }) {
  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backButton}>
        ← Back to Today
      </button>

      <img
        src={process.env.PUBLIC_URL + "/logo.png"}
        alt="Hints Logo"
        style={{ width: "160px", height: "auto", margin: "0 auto 15px", display: "block" }}
      />
      <h2 style={{ ...styles.subtitle, color: "#2c3e50" }}>
        Puzzle Archive
      </h2>
      <p style={{ ...styles.instructions, color: "#546e7a" }}>
        Missed a day? Pick a past puzzle to play. These don't affect your streak.
      </p>

      {entries.length === 0 ? (
        <p style={styles.loading}>No past puzzles yet — check back after today!</p>
      ) : (
        <div style={styles.archiveList}>
          {entries.map(({ puzzle, number }) => {
            const result = getArchiveResult(puzzle.date);
            const badge = resultBadge(puzzle, result);
            return (
              <div
                key={puzzle.date}
                style={styles.archiveItem}
                onClick={() => onSelect(puzzle, number)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(puzzle, number);
                }}
              >
                <div>
                  <div style={styles.archiveItemTitle}>
                    #{number} • {puzzle.theme}
                  </div>
                  <div style={styles.archiveItemMeta}>
                    {formatDateForDisplay(puzzle.date)}
                  </div>
                </div>
                <div style={{ ...styles.archiveBadge, color: badge.color }}>
                  {badge.content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
