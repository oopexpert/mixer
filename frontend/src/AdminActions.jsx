import React from 'react';

const AdminActions = ({
  state,
  isLoading,
  isAuthorized,
  reloadInfoText,
  onStart,
  onConfirmContainer,
  onSkipPrime,
  onPrime,
  onShutdown,
  onReloadConfiguration,
  onSaveConfiguration
}) => {
  return (
    <div style={actionPanelStyle}>
      {!isAuthorized ? (
        <p style={actionHintStyle}>Nur fuer Administratoren verfuegbar.</p>
      ) : (
        <>
          {state === 'Initial' && (
            <>
              <h3 style={actionTitleStyle}>System-Initialisierung</h3>
              <button
                onClick={onStart}
                disabled={isLoading}
                style={{...actionButtonStyle, backgroundColor: '#28a745'}}
              >
                🚀 System initialisieren
              </button>
            </>
          )}

          {state === 'RequestPrimingContainer' && (
            <>
              <h3 style={actionTitleStyle}>Behälter-Kalibrierung</h3>
              <p style={{color: '#666', fontSize: '0.9rem'}}>Bitte Priming-Behälter unterstellen</p>
              <div style={calibrationButtonsStyle}>
                <button
                  onClick={onConfirmContainer}
                  disabled={isLoading}
                  style={{...actionButtonStyle, backgroundColor: '#27ae60'}}
                >
                  ✅ Behälter bereit
                </button>
                <button
                  onClick={onSkipPrime}
                  disabled={isLoading}
                  style={{...actionButtonStyle, backgroundColor: '#7f8c8d'}}
                >
                  ⏩ Überspringen
                </button>
              </div>

              <div style={subPanelStyle}>
                <h3 style={subPanelTitleStyle}>Konfiguration</h3>
                {reloadInfoText && (
                  <div style={reloadInfoStyle}>{reloadInfoText}</div>
                )}
                <button
                  onClick={onReloadConfiguration}
                  disabled={isLoading}
                  style={{
                    ...actionButtonStyle,
                    ...compactActionButtonStyle,
                    backgroundColor: '#0d6efd',
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    marginTop: '4px'
                  }}
                >
                  🔄 Konfiguration neu laden
                </button>
                <button
                  onClick={onSaveConfiguration}
                  disabled={isLoading}
                  style={{
                    ...actionButtonStyle,
                    ...compactActionButtonStyle,
                    backgroundColor: '#198754',
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    marginTop: '4px'
                  }}
                >
                  💾 Konfiguration speichern
                </button>
              </div>
            </>
          )}

          {(state === 'PrimingContainerConfirmed' || state === 'Priming') && (
            <>
              <h3 style={actionTitleStyle}>Leitungen spülen</h3>
              <button
                onClick={onPrime}
                disabled={isLoading || state === 'Priming'}
                style={{
                  ...actionButtonStyle,
                  backgroundColor: '#f39c12',
                  opacity: state === 'Priming' ? 0.85 : 1,
                  cursor: state === 'Priming' ? 'not-allowed' : 'pointer'
                }}>
                💧 Leitungen spülen (Priming)
              </button>
              {state === 'Priming' && (
                <p style={{color: '#666', fontSize: '0.9rem'}}>Leitungen werden aktuell gespült ...</p>
              )}
            </>
          )}

          {state === 'MixerDispense' && (
            <>
              <h3 style={actionTitleStyle}>System bereit</h3>
              <div style={readyActionGridStyle}>
                <div style={shutdownActionGroupStyle}>
                  <button
                    onClick={onShutdown}
                    disabled={isLoading}
                    style={{...actionButtonStyle, ...compactActionButtonStyle, backgroundColor: '#dc3545'}}
                  >
                    ⏹️ System ausschalten
                  </button>
                </div>
                <div style={reloadActionGroupStyle}>
                  {reloadInfoText && (
                    <div style={reloadInfoStyle}>{reloadInfoText}</div>
                  )}
                  <button
                    onClick={onReloadConfiguration}
                    disabled={isLoading}
                    style={{
                      ...actionButtonStyle,
                      ...compactActionButtonStyle,
                      backgroundColor: '#0d6efd',
                      opacity: isLoading ? 0.7 : 1,
                      cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    🔄 Konfiguration neu laden
                  </button>
                  <button
                    onClick={onSaveConfiguration}
                    disabled={isLoading}
                    style={{
                      ...actionButtonStyle,
                      ...compactActionButtonStyle,
                      backgroundColor: '#198754',
                      opacity: isLoading ? 0.7 : 1,
                      cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    💾 Konfiguration speichern
                  </button>
                </div>
              </div>
            </>
          )}

          {state !== 'MixerDispense' && state !== 'RequestPrimingContainer' && (
            <>
              <h3 style={actionTitleStyle}>Konfiguration</h3>
              {reloadInfoText && (
                <div style={reloadInfoStyle}>{reloadInfoText}</div>
              )}
              <button
                onClick={onReloadConfiguration}
                disabled={isLoading}
                style={{
                  ...actionButtonStyle,
                  backgroundColor: '#0d6efd',
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                🔄 Konfiguration neu laden
              </button>
              <button
                onClick={onSaveConfiguration}
                disabled={isLoading}
                style={{
                  ...actionButtonStyle,
                  backgroundColor: '#198754',
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                💾 Konfiguration speichern
              </button>
            </>
          )}

          {isLoading && <p style={{color: '#3498db', marginTop: '10px', fontSize: '0.9rem'}}>Verarbeitung läuft...</p>}
        </>
      )}
    </div>
  );
};

const actionPanelStyle = {
  background: '#ffffff',
  padding: '20px',
  borderRadius: '12px',
  marginBottom: '20px',
  border: '1px solid #dee2e6'
};

const actionHintStyle = {
  margin: '0',
  color: '#6c757d',
  fontSize: '0.95rem'
};

const actionTitleStyle = {
  marginTop: '0',
  marginBottom: '15px',
  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
  color: '#2c3e50'
};

const actionButtonStyle = {
  padding: 'clamp(10px, 2vw, 15px)',
  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.2s ease',
  marginBottom: '10px',
  width: '100%'
};

const calibrationButtonsStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px'
};

const subPanelStyle = {
  marginTop: '18px',
  padding: '16px',
  borderRadius: '12px',
  backgroundColor: '#f8fbff',
  border: '1px solid #d6e6ff'
};

const subPanelTitleStyle = {
  marginTop: '0',
  marginBottom: '12px',
  fontSize: '1rem',
  color: '#2c3e50'
};

const readyActionGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '10px'
};

const compactActionButtonStyle = {
  marginBottom: '0',
  alignSelf: 'start'
};

const shutdownActionGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  minWidth: 0,
  width: '100%',
  height: '100%'
};

const reloadActionGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  width: '100%',
  height: '100%'
};

const reloadInfoStyle = {
  width: '100%',
  maxWidth: '100%',
  marginBottom: '12px',
  padding: '10px 12px',
  borderRadius: '10px',
  backgroundColor: '#e8f1ff',
  border: '1px solid #bfd4ff',
  color: '#1e4f91',
  fontSize: '0.92rem',
  lineHeight: 1.45,
  boxSizing: 'border-box',
  overflowWrap: 'anywhere'
};

export default AdminActions;
