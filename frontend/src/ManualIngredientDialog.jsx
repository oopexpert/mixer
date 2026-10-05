import React, { useEffect, useState } from 'react';

const ManualIngredientDialog = ({ ingredient, error, syncError, confirmPending, isLoading, onConfirm, onRetry }) => {
  const [glassPositionConfirmed, setGlassPositionConfirmed] = useState(false);

  useEffect(() => {
    setGlassPositionConfirmed(false);
  }, [ingredient?.uuid, ingredient?.hasNextAutomaticDispenseStep]);

  if (!ingredient) return null;

  const requiresGlassPositionConfirmation = Boolean(ingredient.hasNextAutomaticDispenseStep);
  const isConfirmDisabled = !ingredient.uuid || isLoading || confirmPending || (requiresGlassPositionConfirmation && !glassPositionConfirmed);

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <div style={labelStyle}>MANUELLER SCHRITT</div>
        <h2 style={titleStyle}>Manuelle Zutat erforderlich</h2>
        <p style={textStyle}>
          Bitte fuege folgende Zutat hinzu und bestaetige anschliessend:
        </p>
        <div style={ingredientNameStyle}>
          {ingredient.name || 'Unbekannte Zutat'}
        </div>

        {requiresGlassPositionConfirmation && (
          <div style={safetyNoticeStyle}>
            <div style={safetyTitleStyle}>Sicherheitsabfrage vor dem naechsten automatischen Schritt</div>
            <label style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={glassPositionConfirmed}
                onChange={(event) => setGlassPositionConfirmed(event.target.checked)}
              />
              <span>Ich habe das Glas wieder korrekt positioniert.</span>
            </label>
          </div>
        )}

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        {syncError && (
          <div style={warningStyle}>{syncError}</div>
        )}

        <div style={actionRowStyle}>
          <button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            style={{
              ...primaryButtonStyle,
              opacity: isConfirmDisabled ? 0.7 : 1
            }}
          >
            Zutat hinzugefuegt - bestaetigen
          </button>

          {(syncError || confirmPending) && (
            <button
              onClick={onRetry}
              disabled={isLoading}
              style={secondaryButtonStyle}
            >
              Erneut versuchen
            </button>
          )}
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

const ingredientNameStyle = {
  padding: '14px 16px',
  borderRadius: '14px',
  backgroundColor: '#f0f4f8',
  color: '#17324d',
  fontSize: '1.25rem',
  fontWeight: 'bold'
};

const errorStyle = {
  padding: '12px 14px',
  borderRadius: '12px',
  backgroundColor: '#fdecec',
  border: '1px solid #f7b4b4',
  color: '#a63131',
  fontSize: '0.95rem'
};

const warningStyle = {
  padding: '12px 14px',
  borderRadius: '12px',
  backgroundColor: '#fff5e8',
  border: '1px solid #f4cf9b',
  color: '#8a5b12',
  fontSize: '0.95rem'
};

const safetyNoticeStyle = {
  padding: '14px 16px',
  borderRadius: '14px',
  backgroundColor: '#eef7ff',
  border: '1px solid #bfdcff',
  color: '#17324d',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const safetyTitleStyle = {
  fontWeight: 'bold',
  fontSize: '0.98rem'
};

const checkboxRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  fontSize: '0.98rem',
  lineHeight: 1.4,
  cursor: 'pointer'
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

const secondaryButtonStyle = {
  width: '100%',
  padding: '14px 18px',
  borderRadius: '14px',
  border: '1px solid #c4ced8',
  backgroundColor: '#ffffff',
  color: '#314254',
  fontSize: '0.98rem',
  fontWeight: 'bold',
  cursor: 'pointer'
};

export default ManualIngredientDialog;
