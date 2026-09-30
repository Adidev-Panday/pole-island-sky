export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_ALT =
  "Pole Island Sky, the night sky from Alan Lightman's island in Maine";

// Deterministic PRNG (mulberry32) so the star field is identical on every
// build - this is a static, generated-once-at-build image, not a live render.
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_FIELD_SEED = 20180614; // arbitrary, fixed
const STAR_COUNT = 200;
const STAR_FIELD_WIDTH = 620;

function buildStarField() {
  const random = mulberry32(STAR_FIELD_SEED);
  return Array.from({ length: STAR_COUNT }, () => {
    const x = random() * STAR_FIELD_WIDTH;
    // Skewed toward small y (top of frame) via a power curve, evocative of
    // a sky rather than an evenly-scattered rectangle of dots.
    const y = OG_IMAGE_SIZE.height * Math.pow(random(), 1.6);
    const radius = 1 + random() * 1.8;
    const opacity = 0.35 + random() * 0.65;
    return { x, y, radius, opacity };
  });
}

/** Shared JSX tree for the Open Graph / Twitter share images. */
export function renderShareImage() {
  const stars = buildStarField();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: '#02030a',
      }}
    >
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: star.x,
            top: star.y,
            width: star.radius * 2,
            height: star.radius * 2,
            borderRadius: '50%',
            background: '#ffffff',
            opacity: star.opacity,
            display: 'flex',
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: 660,
          top: 220,
          display: 'flex',
          flexDirection: 'column',
          width: 480,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: '#e8ecf5',
            lineHeight: 1.05,
            display: 'flex',
          }}
        >
          Pole Island Sky
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 24,
            color: 'rgba(232, 236, 245, 0.6)',
            display: 'flex',
          }}
        >
          The wee-hours sky from Alan Lightman&apos;s Casco Bay island
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 40,
          bottom: 32,
          fontSize: 18,
          color: 'rgba(232, 236, 245, 0.35)',
          display: 'flex',
        }}
      >
        adidevpanday.com
      </div>
    </div>
  );
}
