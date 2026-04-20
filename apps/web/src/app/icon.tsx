import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        backgroundColor: '#0c0c0e',
        borderRadius: '6px',
        padding: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '16px',
          height: '3px',
          backgroundColor: '#22c55e',
          opacity: 0.35,
          borderRadius: '1px',
        }}
      />
      <div
        style={{
          display: 'flex',
          width: '16px',
          height: '3px',
          backgroundColor: '#22c55e',
          opacity: 0.6,
          borderRadius: '1px',
        }}
      />
      <div
        style={{
          display: 'flex',
          width: '16px',
          height: '3px',
          backgroundColor: '#22c55e',
          opacity: 0.85,
          borderRadius: '1px',
        }}
      />
      <div style={{ display: 'flex', height: '2px' }} />
      <div
        style={{
          display: 'flex',
          width: '22px',
          height: '5px',
          backgroundColor: '#22c55e',
          borderRadius: '2px',
          boxShadow: '0 0 8px rgba(34,197,94,0.6)',
        }}
      />
    </div>,
    { ...size },
  );
}
