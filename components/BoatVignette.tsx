export default function BoatVignette() {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: '22vh',
        zIndex: 1,
        pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.55))',
      }}
    >
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 1000 300"
        style={{ position: 'absolute', inset: 0 }}
      >
        <path
          d="M -20 220 C 300 260, 700 260, 1020 220"
          fill="none"
          stroke="rgba(0, 0, 0, 0.7)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
