import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        backgroundColor: '#0c0c0e',
        borderRadius: '36px',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '90px',
          height: '14px',
          backgroundColor: '#22c55e',
          opacity: 0.3,
          borderRadius: '4px',
        }}
      />
      <div
        style={{
          display: 'flex',
          width: '90px',
          height: '14px',
          backgroundColor: '#22c55e',
          opacity: 0.55,
          borderRadius: '4px',
        }}
      />
      <div
        style={{
          display: 'flex',
          width: '90px',
          height: '14px',
          backgroundColor: '#22c55e',
          opacity: 0.8,
          borderRadius: '4px',
        }}
      />
      <div style={{ display: 'flex', height: '10px' }} />
      <div
        style={{
          display: 'flex',
          width: '120px',
          height: '22px',
          backgroundColor: '#22c55e',
          borderRadius: '8px',
          boxShadow: '0 0 40px rgba(34,197,94,0.7)',
        }}
      />
    </div>,
    { ...size },
  );
}
