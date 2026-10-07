import { useEffect, useRef, useState } from "react";
import styles from "./styles";
import Round from "./Round";
import Stars from "./Stars";
import {
  ROUND_TYPES,
  formatDateForDisplay,
  formatDuration,
  getArchiveResult,
  getRoundResults,
  getRounds,
  getTimeUntilTomorrow,
  isMobile,
  isTripleGold,
  ratingEmoji,
  roundRating,
  saveArchiveResult,
  streakQualifies,
} from "./gameUtils";

// Fixed positions for the triple-gold sparkles (keeps renders deterministic).
const SPARKLES = [
  { left: "8%", top: "22%", delay: 0 }, { left: "20%", top: "70%", delay: 0.4 },
  { left: "33%", top: "12%", delay: 0.8 }, { left: "46%", top: "82%", delay: 0.2 },
  { left: "58%", top: "18%", delay: 1.0 }, { left: "70%", top: "74%", delay: 0.6 },
  { left: "82%", top: "26%", delay: 0.3 }, { left: "92%", top: "64%", delay: 0.9 },
];

// A puzzle day: plays each round in order (one for legacy days, three for
// Person / Place / Thing days) and shows the combined results.
export default function GameScreen({
  puzzle,
  puzzleNumber,
  isToday,
  streak,
  onGameOver,
  onBack,
}) {
  const rounds = getRounds(puzzle);
  const total = rounds.length;
  const multi = total > 1;

  // Today's progress survives a reload; archive replays always start fresh.
  const [initialResults] = useState(() =>
    isToday ? getRoundResults(getArchiveResult(puzzle.date)).slice(0, total) : []
  );
  const resumedComplete = initialResults.length >= total;

  const [roundResults, setRoundResults] = useState(initialResults);
  const [roundIndex, setRoundIndex] = useState(initialResults.length);
  const [gameStarted, setGameStarted] = useState(initialResults.length > 0);
  const [timeUntilTomorrow, setTimeUntilTomorrow] = useState(getTimeUntilTomorrow());
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(resumedComplete);
  const overlayTimer = useRef(null);

  const dayComplete = roundResults.length >= total;
  const solvedCount = roundResults.filter((r) => r.won).length;
  const tripleGold = isTripleGold(roundResults, total);

  useEffect(() => {
    if (!isToday) return;
    const timer = setInterval(() => {
      setTimeUntilTomorrow(getTimeUntilTomorrow());
    }, 1000);
    return () => clearInterval(timer);
  }, [isToday]);

  useEffect(() => {
    if (dayComplete && !resumedComplete) {
      overlayTimer.current = setTimeout(() => setShowOverlay(true), 2000);
      return () => clearTimeout(overlayTimer.current);
    }
  }, [dayComplete, resumedComplete]);

  function handleRoundComplete(result) {
    const next = [...roundResults, { won: result.won, hints: result.hints }];
    setRoundResults(next);
    // Today saves after every round so a reload resumes; archive replays only
    // save once the whole day is finished.
    if (isToday || next.length === total) {
      saveArchiveResult(puzzle.date, { rounds: next });
    }
    if (next.length === total && isToday && onGameOver) {
      onGameOver(streakQualifies(next));
    }
  }

  function openResults() {
    clearTimeout(overlayTimer.current);
    setShowOverlay(true);
  }

  function getShareDetails() {
    const shareUrl = window.location.href;
    let baseShareText;

    if (!multi) {
      const result = roundResults[0] || { won: false, hints: 3 };
      let resultMessage;
      if (result.won) {
        resultMessage =
          roundRating(result) === "gold"
            ? "I got it on the first hint 🥳! You try!"
            : `I got it in ${result.hints} hints! Can you do better?`;
      } else {
        resultMessage = "Stumped me today! Can you get it?";
      }
      baseShareText = `Hints #${puzzleNumber}\n${ratingEmoji(result)}\n${resultMessage}`;
    } else {
      const line = rounds
        .map((round, i) => `${ROUND_TYPES[round.type].emoji}${ratingEmoji(roundResults[i])}`)
        .join(" ");
      const closing = tripleGold ? "TRIPLE GOLD! 🏆 Can you match it?" : "Can you beat my score?";
      baseShareText = `Hints #${puzzleNumber}\n${line}\n${closing}`;
    }

    return { baseShareText, fullShareText: `${baseShareText}\n${shareUrl}`, shareUrl };
  }

  function shareResults() {
    if (!dayComplete) return;
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
    if (!dayComplete) return;
    const { fullShareText } = getShareDetails();
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}`;
    window.open(xUrl, '_blank');
  }

  const currentRound = roundIndex < total ? rounds[roundIndex] : null;
  const currentMeta = currentRound && currentRound.type ? ROUND_TYPES[currentRound.type] : null;
  const isLastRound = roundIndex === total - 1;
  const nextMeta =
    currentRound && !isLastRound && multi ? ROUND_TYPES[rounds[roundIndex + 1].type] : null;
  const nextLabel = isLastRound
    ? "See Results 📊"
    : nextMeta
      ? `Next: ${nextMeta.emoji} ${nextMeta.label} →`
      : null;

  const overlayTitle = multi
    ? tripleGold
      ? "TRIPLE GOLD!"
      : solvedCount === 0
        ? "You got stumped today!"
        : `You solved ${solvedCount} of ${total} rounds!`
    : roundResults[0] && roundResults[0].won
      ? `Congrats! You got it in ${roundResults[0].hints} hint${roundResults[0].hints !== 1 ? "s" : ""}!`
      : "You got stumped!";
  const overlayGood = solvedCount > 0;

  return (
    <div style={{ ...styles.container, minHeight: showOverlay ? 640 : undefined }}>
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
      <h3 style={{ ...styles.todayTheme, color: "#2c3e50", marginBottom: multi ? 8 : 20 }}>
        {isToday
          ? `Today's Theme: ${puzzle.theme}`
          : `Puzzle #${puzzleNumber} • ${formatDateForDisplay(puzzle.date)} • ${puzzle.theme}`}
      </h3>
      {multi && !gameStarted && (
        <p style={{ ...styles.instructions, color: "#546e7a", marginBottom: 10 }}>
          Three rounds: {rounds.map((r) => `${ROUND_TYPES[r.type].emoji} ${ROUND_TYPES[r.type].label}`).join(" · ")}
        </p>
      )}

      {!gameStarted ? (
        <button
          onClick={() => setGameStarted(true)}
          style={{ ...styles.button, fontSize: 20, padding: "15px 40px", marginTop: 20 }}
        >
          Play
        </button>
      ) : (
        <>
          {multi && roundIndex > 0 && (
            <div style={styles.summaryList}>
              {rounds.slice(0, Math.min(roundIndex, total)).map((round, i) => (
                <div key={i} style={styles.summaryRow}>
                  <span>
                    {ROUND_TYPES[round.type].emoji} <strong>{ROUND_TYPES[round.type].label}:</strong> {round.answer}
                  </span>
                  <Stars results={[roundResults[i]]} total={1} size={20} />
                </div>
              ))}
            </div>
          )}

          {currentRound && (
            <>
              {multi && currentMeta && (
                <>
                  <div style={styles.roundHeader}>
                    {currentMeta.emoji} Round {roundIndex + 1} of {total} · {currentMeta.label}
                  </div>
                  <div style={styles.roundPrompt}>{currentMeta.prompt}</div>
                </>
              )}
              <Round
                key={roundIndex}
                round={currentRound}
                nextLabel={multi ? nextLabel : null}
                onComplete={handleRoundComplete}
                onNext={() => (isLastRound ? openResults() : setRoundIndex(roundIndex + 1))}
              />
            </>
          )}

          {dayComplete && overlayDismissed && (
            <button
              onClick={openResults}
              style={{ ...styles.button, marginTop: 15, backgroundColor: "#607d8b" }}
            >
              View Results 📊
            </button>
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
          padding: '20px',
          overflowY: 'auto',
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

          {tripleGold && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {SPARKLES.map((s, i) => (
                <span
                  key={i}
                  className="fx"
                  style={{
                    position: 'absolute',
                    left: s.left,
                    top: s.top,
                    fontSize: 22,
                    animation: `sparkleFloat 2.4s ${s.delay}s infinite`,
                  }}
                >
                  ✨
                </span>
              ))}
            </div>
          )}

          <div style={{ margin: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              className={tripleGold ? "fx" : undefined}
              style={tripleGold ? {
                fontSize: 38,
                fontWeight: 900,
                letterSpacing: 1,
                marginBottom: 6,
                textAlign: 'center',
                backgroundImage: 'linear-gradient(90deg, #f9a825, #fff59d, #f9a825)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                animation: 'goldShimmer 2s linear infinite',
              } : {
                fontSize: 24,
                fontWeight: 'bold',
                color: overlayGood ? '#1565c0' : '#c62828',
                marginBottom: 12,
                textAlign: 'center'
              }}
            >
              {overlayTitle}
            </div>
            <div style={{ marginBottom: tripleGold ? 8 : 16 }}>
              <Stars
                results={roundResults}
                total={total}
                size={tripleGold ? 54 : 40}
                special={tripleGold}
                animate
              />
            </div>
            {tripleGold && (
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f57f17', marginBottom: 16 }}>
                A perfect day: every round on the first clue! 🏆
              </div>
            )}

            {multi && (
              <div style={{ ...styles.summaryList, width: '100%', maxWidth: 340, marginBottom: 20 }}>
                {rounds.map((round, i) => (
                  <div key={i} style={styles.summaryRow}>
                    <span>
                      {ROUND_TYPES[round.type].emoji} <strong>{ROUND_TYPES[round.type].label}:</strong> {round.answer}
                    </span>
                    <Stars results={[roundResults[i]]} total={1} size={20} />
                  </div>
                ))}
              </div>
            )}

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
