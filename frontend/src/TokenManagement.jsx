import React from 'react';

const TokenManagement = ({ tokens, newToken, onGenerate, onRefresh }) => {
  const safeTokens = Array.isArray(tokens) ? tokens : [];

  return (
    <>
      <hr style={{ margin: '30px 0', backgroundColor: '#ddd', border: 'none', height: '1px' }} />

      {newToken && (
        <div style={tokenDisplayStyle}>
          <p>Geben Sie diesen Code dem Gast:</p>
          <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', margin: '10px 0' }}>{newToken}</h1>
        </div>
      )}

      <div style={tokenManagementStyle}>
        <h3 style={{marginTop: '0', marginBottom: '15px'}}>🎟️ Token-Verwaltung</h3>
        <div style={tokenActionButtonsStyle}>
          <button
            onClick={onGenerate}
            style={{...tokenActionButtonStyle, backgroundColor: '#007bff'}}
          >
            ➕ Neues Token generieren
          </button>
          <button
            onClick={onRefresh}
            style={{...tokenActionButtonStyle, backgroundColor: '#6c757d'}}
          >
            🔄 Liste aktualisieren
          </button>
        </div>
      </div>

      <h3 style={{marginBottom: '15px'}}>Aktive Tokens im Umlauf:</h3>
      <div style={tokenGridStyle}>
        {safeTokens.map(token => (
          <div
            key={token}
            style={tokenItemStyle}
          >
            {token}
          </div>
        ))}
        {safeTokens.length === 0 && <p>Keine Tokens aktiv.</p>}
      </div>
    </>
  );
};

const tokenDisplayStyle = {
  marginTop: '20px',
  padding: '15px',
  border: '2px dashed #28a745',
  textAlign: 'center',
  borderRadius: '8px'
};

const tokenManagementStyle = {
  background: '#f8f9fa',
  padding: '15px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid #dee2e6'
};

const tokenActionButtonsStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px'
};

const tokenActionButtonStyle = {
  padding: '10px 15px',
  fontSize: '0.9rem',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.2s ease'
};

const tokenGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '10px',
  margin: '15px 0',
  width: '100%'
};

const tokenItemStyle = {
  padding: '10px 15px',
  backgroundColor: '#000000',
  borderRadius: '6px',
  borderLeft: '5px solid #007bff',
  fontSize: '1rem',
  color: '#FFFFFF',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  wordBreak: 'break-all'
};

export default TokenManagement;
