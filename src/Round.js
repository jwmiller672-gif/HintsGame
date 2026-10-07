import { useEffect, useState } from "react";
import styles from "./styles";
import { levenshteinDistance, normalizeAnswer } from "./gameUtils";

// One round: reveal hints one at a time and guess the answer. A wrong guess
// reveals the next hint. Calls onComplete({won, hints, guesses}) exactly once.
export default function Round({ round, nextLabel, onComplete, onNext }) {
  const [hintsRevealed, setHintsRevealed] = useState(1);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [guessCount, setGuessCount] = useState(0);
  const [showIncorrectPrompt, setShowIncorrectPrompt] = useState(false);
  const [justRevealed, setJustRevealed] = useState(0);
  const [animatingHint, setAnimatingHint] = useState(-1);
  const [resultVisible, setResultVisible] = useState(false);

  useEffect(() => {
    if (justRevealed >= 0) {
      // Start with opacity 0, then animate to 1
      setAnimatingHint(-1);
      const timer = setTimeout(() => setAnimatingHint(justRevealed), 50);
      return () => clearTimeout(timer);
    }
  }, [justRevealed]);

  useEffect(() => {
    if (gameOver) {
      const timer = setTimeout(() => setResultVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [gameOver]);

  const canGuess = guessCount < hintsRevealed && !gameOver;

  function revealHint(keepMessage = false) {
    if (hintsRevealed < round.hints.length) {
      setJustRevealed(hintsRevealed);
      setHintsRevealed(hintsRevealed + 1);
      if (!keepMessage) {
        setMessage("");
        setShowIncorrectPrompt(false);
      }
      setGuessCount(0);
    }
  }

  function submitGuess(e) {
    e.preventDefault();
    if (!input.trim() || gameOver || !canGuess) return;

    const guess = input.trim();
    const answer = round.answer.trim();
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
      setGuessCount(guessCount + 1);
      setInput("");
      setShowIncorrectPrompt(false);
      onComplete({ won: true, hints: hintsRevealed, guesses: newGuesses });
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
    if (hintsRevealed < round.hints.length) {
      revealHint(true);
    } else {
      setGameOver(true);
      setMessage("❌ Out of guesses!");
      setShowIncorrectPrompt(false);
      onComplete({ won: false, hints: hintsRevealed, guesses: newGuesses });
    }

    setInput("");
  }

  return (
    <>
      <div style={styles.hintsContainer}>
        {Array.from({ length: round.hints.length }).map((_, i) => (
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
              {i < hintsRevealed || gameOver ? round.hints[i] : ""}
            </span>
          </div>
        ))}
      </div>

      {!gameOver && hintsRevealed < round.hints.length && (
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
            <div style={styles.answerValue}>{round.answer}</div>
          </div>
          {nextLabel && (
            <button onClick={onNext} style={{ ...styles.button, fontSize: 18, padding: "12px 30px" }}>
              {nextLabel}
            </button>
          )}
        </div>
      )}
    </>
  );
}
