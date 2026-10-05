import React from 'react';

const StatusPanel = ({ status, isLoading, isAdmin, onAdminToggle }) => {
  // Bestimmung der Farbe basierend auf dem Status-Namen
  const getStatusColor = (state) => {
    switch (state) {
      case 'MixerDispense': return '#27ae60'; // Grün: Bereit
      case 'MixerDispensing': return '#3498db'; // Blau: Arbeitet
      case 'Initial': return '#7f8c8d'; // Grau: Standby
      case 'Error': return '#e74c3c'; // Rot: Fehler
      default: return '#f39c12'; // Orange: Setup/Zwischenzustände
    }
  };

  // Humanisierte Status-Texte
  const getStatusText = (state) => {
    switch (state) {
      case 'MixerDispense': return 'Mixer ist bereit für Abfüllung';
      case 'MixerDispensing': return 'Mixer füllt gerade ab';
      case 'Initial': return 'System wird initialisiert';
      case 'Error': return 'Fehler im System';
      default: return 'System wird vorbereitet';
    }
  };

  return (
    <div style={panelContainerStyle}>
      {/* Top-Bereich mit Spinner und Admin-Button */}
      <div style={topControlStyle}>
        {isLoading && (
          <div style={spinnerPositionStyle}>
            <div className="loader"></div>
          </div>
        )}
        {onAdminToggle && (
          <button 
            onClick={onAdminToggle}
            style={adminButtonStyle}
          >
            {isAdmin ? "🔐 Logout" : "🔑 Admin"}
          </button>
        )}
      </div>

      <div style={contentStyle}>
        <div style={labelStyle}>AKTUELLER SYSTEM-MODUS</div>

        <div style={messageBoxStyle}>
          <span style={quoteIconStyle}>"</span>
          <span style={messageTextStyle}>{status.message}</span>
          <span style={quoteIconStyle}>"</span>
        </div>
      </div>
      
      {/* Kleine Status-Leiste am unteren Rand der Box */}
      <div style={{
        ...bottomIndicatorStyle,
        backgroundColor: getStatusColor(status.state),
        width: isLoading ? '100%' : '30%',
        transition: 'width 0.5s ease'
      }} />
    </div>
  );
};

// --- Styles für StatusPanel ---

const panelContainerStyle = {
  background: '#ffffff',
  padding: 'clamp(15px, 4vw, 25px)',
  borderRadius: '20px',
  margin: '0 auto 40px',
  width: '100%',
  maxWidth: '600px',
  boxSizing: 'border-box',
  position: 'relative',
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  textAlign: 'center'
};

const topControlStyle = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const spinnerPositionStyle = {
  display: 'flex',
  alignItems: 'center'
};

const adminButtonStyle = {
  padding: '6px 12px',
  fontSize: '0.85rem',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap'
};

const contentStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px'
};

const labelStyle = {
  fontSize: '0.75rem',
  fontWeight: 'bold',
  color: '#95a5a6',
  letterSpacing: '2px'
};

const stateBadgeStyle = {
  padding: '8px 20px',
  borderRadius: '50px',
  color: '#ffffff',
  fontSize: '1.4rem',
  fontWeight: 'bold',
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
  textTransform: 'uppercase'
};

const messageBoxStyle = {
  marginTop: '10px',
  padding: '0 20px'
};

const messageTextStyle = {
  color: '#34495e',
  fontSize: '1.1rem',
  fontStyle: 'italic'
};

const quoteIconStyle = {
  color: '#bdc3c7',
  fontSize: '1.5rem',
  fontWeight: 'serif',
  padding: '0 5px'
};

const bottomIndicatorStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  height: '5px',
  borderRadius: '0 5px 5px 0'
};

export default StatusPanel;