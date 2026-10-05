import React from 'react';

const RecipeList = ({ recipes, onSelect, isLocked, onRecord, onDelete }) => {
  // Falls keine Rezepte geladen wurden (z.B. Fehler beim API-Call)
  if (!recipes || recipes.length === 0) {
    return (
      <div style={emptyStateStyle}>
        <p>Keine Rezepte gefunden. Bitte Server-Verbindung prüfen.</p>
      </div>
    );
  }

  return (
    <div style={{
      ...listContainerStyle,
      opacity: isLocked ? 0.4 : 1,
      pointerEvents: isLocked ? 'none' : 'auto',
      transition: 'all 0.3s ease-in-out'
    }}>
      {/* Wenn das System für andere gesperrt ist, zeigen wir einen kleinen Hinweis */}
      {isLocked && (
        <div style={lockedNoticeStyle}>
          <span>⏳ System ist gerade beschäftigt...</span>
        </div>
      )}

      <div style={gridStyle}>
        {recipes.map((recipe) =>
          onRecord ? (
            <div
              key={recipe.uuid}
              style={{ ...recipeCardDivStyle, position: 'relative' }}
            >
              {/* Icon-Buttons oben rechts */}
              <div style={cardIconRowStyle}>
                <button
                  onClick={() => onRecord(recipe)}
                  disabled={isLocked}
                  style={{ ...cardIconButtonStyle, opacity: isLocked ? 0.4 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                  title="Aufzeichnen"
                >
                  ✎
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(recipe)}
                    disabled={isLocked}
                    style={{ ...cardIconButtonStyle, color: '#e74c3c', opacity: isLocked ? 0.4 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                    title="Löschen"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={iconContainerStyle}>🍹</div>
              <div style={recipeInfoStyle}>
                <strong style={recipeNameStyle}>{recipe.name}</strong>
              </div>
            </div>
          ) : (
            <button
              key={recipe.uuid}
              onClick={() => onSelect(recipe)}
              style={recipeButtonStyle}
              onMouseEnter={(e) => {
                if (!isLocked) {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
            >
              <div style={iconContainerStyle}>🍹</div>
              <div style={recipeInfoStyle}>
                <strong style={recipeNameStyle}>{recipe.name}</strong>
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );
};

// --- Styles für die RecipeList ---

const listContainerStyle = {
  width: '100%',
  margin: '20px auto',
  position: 'relative',
  padding: '10px',
  boxSizing: 'border-box'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, 200px)',
  gap: '20px',
  justifyContent: 'center',
  width: '100%'
};

const recipeButtonStyle = {
  width: '100%',
  minHeight: '120px',
  padding: '20px',
  borderRadius: '16px',
  border: '1px solid #d1d8e0',
  background: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.2s ease',
  outline: 'none'
};

const iconContainerStyle = {
  fontSize: '2rem',
  marginBottom: '10px'
};

const recipeInfoStyle = {
  textAlign: 'center'
};

const recipeNameStyle = {
  display: 'block',
  fontSize: '1.2rem',
  color: '#2c3e50',
  marginBottom: '5px'
};

const recipeMetaStyle = {
  fontSize: '0.8rem',
  color: '#7f8c8d',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const lockedNoticeStyle = {
  marginBottom: '15px',
  color: '#3498db',
  fontWeight: 'bold',
  fontSize: '0.9rem',
  backgroundColor: '#ebf5fb',
  padding: '8px 15px',
  borderRadius: '20px',
  display: 'inline-block'
};

const emptyStateStyle = {
  padding: '40px',
  color: '#e74c3c',
  background: '#fdf2f2',
  borderRadius: '12px',
  border: '1px solid #f5c6cb'
};

const recipeCardDivStyle = {
  width: '100%',
  minHeight: '120px',
  padding: '20px 20px 14px',
  borderRadius: '16px',
  border: '1px solid #d1d8e0',
  background: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  gap: '10px',
  boxSizing: 'border-box',
};

const cardIconRowStyle = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  display: 'flex',
  gap: '2px',
};

const cardIconButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1rem',
  color: '#7f8c8d',
  padding: '3px 5px',
  borderRadius: '6px',
  lineHeight: '1',
  transition: 'color 0.15s, background-color 0.15s',
};

const recordButtonStyle = {
  width: '100%',
  padding: '7px 12px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#e67e22',
  color: '#ffffff',
  fontWeight: 'bold',
  fontSize: '0.85rem',
  transition: 'background-color 0.2s'
};

export default RecipeList;