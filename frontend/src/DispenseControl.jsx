import React from 'react';

const DispenseControl = ({ 
  state, 
  selectedRecipe, 
  token, 
  setToken, 
  onConfirm, 
  onCancel,
  requireRecipeToken = true
}) => {
  // Wir prüfen, ob das System gerade aktiv abfüllt
  const isLocked = state === 'MixerDispensing';
  const canConfirm = !requireRecipeToken || (token && token.trim().length > 0);

  if (!selectedRecipe) return null;

  return (
    <div style={{
      ...containerStyle,
      border: isLocked ? '3px solid #007bff' : '1px solid #dee2e6',
      boxShadow: isLocked ? '0 15px 40px rgba(0,123,255,0.2)' : '0 10px 25px rgba(0,0,0,0.1)'
    }}>
      
      {/* Kopfbereich mit Rezeptname */}
      <div style={headerStyle}>
        <span style={{ fontSize: '2.5rem' }}>🍹</span>
        <h2 style={titleStyle}>{selectedRecipe.name}</h2>
        {isLocked ? (
          <div style={activeStatusStyle}>
            <span className="pulse-animation" style={{ display: 'inline-block', marginRight: '10px' }}>⚙️</span>
            Wird gerade gemischt...
          </div>
        ) : (
          <p style={instructionStyle}>
            {requireRecipeToken
              ? 'Bitte Glas unterstellen und Token eingeben.'
              : 'Bitte Glas unterstellen und Rezept bestätigen.'}
          </p>
        )}
      </div>

      {/* Eingabebereich: Nur sichtbar, wenn nicht gerade abgefüllt wird und Token erforderlich */}
      {!isLocked && requireRecipeToken && (
        <div style={inputSectionStyle}>
          <input
            type="text"
            placeholder="Dein Rezepttoken"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={inputFieldStyle}
            autoFocus
          />
        </div>
      )}

      {/* Aktions-Buttons */}
      <div style={buttonGroupStyle}>
        {isLocked ? (
          <div style={progressInfoStyle}>
            <p>Dein Drink ist in Arbeit. Bitte warten...</p>
            {/* Hier könnte man später einen echten Fortschrittsbalken einbauen */}
          </div>
        ) : (
          <>
            <button
              disabled={!canConfirm}
              onClick={onConfirm}
              style={{
                ...actionButtonStyle,
                backgroundColor: canConfirm ? '#27ae60' : '#bdc3c7',
                cursor: canConfirm ? 'pointer' : 'not-allowed'
              }}
            >
              🚀 Jetzt mischen!
            </button>
            <button 
              onClick={onCancel} 
              style={{ ...actionButtonStyle, backgroundColor: '#e74c3c' }}
            >
              🔙 Zurück
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// --- Styles für DispenseControl ---

const containerStyle = {
  background: '#ffffff',
  padding: 'clamp(20px, 5vw, 40px)',
  borderRadius: '24px',
  textAlign: 'center',
  maxWidth: '600px',
  width: '100%',
  margin: '20px auto',
  boxSizing: 'border-box',
  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
};

const headerStyle = {
  marginBottom: '30px'
};

const titleStyle = {
  fontSize: '2rem',
  color: '#2c3e50',
  margin: '10px 0'
};

const instructionStyle = {
  color: '#7f8c8d',
  fontSize: '1.1rem',
  lineHeight: '1.5'
};

const activeStatusStyle = {
  color: '#007bff',
  fontWeight: 'bold',
  fontSize: '1.3rem',
  marginTop: '15px',
  padding: '10px',
  backgroundColor: '#ebf5fb',
  borderRadius: '12px'
};

const inputSectionStyle = {
  marginBottom: '30px',
};

const inputFieldStyle = {
  width: '100%',
  maxWidth: '300px',
  padding: '15px',
  fontSize: '1.6rem',
  textAlign: 'center',
  borderRadius: '12px',
  border: '2px solid #3498db',
  backgroundColor: '#ffffff', // Hintergrund explizit auf Weiß
  color: '#000000',           // Schrift explizit auf Tiefschwarz
  outline: 'none',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
  transition: 'border-color 0.2s'
};

const buttonGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '15px',
  alignItems: 'center'
};

const actionButtonStyle = {
  width: '100%',
  maxWidth: '300px',
  padding: '18px',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  transition: 'transform 0.1s, filter 0.2s'
};

const progressInfoStyle = {
  color: '#34495e',
  fontStyle: 'italic',
  padding: '20px'
};

export default DispenseControl;