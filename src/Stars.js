import { roundRating } from "./gameUtils";

const COLORS = {
  gold: "#f9a825",
  blue: "#1e88e5",
  miss: "#b0bec5",
  none: "#cfd8dc",
};

const NAMES = { gold: "gold star", blue: "blue star", miss: "hollow star", none: "unplayed star" };

// One star per round. `special` adds the triple-gold glow, `animate` pops the
// stars in one after another.
export default function Stars({ results, total, size = 20, special = false, animate = false }) {
  const ratings = Array.from({ length: total }, (_, i) => roundRating(results[i]));
  return (
    <span
      role="img"
      aria-label={ratings.map((r) => NAMES[r]).join(", ")}
      style={{ display: "inline-flex", gap: Math.round(size * 0.15), lineHeight: 1 }}
    >
      {ratings.map((rating, i) => (
        <span
          key={i}
          className={animate ? "fx" : undefined}
          style={{
            fontSize: size,
            color: COLORS[rating],
            textShadow:
              special && rating === "gold" ? "0 0 12px rgba(249, 168, 37, 0.9)" : "none",
            animation: animate ? `starPop 0.6s ${i * 0.25}s both` : undefined,
          }}
        >
          {rating === "gold" || rating === "blue" ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}
