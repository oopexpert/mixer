import React from 'react';

const AdminStatusDisplay = ({ state, authNotice }) => {
  return (
    <div style={statusPanelStyle}>
      <div style={statusLabelStyle}>SYSTEM-STATUS</div>
      <div style={statusRowStyle}>
        <div style={statusBadgeStyle}>
          {getStatusText(state)}
        </div>
        <div
          style={{
            ...statusIndicatorStyle,
            backgroundColor: getStatusColor(state)
          }}
          aria-hidden="true"
        />
      </div>
      {authNotice && (
        <div style={authNoticeStyle}>{authNotice}</div>
      )}
    </div>
  );
};

const getStatusColor = (state) => {
  switch (state) {
    case 'MixerDispense': return '#27ae60';
    case 'MixerDispensing': return '#3498db';
    case 'Initial': return '#7f8c8d';
    case 'RequestPrimingContainer': return '#f39c12';
    case 'PrimingContainerConfirmed': return '#f39c12';
    case 'Priming': return '#f39c12';
    case 'RecordingIngredient': return '#e67e22';
    case 'Error': return '#e74c3c';
    default: return '#95a5a6';
  }
};

const getStatusText = (state) => {
  switch (state) {
    case 'MixerDispense': return 'System bereit für Abfüllung';
    case 'MixerDispensing': return 'System füllt ab';
    case 'Initial': return 'System aus';
    case 'RequestPrimingContainer': return 'Kalibrierung: Behälter vorbereiten';
    case 'PrimingContainerConfirmed': return 'Kalibrierung: Leitungen spülen';
    case 'Startup': return 'System wird gestartet';
    case 'Priming': return 'Leitungen werden gespült';
    case 'RecordingIngredient': return 'Aufzeichnungsmodus aktiv';
    case 'Error': return 'Fehler im System';
    default: return `Unbekannter Status: ${state ?? '–'}`;
  }
};

const statusPanelStyle = {
  background: '#f8f9fa',
  padding: '15px',
  borderRadius: '12px',
  marginBottom: '20px',
  borderLeft: '5px solid #007bff',
  textAlign: 'center'
};

const statusLabelStyle = {
  fontSize: '0.75rem',
  fontWeight: 'bold',
  color: '#95a5a6',
  letterSpacing: '2px',
  marginBottom: '8px'
};

const statusBadgeStyle = {
  padding: '10px 20px',
  borderRadius: '8px',
  color: '#2f3b46',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  textAlign: 'center',
  backgroundColor: '#e3e7eb',
  flex: 1
};

const statusRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px'
};

const statusIndicatorStyle = {
  width: '18px',
  height: '18px',
  borderRadius: '4px',
  flexShrink: 0,
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)'
};

const authNoticeStyle = {
  marginTop: '12px',
  padding: '10px 12px',
  borderRadius: '10px',
  backgroundColor: '#fff3cd',
  border: '1px solid #ffe08a',
  color: '#7a5b00',
  fontSize: '0.92rem'
};

export { getStatusColor, getStatusText };
export default AdminStatusDisplay;
