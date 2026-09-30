import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const STAR_PATH =
  'M50 6 C50 6 54 40 60 46 C66 52 94 50 94 50 C94 50 66 52 60 60 C54 68 50 94 50 94 C50 94 46 68 40 60 C34 52 6 50 6 50 C6 50 34 52 40 46 C46 40 50 6 50 6 Z';

export default function AppleIcon() {
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
        <svg width="112" height="112" viewBox="0 0 100 100">
          <path d={STAR_PATH} fill="#e8ecf5" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
