import React from 'react';

const DispenseErrorDialog = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <div style={labelStyle}>REZEPT-TOKEN</div>
        <h2 style={titleStyle}>Token nicht gefunden</h2>
        <p style={textStyle}>{error}</p>
        <div style={actionRowStyle}>
          <button
            onClick={onDismiss}
            style={primaryButtonStyle}
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  zIndex: 2000,
  boxSizing: 'border-box'
};

const dialogStyle = {
  width: '100%',
  maxWidth: '540px',
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  padding: '28px',
  boxSizing: 'border-box',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  textAlign: 'left'
};

const labelStyle = {
  fontSize: '0.75rem',
  letterSpacing: '2px',
  fontWeight: 'bold',
  color: '#8b98a7'
};

const titleStyle = {
  margin: 0,
  fontSize: 'clamp(1.6rem, 4vw, 2rem)',
  color: '#1f2d3d'
};

const textStyle = {
  margin: 0,
  color: '#4a5565',
  fontSize: '1rem',
  lineHeight: 1.5
};

const actionRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const primaryButtonStyle = {
  width: '100%',
  padding: '16px 18px',
  borderRadius: '14px',
  border: 'none',
  backgroundColor: '#1f8f4e',
  color: '#ffffff',
  fontSize: '1rem',
  fontWeight: 'bold',
  cursor: 'pointer'
};

export default DispenseErrorDialog;
