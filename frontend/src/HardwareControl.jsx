import React, { useState } from 'react';

const HardwareControl = ({
  ports,
  activePorts,
  onControl,
  isBusy = false,
  currentControlRequest = null,
  ingredients = [],
  onMapIngredient
}) => {
  const [durationInputs, setDurationInputs] = useState({});
  const [mappingInProgress, setMappingInProgress] = useState(null);
  const safePorts = Array.isArray(ports) ? ports : [];

  const handleDurationChange = (portName, value) => {
    setDurationInputs((prev) => ({
      ...prev,
      [portName]: value
    }));
  };

  const getButtonLabel = (portName, action) => {
    if (!isBusy || currentControlRequest?.port !== portName || currentControlRequest?.state !== action) {
      return action.toUpperCase();
    }

    return currentControlRequest.mode === 'pulse' ? 'PULSE...' : `${action.toUpperCase()}...`;
  };

  return (
    <>
      <h3 style={{marginTop: '0'}}>🔌 Hardware-Steuerung (Direkt)</h3>
      <style>{`
        @keyframes pulse-green {
          0% { background-color: #28a745; box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
          50% { background-color: #58d68d; box-shadow: 0 0 15px 5px rgba(40, 167, 69, 0.3); }
          100% { background-color: #28a745; box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
        }
      `}</style>
      <div style={portGridStyle}>
        {safePorts.map(portObj => {
          const { portName, ingredientName, ingredientUuid } = portObj;
          const currentIngredientUuid = ingredientUuid || '';
          const isOn = activePorts[portName] === 'on';
          const durationValue = durationInputs[portName] ?? '';
          const isMapping = mappingInProgress === portName;
          const showSelect = ingredients.length > 0 && onMapIngredient;

          const handleIngredientChange = async (e) => {
            const newUuid = e.target.value;
            setMappingInProgress(portName);
            try {
              await onMapIngredient(portName, newUuid);
            } finally {
              setMappingInProgress(null);
            }
          };

          return (
            <div key={portName} style={portItemStyle}>
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 'bold', display: 'block', color: '#000' }}>
                  {portName}
                </span>
                {showSelect ? (
                  <select
                    value={currentIngredientUuid}
                    onChange={handleIngredientChange}
                    disabled={isBusy || isMapping}
                    style={{
                      ...ingredientSelectStyle,
                      opacity: isBusy || isMapping ? 0.7 : 1,
                      cursor: isBusy || isMapping ? 'wait' : 'pointer'
                    }}
                  >
                    <option value="">— Keine Zutat —</option>
                    {ingredients.map((ing) => (
                      <option key={ing.uuid} value={ing.uuid}>{ing.name}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: ingredientName ? '#28a745' : '#888' }}>
                    {ingredientName || 'Keine Zutat zugewiesen'}
                  </span>
                )}
              </div>

              <div style={controlGroupStyle}>
                <button
                  onClick={() => onControl(portName, 'on', durationValue)}
                  disabled={isBusy}
                  style={{
                    ...baseButtonStyle,
                    backgroundColor: '#28a745',
                    animation: isOn ? 'pulse-green 0.8s infinite ease-in-out' : 'none',
                    border: isOn ? '2px solid white' : '2px solid transparent',
                    opacity: isBusy ? 0.7 : 1,
                    cursor: isBusy ? 'wait' : 'pointer'
                  }}
                >
                  {getButtonLabel(portName, 'on')}
                </button>

                <button
                  onClick={() => onControl(portName, 'off', durationValue)}
                  disabled={isBusy}
                  style={{
                    ...baseButtonStyle,
                    backgroundColor: '#dc3545',
                    opacity: isBusy ? 0.7 : isOn ? 0.6 : 1,
                    cursor: isBusy ? 'wait' : 'pointer'
                  }}
                >
                  {getButtonLabel(portName, 'off')}
                </button>

                <label style={durationFieldLabelStyle}>
                  <span style={durationFieldCaptionStyle}>Puls ms</span>
                  <input
                    aria-label={`Pulsdauer fuer ${portName}`}
                    type="text"
                    value={durationValue}
                    onChange={(event) => handleDurationChange(portName, event.target.value)}
                    placeholder="leer = normal"
                    disabled={isBusy}
                    style={{
                      ...durationInputStyle,
                      cursor: isBusy ? 'wait' : 'text',
                      opacity: isBusy ? 0.7 : 1
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
        {safePorts.length === 0 && <p>Suche nach Hardware...</p>}
      </div>
    </>
  );
};

const baseButtonStyle = {
  color: 'white',
  border: 'none',
  padding: '8px 15px',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  fontWeight: 'bold'
};

const portGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '12px',
  marginTop: '20px',
  width: '100%'
};

const portItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  padding: '12px',
  background: '#f9f9f9',
  borderRadius: '5px',
  borderLeft: '5px solid #28a745',
  gap: '10px'
};

const controlGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap'
};

const durationFieldLabelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: '140px'
};

const durationFieldCaptionStyle = {
  fontSize: '0.75rem',
  fontWeight: 'bold',
  color: '#555'
};

const durationInputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '4px',
  border: '1px solid #c7c7c7',
  fontSize: '0.9rem',
  boxSizing: 'border-box'
};

const ingredientSelectStyle = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: '4px',
  border: '1px solid #a0c4a0',
  fontSize: '0.85rem',
  backgroundColor: '#f0faf0',
  color: '#1a5c1a',
  marginTop: '2px',
  boxSizing: 'border-box'
};

export default HardwareControl;
