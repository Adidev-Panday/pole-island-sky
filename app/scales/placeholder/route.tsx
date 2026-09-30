import { ImageResponse } from 'next/og';

const SIZE = 1200;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') ?? 'Untitled';
  const scale = searchParams.get('scale') ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 45%, #12172c 0%, #05060f 70%)',
        }}
      >
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: '50%',
            border: '1px solid rgba(232, 236, 245, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 260,
              height: 260,
              borderRadius: '50%',
              border: '1px solid rgba(232, 236, 245, 0.35)',
              display: 'flex',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 40,
              color: 'rgba(232, 236, 245, 0.6)',
              display: 'flex',
            }}
          >
            {scale}
          </div>
          <div
            style={{
              marginTop: 16,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 64,
              color: '#e8ecf5',
              display: 'flex',
              maxWidth: 900,
              textAlign: 'center',
              justifyContent: 'center',
            }}
          >
            {name}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 18,
            color: 'rgba(232, 236, 245, 0.3)',
            display: 'flex',
          }}
        >
          placeholder — image not yet supplied
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE }
  );
}
