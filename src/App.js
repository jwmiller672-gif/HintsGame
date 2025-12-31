import { useEffect, useState } from "react";

const WEEKDAY_CATEGORIES = {
  Monday: "Around the World",
  Tuesday: "Genius Ideas",
  Wednesday: "Famous People",
  Thursday: "Pop Culture",
  Friday: "Food & Fun",
  Saturday: "Sports & Games",
  Sunday: "Wildcard",
};

function formatDateToYMD_Local(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeAnswer(str) {
  // Remove common articles from the beginning of the string
  // Also normalize accents/diacritics (e.g., "Pokémon" becomes "Pokemon")
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters into base + combining marks
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/^(the|a|an)\s+/i, '');
}

function levenshteinDistance(a, b) {
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

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
    navigator.userAgent
  );
}

export default function App() {
  const [puzzle, setPuzzle] = useState(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [guessCount, setGuessCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showIncorrectPrompt, setShowIncorrectPrompt] = useState(false);
  const [justRevealed, setJustRevealed] = useState(-1);
  const [gameStarted, setGameStarted] = useState(false);
  const [animatingHint, setAnimatingHint] = useState(-1);
  const [puzzleNumber, setPuzzleNumber] = useState(0);

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
        if (todayIndex !== -1) {
          setPuzzle(data[todayIndex]);
          setPuzzleNumber(todayIndex + 1);
        } else {
          setMessage("No puzzle found for today. Please check back tomorrow!");
        }
      })
      .catch((err) => {
        console.error("Load error:", err);
        setMessage(`Failed to load puzzles: ${err.message}`);
      });

    const lastWinDate = localStorage.getItem("lastWinDate");
    const savedStreak = parseInt(localStorage.getItem("streak") || "0", 10);
    const todayStr = formatDateToYMD_Local(new Date());

    if (lastWinDate) {
      const lastDate = new Date(lastWinDate);
      const today = new Date();
      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        setStreak(savedStreak);
      } else if (diffDays > 1) {
        setStreak(0);
      } else if (diffDays === 0) {
        setStreak(savedStreak);
      }
    } else {
      setStreak(0);
    }
  }, []);

  useEffect(() => {
    if (justRevealed >= 0) {
      // Start with opacity 0, then animate to 1
      setAnimatingHint(-1);
      setTimeout(() => {
        setAnimatingHint(justRevealed);
      }, 50);
    }
  }, [justRevealed]);

  if (!puzzle)
    return (
      <div style={styles.container}>
        <p style={styles.loading}>{message || "Loading..."}</p>
      </div>
    );

  const canGuess = guessCount < hintsRevealed && !gameOver;

  function revealHint(keepMessage = false) {
    if (hintsRevealed < puzzle.hints.length) {
      setJustRevealed(hintsRevealed);
      setHintsRevealed(hintsRevealed + 1);
      if (!keepMessage) {
        setMessage("");
        setShowIncorrectPrompt(false);
      }
      setGuessCount(0);
    }
  }

  function calculateStars() {
    if (!won) return 0;
    // Award stars based on how many hints were revealed when they won
    // 1 hint = 3 stars, 2 hints = 2 stars, 3 hints = 1 star
    return 4 - hintsRevealed;
  }

  function submitGuess(e) {
    e.preventDefault();
    if (!input.trim() || gameOver || !canGuess) return;

    const guess = input.trim();
    const answer = puzzle.answer.trim();
    const answerLower = answer.toLowerCase();
    const guessLower = guess.toLowerCase();

    // Normalize both for comparison (removes articles like "the", "a", "an")
    const normalizedGuess = normalizeAnswer(guess);
    const normalizedAnswer = normalizeAnswer(answer);

    const newGuesses = [...guesses, guess];

    // Exact match (with normalization to ignore articles)
    if (guessLower === answerLower || normalizedGuess === normalizedAnswer) {
      setGuesses(newGuesses);
      setMessage(
        `🎉 Correct! You got it in ${newGuesses.length} guess${newGuesses.length > 1 ? "es" : ""
        }!`
      );
      setGameOver(true);
      setWon(true);
      updateStreak(true);
      setShowShare(true);
      setGuessCount(guessCount + 1);
      setInput("");
      setShowIncorrectPrompt(false);
      return;
    }

    // Partial/close match (use normalized versions)
    const guessWords = normalizedGuess.split(" ");
    const answerWords = normalizedAnswer.split(" ");
    const isClose = guessWords.every((word) =>
      answerWords.some((ansWord) => levenshteinDistance(word, ansWord) <= 1)
    );

    if (isClose) {
      setMessage(
        "Almost there! Check your spelling or adjust your guess and try again."
      );
      setShowIncorrectPrompt(false);
      return;
    }

    // Incorrect guess
    setGuesses(newGuesses);
    setGuessCount(guessCount + 1);
    setMessage("❌ Incorrect guess, try again!");
    setShowIncorrectPrompt(true);

    // Auto reveal next hint but keep incorrect message
    if (hintsRevealed < puzzle.hints.length) {
      revealHint(true);
    } else {
      setGameOver(true);
      updateStreak(false);
      setShowShare(true);
      setMessage(`❌ Out of guesses! The answer was: ${puzzle.answer}`);
      setShowIncorrectPrompt(false);
    }

    setInput("");
  }

  function updateStreak(wonToday) {
    const todayStr = formatDateToYMD_Local(new Date());
    const lastWinDate = localStorage.getItem("lastWinDate");
    let currentStreak = parseInt(localStorage.getItem("streak") || "0", 10);

    if (wonToday) {
      if (lastWinDate) {
        const lastDate = new Date(lastWinDate);
        const today = new Date();
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      localStorage.setItem("streak", currentStreak.toString());
      localStorage.setItem("lastWinDate", todayStr);
      setStreak(currentStreak);
    } else {
      localStorage.setItem("streak", "0");
      setStreak(0);
      localStorage.removeItem("lastWinDate");
    }
  }

  function shareResults() {
    if (!gameOver) return;

    const stars = calculateStars();
    const starsFilled = "⭐️".repeat(stars);
    const starsEmpty = "☆".repeat(3 - stars);
    const starString = starsFilled + starsEmpty;

    let resultMessage = "";

    if (won) {
      if (stars === 3) {
        resultMessage = "I got it on the first hint 🥳! You try!";
      } else {
        resultMessage = `I got it in ${hintsRevealed} hints! Can you do better?`;
      }
    } else {
      resultMessage = "Stumped me today! Can you get it?";
    }

    const baseShareText = `Hints #${puzzleNumber}\n${starString}\n${resultMessage}`;
    const shareUrl = window.location.href;
    const fullShareText = `${baseShareText}\n${shareUrl}`;

    if (navigator.share && isMobile()) {
      navigator
        .share({
          title: "Hints",
          text: baseShareText,
          url: shareUrl,
        })
        .catch(() => { });
    } else if (isMobile()) {
      const smsBody = encodeURIComponent(fullShareText);
      window.location.href = `sms:?&body=${smsBody}`;
    } else {
      navigator.clipboard.writeText(fullShareText).then(() => {
        alert("Share text copied to clipboard! You can now paste it anywhere.");
      });
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={{ ...styles.title, color: "#1565c0" }}>Hints</h1>
      <h2 style={{ ...styles.subtitle, color: "#2c3e50" }}>
        The Daily Guessing Game
      </h2>
      <p style={{ ...styles.instructions, color: "#546e7a" }}>
        Reveal the hints and guess the correct answer. If you guess incorrectly,
        the next hint is revealed.
      </p>
      <h3 style={{ ...styles.todayTheme, color: "#2c3e50" }}>
        Today's Theme: {puzzle.theme}
      </h3>

      {!gameStarted ? (
        <button
          onClick={() => {
            setJustRevealed(0);
            setTimeout(() => {
              setGameStarted(true);
              setHintsRevealed(1);
            }, 0);
          }}
          style={{ ...styles.button, fontSize: 20, padding: "15px 40px", marginTop: 20 }}
        >
          Play
        </button>
      ) : (
        <>
          <div style={styles.hintsContainer}>
            {Array.from({ length: puzzle.hints.length }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.hint,
                  backgroundColor: i < hintsRevealed ? "#d4edda" : "#f8f9fa",
                  color: "#2c3e50",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <strong style={{ minWidth: 60 }}>Hint {i + 1}:</strong>
                <span
                  style={{
                    marginLeft: 10,
                    minHeight: "1em",
                    opacity: i < hintsRevealed && i <= animatingHint ? 1 : 0,
                    transition: "opacity 1.5s ease-in",
                  }}
                >
                  {i < hintsRevealed ? puzzle.hints[i] : ""}
                </span>
              </div>
            ))}
          </div>

          {!gameOver && hintsRevealed < puzzle.hints.length && (
            <button onClick={revealHint} style={styles.button}>
              Reveal Next Hint
            </button>
          )}

          {!gameOver && (
            <form onSubmit={submitGuess} style={styles.form}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={canGuess ? "Your guess" : ""}
                style={{
                  ...styles.input,
                  backgroundColor: canGuess ? "white" : "#eee",
                  color: canGuess ? "black" : "#888",
                  cursor: canGuess ? "text" : "not-allowed",
                }}
                autoFocus
                autoComplete="off"
                disabled={!canGuess}
              />
              <button
                type="submit"
                style={{ ...styles.button, marginLeft: 10 }}
                disabled={!canGuess}
              >
                Guess
              </button>
            </form>
          )}

          {showIncorrectPrompt && !gameOver && (
            <p style={{ color: "red", fontWeight: "bold", marginTop: 10 }}></p>
          )}

          <div style={styles.guesses}>
            <strong>Guesses:</strong>{" "}
            {guesses.length > 0 ? guesses.join(", ") : "None yet"}
          </div>

          {message && (
            <p style={{ ...styles.message, color: won ? "#2e7d32" : "#c62828" }}>
              {message}
            </p>
          )}
          {gameOver && !won && (
            <div style={{ ...styles.funFact, color: "#c62828" }}>
              Better luck next time! Try again tomorrow.
            </div>
          )}

          <div style={{ marginTop: 15, fontWeight: "600", fontSize: 18 }}>
            🔥 Streak: {streak} day{streak !== 1 ? "s" : ""}
          </div>

          {showShare && (
            <button
              onClick={shareResults}
              style={{ ...styles.button, marginTop: 15 }}
              aria-label="Share your results"
            >
              Share Results! 🎉
            </button>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 500,
    margin: "40px auto",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    textAlign: "center",
    padding: "40px 30px",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.05)",
  },
  title: {
    fontSize: 36,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 20,
    marginTop: 0,
    marginBottom: 10,
    fontWeight: "bold",
  },
  instructions: {
    fontSize: 16,
    marginBottom: 15,
  },
  todayTheme: {
    fontSize: 18,
    marginBottom: 20,
    fontWeight: "bold",
  },
  hintsContainer: {
    marginBottom: 20,
    textAlign: "left",
  },
  hint: {
    padding: "12px 16px",
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
    fontWeight: 500,
  },
  button: {
    backgroundColor: "#1565c0",
    border: "none",
    color: "white",
    padding: "10px 20px",
    fontSize: 16,
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  form: {
    marginTop: 10,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    padding: 10,
    fontSize: 16,
    width: 220,
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  guesses: {
    marginTop: 20,
    fontSize: 16,
    color: "#555",
  },
  message: {
    marginTop: 15,
    fontWeight: "600",
    fontSize: 18,
  },
  funFact: {
    marginTop: 25,
    padding: 15,
    backgroundColor: "#fff3e0",
    borderRadius: 8,
    fontStyle: "italic",
    fontSize: 16,
    color: "#f57c00",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  loading: {
    fontSize: 18,
    color: "#666",
  },
};
