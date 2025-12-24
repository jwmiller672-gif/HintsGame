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
  const [cluesRevealed, setCluesRevealed] = useState(0);
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
  const [animatingClue, setAnimatingClue] = useState(-1);

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/puzzles.json")
      .then((res) => res.json())
      .then((data) => {
        const todayStr = formatDateToYMD_Local(new Date());
        const todayPuzzle = data.find(
          (p) =>
            p.date === todayStr && p.category === WEEKDAY_CATEGORIES[p.weekday]
        );
        if (todayPuzzle) {
          setPuzzle(todayPuzzle);
        } else {
          setMessage("No puzzle found for today. Please check back tomorrow!");
        }
      })
      .catch(() => {
        setMessage("Failed to load puzzles.");
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
      setAnimatingClue(-1);
      setTimeout(() => {
        setAnimatingClue(justRevealed);
      }, 50);
    }
  }, [justRevealed]);

  if (!puzzle)
    return (
      <div style={styles.container}>
        <p style={styles.loading}>{message || "Loading..."}</p>
      </div>
    );

  const canGuess = guessCount < cluesRevealed && !gameOver;

  function revealClue(keepMessage = false) {
    if (cluesRevealed < puzzle.clues.length) {
      setJustRevealed(cluesRevealed);
      setCluesRevealed(cluesRevealed + 1);
      if (!keepMessage) {
        setMessage("");
        setShowIncorrectPrompt(false);
      }
      setGuessCount(0);
    }
  }

  function calculateStars() {
    if (!won) return 0;
    // Award stars based on how many clues were revealed when they won
    // 1 clue = 3 stars, 2 clues = 2 stars, 3 clues = 1 star
    return 4 - cluesRevealed;
  }

  function submitGuess(e) {
    e.preventDefault();
    if (!input.trim() || gameOver || !canGuess) return;

    const guess = input.trim();
    const answer = puzzle.answer.trim();
    const answerLower = answer.toLowerCase();
    const guessLower = guess.toLowerCase();

    const newGuesses = [...guesses, guess];

    // Exact match
    if (guessLower === answerLower) {
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

    // Partial/close match
    const guessWords = guessLower.split(" ");
    const answerWords = answerLower.split(" ");
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

    // Auto reveal next clue but keep incorrect message
    if (cluesRevealed < puzzle.clues.length) {
      revealClue(true);
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

    const shareText = `Guess It: The Daily Guessing Game\n${starString}\nI got ${stars}/3 stars! Can you beat me?\n${window.location.href}`;

    if (navigator.share && isMobile()) {
      navigator
        .share({
          title: "Guess It",
          text: shareText,
          url: window.location.href,
        })
        .catch(() => { });
    } else if (isMobile()) {
      const smsBody = encodeURIComponent(shareText);
      window.location.href = `sms:?&body=${smsBody}`;
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert("Share text copied to clipboard! You can now paste it anywhere.");
      });
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={{ ...styles.title, color: "#1976d2" }}>Guess It</h1>
      <h2 style={{ ...styles.subtitle, color: "black" }}>
        The Daily Guessing Game
      </h2>
      <p style={{ ...styles.instructions, color: "black" }}>
        Reveal the clues and guess the correct answer. If you guess incorrectly,
        the next clue is revealed.
      </p>
      <h3 style={{ ...styles.todayTheme, color: "black" }}>
        Today's Theme: {puzzle.category}
      </h3>

      {!gameStarted ? (
        <button
          onClick={() => {
            setJustRevealed(0);
            setTimeout(() => {
              setGameStarted(true);
              setCluesRevealed(1);
            }, 0);
          }}
          style={{ ...styles.button, fontSize: 20, padding: "15px 40px", marginTop: 20 }}
        >
          Play
        </button>
      ) : (
        <>
          <div style={styles.cluesContainer}>
            {Array.from({ length: puzzle.clues.length }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.clue,
                  backgroundColor: i < cluesRevealed ? "#c8e6c9" : "#eee",
                  color: "black",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <strong style={{ minWidth: 60 }}>Clue {i + 1}:</strong>
                <span
                  style={{
                    marginLeft: 10,
                    minHeight: "1em",
                    opacity: i < cluesRevealed && i <= animatingClue ? 1 : 0,
                    transition: "opacity 1.5s ease-in",
                  }}
                >
                  {i < cluesRevealed ? puzzle.clues[i] : ""}
                </span>
              </div>
            ))}
          </div>

          {!gameOver && cluesRevealed < puzzle.clues.length && (
            <button onClick={revealClue} style={styles.button}>
              Reveal Next Clue
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
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    textAlign: "center",
    padding: "0 15px",
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
  cluesContainer: {
    marginBottom: 20,
    textAlign: "left",
  },
  clue: {
    padding: "10px 15px",
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  button: {
    backgroundColor: "#1976d2",
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
