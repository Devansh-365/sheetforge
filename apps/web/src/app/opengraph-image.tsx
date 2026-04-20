import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt =
  'sheetforge — Google Sheets as a backend that actually behaves like one';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        backgroundColor: '#0c0c0e',
        backgroundImage:
          'radial-gradient(circle at 100% 0%, rgba(34,197,94,0.12) 0%, rgba(12,12,14,0) 60%)',
        color: '#f2eded',
        borderLeft: '6px solid #22c55e',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#22c55e' }}>[</span>
          <span>sheetforge</span>
          <span style={{ color: '#22c55e' }}>]</span>
        </div>
        <span
          style={{
            fontSize: '18px',
            padding: '6px 12px',
            border: '1px solid #22c55e',
            color: '#4ade80',
            borderRadius: '4px',
          }}
        >
          OSS · self-host
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div
          style={{
            fontSize: '68px',
            fontWeight: 700,
            lineHeight: 1.1,
            color: '#f2eded',
            letterSpacing: '-0.02em',
          }}
        >
          Google Sheets as a backend
          <br />
          that actually behaves like one.
        </div>
        <div
          style={{
            fontSize: '28px',
            lineHeight: 1.4,
            color: '#b8b2b2',
          }}
        >
          Race-condition-safe writes · Typed TypeScript SDKs · no polling
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '22px',
          color: '#7f7a7a',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '9999px',
              backgroundColor: '#22c55e',
            }}
          />
          <span style={{ color: '#86efac' }}>
            1000 concurrent writes · 1000 ordered rows · 0 collisions
          </span>
        </span>
        <span style={{ color: '#4ade80' }}>
          github.com/Devansh-365/sheetforge
        </span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
