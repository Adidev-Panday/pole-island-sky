import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// A single 4-point "sparkle" star (matches the Labels-toggle/about-panel
// visual language elsewhere in the UI - a plain point of light, not a
// literal 5-point cartoon star) on the app's own night-sky background.
const STAR_PATH =
  'M50 6 C50 6 54 40 60 46 C66 52 94 50 94 50 C94 50 66 52 60 60 C54 68 50 94 50 94 C50 94 46 68 40 60 C34 52 6 50 6 50 C6 50 34 52 40 46 C46 40 50 6 50 6 Z';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#02030a',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 100 100">
          <path d={STAR_PATH} fill="#e8ecf5" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
