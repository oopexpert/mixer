const AdminSetup = ({ state, sendCommand, isLoading }) => {
  // Wenn das System bereits im User-Modus ist, zeigen wir hier nichts an
  if (state === 'MixerDispense' || state === 'MixerDispensing') {
    return null;
  }

  return (
    <div style={adminContainerStyle}>
      <h3 style={adminTitleStyle}>System-Konfiguration</h3>
      <div style={buttonGroupStyle}>
        
        {/* SCHRITT 1: Starten */}
        {state === 'Initial' && (
          <button 
            disabled={isLoading}
            style={adminButtonStyle} 
            onClick={() => sendCommand('/admin/start')}
          >
            🚀 System initialisieren
          </button>
        )}

        {/* SCHRITT 2: Behälter-Check */}
        {state === 'RequestPrimingContainer' && (
          <>
            <button 
              disabled={isLoading}
              style={{...adminButtonStyle, backgroundColor: '#27ae60'}} 
              onClick={() => sendCommand('/admin/confirm-container')}
            >
              ✅ Behälter bereit
            </button>
            <button 
              disabled={isLoading}
              style={{...adminButtonStyle, backgroundColor: '#7f8c8d'}} 
              onClick={() => sendCommand('/admin/skip-prime')}
            >
              ⏩ Überspringen
            </button>
          </>
        )}

        {/* SCHRITT 3: Priming auslösen */}
        {state === 'PrimingContainerConfirmed' && (
          <button 
            disabled={isLoading}
            style={{...adminButtonStyle, backgroundColor: '#f39c12'}} 
            onClick={() => sendCommand('/admin/prime')}
          >
            💧 Leitungen spülen (Priming)
          </button>
        )}

      </div>
      {isLoading && <p style={{color: '#3498db', marginTop: '10px', fontSize: '0.9rem'}}>Verarbeitung läuft...</p>}
    </div>
  );
};

// --- Styles für die Admin-Komponente ---

const adminContainerStyle = {
  background: '#ffffff',
  padding: '25px',
  borderRadius: '15px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  borderTop: '5px solid #34495e',
  maxWidth: '500px',
  width: '100%',
  margin: '20px auto',
  textAlign: 'center'
};

const adminTitleStyle = {
  margin: '0 0 20px 0',
  fontSize: '1.1rem',
  color: '#2c3e50',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

const buttonGroupStyle = {
  display: 'flex',
  gap: '15px',
  justifyContent: 'center',
  flexWrap: 'wrap'
};

const adminButtonStyle = {
  padding: '15px 25px',
  color: '#fff',
  backgroundColor: '#3498db',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '1rem',
  transition: 'transform 0.1s, opacity 0.2s',
  boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
  // Visuelles Feedback für Deaktivierung
  opacity: 1,
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed'
  }
};

export default AdminSetup;