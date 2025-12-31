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
        `🎉 Correct! You got it in ${hintsRevealed} hint${hintsRevealed !== 1 ? "s" : ""}!`
      );
      setGameOver(true);
      setWon(true);
      updateStreak(true, newGuesses, hintsRevealed);
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
      updateStreak(false, newGuesses, hintsRevealed);
      setShowShare(true);
      setMessage("❌ Out of guesses!");
      setShowIncorrectPrompt(false);
    }

    setInput("");
  }

  function updateStreak(wonToday, currentGuesses, currentHints) {
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

  function getShareDetails() {
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

    return { baseShareText, fullShareText, shareUrl };
  }

  function shareResults() {
    if (!gameOver) return;
    const { baseShareText, fullShareText, shareUrl } = getShareDetails();

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

  function shareToX() {
    if (!gameOver) return;
    const { fullShareText } = getShareDetails();
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}`;
    window.open(xUrl, '_blank');
  }

  function shareToThreads() {
    if (!gameOver) return;
    const { fullShareText } = getShareDetails();
    const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(fullShareText)}`;
    window.open(threadsUrl, '_blank');
  }

  function shareToInstagramStory() {
    if (!gameOver) return;
    const { fullShareText } = getShareDetails();
    navigator.clipboard.writeText(fullShareText).then(() => {
      if (isMobile()) {
        window.location.href = "instagram://story-camera";
      } else {
        alert("Results copied! Open Instagram to paste in your story.");
        window.open("https://www.instagram.com", "_blank");
      }
    });
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
                  backgroundColor: i < hintsRevealed || gameOver ? "#d4edda" : "#f8f9fa",
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
                    opacity: (i < hintsRevealed && i <= animatingHint) || gameOver ? 1 : 0,
                    transition: "opacity 1.5s ease-in",
                  }}
                >
                  {i < hintsRevealed || gameOver ? puzzle.hints[i] : ""}
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

          {gameOver && (
            <div style={styles.answerBox}>
              <div style={styles.answerLabel}>The Answer</div>
              <div style={styles.answerValue}>{puzzle.answer}</div>
            </div>
          )}

          {showShare && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginTop: 15 }}>
              <button
                onClick={shareResults}
                style={{ ...styles.button, backgroundColor: "#34C759", width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                aria-label="Share via text"
              >
                Share Results on
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </button>
              <button
                onClick={shareToX}
                style={{ ...styles.button, backgroundColor: "black", width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                aria-label="Share on X"
              >
                Share Results on 𝕏
              </button>
              <button
                onClick={shareToThreads}
                style={{ ...styles.button, backgroundColor: "black", width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                aria-label="Share on Threads"
              >
                Share Results on
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.925 10.233c-.93 0-1.57.5-1.57 1.22 0 .765.705 1.277 1.74 1.277.795 0 1.455-.405 1.455-1.232 0-.812-.707-1.265-1.625-1.265Zm5.095-7.771C15.42 1.18 12.253.57 9.01.51 4.186.51.109 3.83.109 9.493c0 5.372 3.888 8.74 9.083 8.74 3.23 0 5.842-1.445 6.736-4.085h-1.76c-.592 1.56-2.406 2.492-4.94 2.492-3.942 0-7.045-2.535-7.045-7.146 0-4.93 3.084-7.476 7.397-7.476 3.776 0 5.871 1.96 5.871 5.143 0 2.634-1.555 4.207-4.024 4.207-1.701 0-2.75-.892-2.75-2.366 0-1.78 1.42-2.91 3.73-2.91 1.102 0 2.17.353 2.17.353v-.905c0-1.693-1.464-2.693-3.66-2.693-1.974 0-3.49.93-3.89 2.525h-1.77c.467-3.004 2.847-4.12 5.73-4.12 3.776 0 5.488 1.692 5.488 4.623v6.41c0 .248.038.49.114.738h2.05c-.217-.806-.268-1.619-.268-2.438V2.462Z" />
                </svg>
              </button>
              <button
                onClick={shareToInstagramStory}
                style={{ ...styles.button, background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                aria-label="Share on Instagram Story"
              >
                Share Results on
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M19,5A1,1 0 0,1 20,6A1,1 0 0,1 19,7A1,1 0 0,1 18,6A1,1 0 0,1 19,5Z" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 20, fontWeight: "600", fontSize: 18, color: "#2c3e50" }}>
        🔥 Streak: {streak} day{streak !== 1 ? "s" : ""}
      </div>
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
  answerBox: {
    margin: "20px 0",
    padding: "15px",
    backgroundColor: "#f1f8e9",
    borderRadius: 8,
    border: "2px solid #81c784",
  },
  answerLabel: {
    fontSize: 14,
    color: "#558b2f",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: 5,
    fontWeight: "bold",
  },
  answerValue: {
    fontSize: 28,
    color: "#2e7d32",
    fontWeight: "800",
  },
};
