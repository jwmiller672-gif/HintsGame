import { useEffect, useState } from "react";
import styles from "./styles";
import GameScreen from "./GameScreen";
import Archive from "./Archive";
import { formatDateToYMD_Local } from "./gameUtils";

export default function App() {
  const [allPuzzles, setAllPuzzles] = useState(null);
  const [todayPuzzle, setTodayPuzzle] = useState(null);
  const [todayPuzzleNumber, setTodayPuzzleNumber] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [streak, setStreak] = useState(0);
  const [view, setView] = useState("today"); // "today" | "archive" | "archivedGame"
  const [archivedPuzzle, setArchivedPuzzle] = useState(null); // { puzzle, number }

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/puzzles.json?t=" + new Date().getTime())
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const todayStr = formatDateToYMD_Local(new Date());
        const todayIndex = data.findIndex((p) => p.date === todayStr);
        setAllPuzzles(data);
        if (todayIndex !== -1) {
          setTodayPuzzle(data[todayIndex]);
          setTodayPuzzleNumber(todayIndex + 1);
        } else {
          setLoadError("No puzzle found for today. Please check back tomorrow!");
        }
      })
      .catch((err) => {
        console.error("Load error:", err);
        setLoadError(`Failed to load puzzles: ${err.message}`);
      });

    // Initialize streak
    const lastWinDate = localStorage.getItem("lastWinDate");
    const savedStreak = parseInt(localStorage.getItem("streak") || "0", 10);
    const todayStr = formatDateToYMD_Local(new Date());

    if (lastWinDate) {
      const lastDate = new Date(lastWinDate);
      const today = new Date(todayStr); // Use normalized date string
      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // User already played today, keep current streak
        setStreak(savedStreak);
      } else if (diffDays === 1) {
        // User played yesterday, keep streak (will increment if they win today)
        setStreak(savedStreak);
      } else if (diffDays > 1) {
        // User missed a day, reset streak
        localStorage.setItem("streak", "0");
        setStreak(0);
      }
    } else {
      setStreak(0);
    }
  }, []);

  function updateStreak(wonToday, hintsUsed) {
    const todayStr = formatDateToYMD_Local(new Date());
    const lastPlayedDate = localStorage.getItem("lastPlayedDate");

    // If already played today (whether win or loss), don't update streak
    if (lastPlayedDate === todayStr) {
      return;
    }

    // Mark today as played
    localStorage.setItem("lastPlayedDate", todayStr);

    const lastWinDate = localStorage.getItem("lastWinDate");
    let currentStreak = parseInt(localStorage.getItem("streak") || "0", 10);

    if (wonToday) {
      if (lastWinDate) {
        const lastDate = new Date(lastWinDate);
        const today = new Date(todayStr);
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day, increment streak
          currentStreak += 1;
        } else if (diffDays > 1) {
          // Missed days, reset to 1
          currentStreak = 1;
        } else if (diffDays === 0) {
          // Should be caught by lastPlayedDate check, but safe fallback
          return;
        }
      } else {
        // First time playing
        currentStreak = 1;
      }

      localStorage.setItem("streak", currentStreak.toString());
      localStorage.setItem("lastWinDate", todayStr);
      setStreak(currentStreak);
    } else {
      // Lost on first attempt of the day - break streak
      localStorage.setItem("streak", "0");
      setStreak(0);
      // We don't remove lastWinDate so we can still calculate days since last win if needed,
      // but the streak count itself is reset to 0.
    }
  }

  if (!allPuzzles || (!todayPuzzle && !loadError))
    return (
      <div style={styles.container}>
        <p style={styles.loading}>Loading...</p>
      </div>
    );

  if (loadError && !todayPuzzle) {
    return (
      <div style={styles.container}>
        <p style={styles.loading}>{loadError}</p>
      </div>
    );
  }

  if (view === "archivedGame" && archivedPuzzle) {
    return (
      <GameScreen
        puzzle={archivedPuzzle.puzzle}
        puzzleNumber={archivedPuzzle.number}
        isToday={false}
        streak={streak}
        onBack={() => {
          setArchivedPuzzle(null);
          setView("archive");
        }}
      />
    );
  }

  if (view === "archive") {
    const todayStr = formatDateToYMD_Local(new Date());
    const entries = allPuzzles
      .map((puzzle, idx) => ({ puzzle, number: idx + 1 }))
      .filter((entry) => entry.puzzle.date < todayStr)
      .sort((a, b) => (a.puzzle.date < b.puzzle.date ? 1 : -1));

    return (
      <Archive
        entries={entries}
        onSelect={(puzzle, number) => {
          setArchivedPuzzle({ puzzle, number });
          setView("archivedGame");
        }}
        onBack={() => setView("today")}
      />
    );
  }

  return (
    <>
      <GameScreen
        puzzle={todayPuzzle}
        puzzleNumber={todayPuzzleNumber}
        isToday={true}
        streak={streak}
        onGameOver={updateStreak}
      />
      <div style={{ textAlign: "center", marginTop: 15 }}>
        <button style={styles.linkButton} onClick={() => setView("archive")}>
          📚 Play Past Puzzles
        </button>
      </div>
    </>
  );
}
