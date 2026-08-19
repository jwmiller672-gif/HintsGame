import { useEffect, useState } from "react";
import styles from "./styles";
import {
  formatDateForDisplay,
  formatDuration,
  getTimeUntilTomorrow,
  isMobile,
  levenshteinDistance,
  normalizeAnswer,
  saveArchiveResult,
} from "./gameUtils";

export default function GameScreen({
  puzzle,
  puzzleNumber,
  isToday,
  streak,
  onGameOver,
  onBack,
}) {
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [guessCount, setGuessCount] = useState(0);
  const [showIncorrectPrompt, setShowIncorrectPrompt] = useState(false);
  const [justRevealed, setJustRevealed] = useState(-1);
  const [gameStarted, setGameStarted] = useState(false);
  const [animatingHint, setAnimatingHint] = useState(-1);
  const [timeUntilTomorrow, setTimeUntilTomorrow] = useState(getTimeUntilTomorrow());
  const [resultVisible, setResultVisible] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  useEffect(() => {
    if (!isToday) return;
    const timer = setInterval(() => {
      setTimeUntilTomorrow(getTimeUntilTomorrow());
    }, 1000);
    return () => clearInterval(timer);
  }, [isToday]);

  useEffect(() => {
    if (justRevealed >= 0) {
      // Start with opacity 0, then animate to 1
      setAnimatingHint(-1);
      setTimeout(() => {
        setAnimatingHint(justRevealed);
      }, 50);
    }
  }, [justRevealed]);

  useEffect(() => {
    if (gameOver) {
      setTimeout(() => setResultVisible(true), 50);
      setTimeout(() => setShowOverlay(true), 2000);
    }
  }, [gameOver]);

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

  function calculateStars(hintsUsed) {
    // Award stars based on how many hints were revealed when they won
    // 1 hint = 3 stars, 2 hints = 2 stars, 3 hints = 1 star
    return 4 - hintsUsed;
  }

  function finishGame(didWin, hintsUsed) {
    saveArchiveResult(puzzle.date, { won: didWin, hints: hintsUsed });
    if (isToday && onGameOver) {
      onGameOver(didWin, hintsUsed);
    }
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
      finishGame(true, hintsRevealed);
      setGuessCount(guessCount + 1);
      setInput("");
      setShowIncorrectPrompt(false);
      return;
    }

    // Partial/close match (use normalized versions)
    const guessWords = normalizedGuess.split(" ");
    const answerWords = normalizedAnswer.split(" ");

    // Check word-by-word with slightly looser tolerance for longer words
    const isWordClose = guessWords.every((word) =>
      answerWords.some((ansWord) => {
        const allowedEdits = ansWord.length > 4 ? 2 : 1;
        return levenshteinDistance(word, ansWord) <= allowedEdits;
      })
    );

    // Also check the entire string for overall closeness (handles spacing issues etc)
    const totalDist = levenshteinDistance(normalizedGuess, normalizedAnswer);
    const isOverallClose = totalDist <= 2 || (normalizedAnswer.length > 6 && totalDist <= 3);

    if (isWordClose || isOverallClose) {
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
      finishGame(false, hintsRevealed);
      setMessage("❌ Out of guesses!");
      setShowIncorrectPrompt(false);
    }

    setInput("");
  }

  function getShareDetails() {
    const stars = won ? calculateStars(hintsRevealed) : 0;
    const starsFilled = "⭐️".repeat(Math.max(stars, 0));
    const starsEmpty = "☆".repeat(Math.max(3 - stars, 0));
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

  return (
    <div style={styles.container}>
      {!isToday && (
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Archive
        </button>
      )}

      <img
        src={process.env.PUBLIC_URL + "/logo.png"}
        alt="Hints Logo"
        style={{ width: "160px", height: "auto", margin: "0 auto 15px", display: "block" }}
      />
      <h2 style={{ ...styles.subtitle, color: "#2c3e50" }}>
        The Daily Guessing Game
      </h2>
      <p style={{ ...styles.instructions, color: "#546e7a" }}>
        Reveal the hints and guess the correct answer. If you guess incorrectly,
        the next hint is revealed.
      </p>
      <h3 style={{ ...styles.todayTheme, color: "#2c3e50" }}>
        {isToday
          ? `Today's Theme: ${puzzle.theme}`
          : `Puzzle #${puzzleNumber} • ${formatDateForDisplay(puzzle.date)} • ${puzzle.theme}`}
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
            <button onClick={() => revealHint(false)} style={styles.button}>
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

          {message && !gameOver && (
            <p style={{ color: showIncorrectPrompt ? "red" : "#f57c00", fontWeight: "bold", marginTop: 10 }}>
              {message}
            </p>
          )}

          <div style={styles.guesses}>
            <strong>Guesses:</strong>{" "}
            {guesses.length > 0 ? guesses.join(", ") : "None yet"}
          </div>

          {gameOver && (
            <div style={styles.gameOverContainer}>
              <div style={{
                ...styles.answerBox,
                opacity: resultVisible ? 1 : 0,
                transition: 'opacity 1.5s ease-in'
              }}>
                <div style={styles.answerLabel}>The Answer</div>
                <div style={styles.answerValue}>{puzzle.answer}</div>
              </div>

              {overlayDismissed && (
                <button
                  onClick={() => setShowOverlay(true)}
                  style={{
                    ...styles.button,
                    marginTop: 10,
                    backgroundColor: "#607d8b"
                  }}
                >
                  View Results 📊
                </button>
              )}
            </div>
          )}
        </>
      )}

      {showOverlay && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderRadius: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.5s ease-in',
          zIndex: 10
        }}>
          <button
            onClick={() => {
              setShowOverlay(false);
              setOverlayDismissed(true);
            }}
            style={{
              position: 'absolute',
              top: 15,
              right: 15,
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>

          <div style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: won ? '#1565c0' : '#c62828',
            marginBottom: 20,
            textAlign: 'center'
          }}>
            {won ? `Congrats! You got it in ${hintsRevealed} hint${hintsRevealed !== 1 ? 's' : ''}!` : "You got stumped!"}
          </div>

          {isToday && (
            <div style={{ ...styles.scoreSummary, marginBottom: 30 }}>
              <div style={styles.scoreItem}>
                <div style={styles.scoreLabel}>Streak</div>
                <div style={styles.scoreValue}>{streak} 🔥</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', width: '100%', maxWidth: '300px' }}>
            <button
              onClick={shareResults}
              style={{ ...styles.button, ...styles.mobileButton, backgroundColor: "#1565c0" }}
              aria-label="Share via text"
            >
              Share Results on <span style={{ fontSize: '1.2em' }}>💬</span>
            </button>
            <button
              onClick={shareToX}
              style={{ ...styles.button, ...styles.mobileButton, backgroundColor: "black" }}
              aria-label="Share on X"
            >
              Share Results on 𝕏
            </button>
          </div>

          {isToday ? (
            <div style={{ ...styles.nextPuzzleTimer, backgroundColor: '#f5f5f5', marginTop: 30 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 5 }}>Play again tomorrow!</div>
              <div style={{ fontSize: '0.9em', color: '#666' }}>Next puzzle in: {formatDuration(timeUntilTomorrow)}</div>
            </div>
          ) : (
            <button
              onClick={onBack}
              style={{ ...styles.button, marginTop: 30, backgroundColor: "#607d8b" }}
            >
              ← Back to Archive
            </button>
          )}
        </div>
      )}

      {!gameStarted && isToday && (
        <div style={{ marginTop: 20, fontWeight: "600", fontSize: 18, color: "#2c3e50" }}>
          🔥 Streak: {streak} day{streak !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
