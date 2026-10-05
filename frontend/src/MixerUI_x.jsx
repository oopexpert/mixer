import { useState, useEffect } from 'react';
import axios from 'axios';

const MixerUI_ = () => {
  const [status, setStatus] = useState({ state: 'Initial', message: 'System bereit.' });
  const [isLoading, setIsLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recipeToken, setRecipeToken] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const isBusy = (stateName) => {    
    if (!stateName) return false;
    return (
      stateName === 'MixerDispensing' ||
      stateName === 'Startup' || 
      stateName === 'Priming'
    );
  };
    
  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
  };

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const initializeApp = async () => {
      try {
        const [statusRes, recipesRes] = await Promise.all([
          axios.get('/user/status', { signal: controller.signal }),
          axios.get('/user/recipes', { signal: controller.signal })
        ]);

        if (!isMounted) return;

        setStatus(statusRes.data);
        setRecipes(recipesRes.data);

        if (isBusy(statusRes.data.state)) {
          setIsLoading(true);
          const longPollRes = await axios.get('/user/wait-for-idle', { 
            signal: controller.signal 
          });
          
          if (isMounted) {
            setStatus(longPollRes.data);
            setIsLoading(false);
          }        
        }
      } catch (e) {
        if (!axios.isCancel(e)) {
          console.error("Initialisierungsfehler:", e);
          if (isMounted) setIsLoading(false);
        }
      }
    };

    initializeApp();
    return () => { 
      isMounted = false; 
      controller.abort(); 
    };
  }, []);

  const sendCommand = async (url, queryParams) => {
    const queryString = queryParams !== undefined && queryParams.length > 0 
      ? `?${queryParams.join('&')}` 
      : '';

    const fullUrl = `${url}${queryString}`;
    setIsLoading(true);

    try {
      const response = await axios.post(fullUrl);
      const newState = response.data;
      setStatus(newState);

      // Wir warten auf Idle, wenn das System arbeitet
      if (isBusy(newState.state)) {
        const waitRes = await axios.get('/user/wait-for-idle');
        setStatus(waitRes.data);
        
        // Erst wenn der Mixer fertig ist, Auswahl löschen
        if (url.includes('/user/dispense')) {
          setSelectedRecipe(null);
          setRecipeToken("");
        }
      }
    } catch (error) {
      console.error("Command Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pulse-animation { animation: pulse 2s infinite; font-size: 2rem; }
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      <h1 style={mainHeadingStyle}>🍸 Smart Mixer Dashboard</h1>
      
      {/* Status Anzeige */}
      <div style={statusBoxStyle}>
        {isLoading && (
          <div style={spinnerContainerStyle}>
            <div className="loader"></div>
          </div>
        )}
        <h2 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#7f8c8d' }}>SYSTEM-STATUS</h2>
        <div style={{ fontSize: '1.8rem', margin: '10px 0' }}>
          Zustand: <span style={stateValueStyle}>{status.state}</span>
        </div>
        <p style={{ fontSize: '1.1rem', color: '#34495e', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <i>{status.message}</i>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '30px' }}>
        
        {/* Admin Sektionen */}
        {status.state === 'Initial' && (
          <button style={adminButtonStyle} onClick={() => sendCommand('/admin/start')}>🚀 System initialisieren</button>
        )}

        {status.state === 'RequestPrimingContainer' && (
          <>
            <button style={adminButtonStyle} onClick={() => sendCommand('/admin/confirm-container')}>✅ Behälter steht bereit</button>
            <button style={{...adminButtonStyle, backgroundColor: '#6c757d'}} onClick={() => sendCommand('/admin/skip-prime')}>⏩ Überspringen</button>
          </>
        )}

        {status.state === 'PrimingContainerConfirmed' && (
          <button style={{...adminButtonStyle, backgroundColor: 'orange'}} onClick={() => sendCommand('/admin/prime')}>💧 Priming starten</button>
        )}

        {/* USER INTERFACE: MIXER DISPENSE LOGIK */}
        {(status.state === 'MixerDispense' || status.state === 'MixerDispensing') && (
          <div style={{ width: '100%', maxWidth: '700px' }}>
            
            {!selectedRecipe ? (
              <div style={{ 
                display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center',
                opacity: status.state === 'MixerDispensing' ? 0.5 : 1,
                pointerEvents: status.state === 'MixerDispensing' ? 'none' : 'auto'
              }}>
                {recipes.map(recipe => (
                  <button 
                    key={recipe.uuid} 
                    onClick={() => handleSelectRecipe(recipe)} 
                    style={recipeButtonStyle}
                  >
                    <strong>{recipe.name}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{
                ...confirmContainerStyle,
                border: status.state === 'MixerDispensing' ? '3px solid #007bff' : '1px solid #dee2e6'
              }}>
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '10px' }}>
                  <h3 style={{ margin: 0 }}>{selectedRecipe.name}</h3>
                  {status.state === 'MixerDispensing' ? (
                    <div style={{color: '#007bff', marginTop: '10px', fontWeight: 'bold'}}>⚡ Wird gemischt...</div>
                  ) : (
                    <div style={{color: '#666', fontSize: '0.9rem'}}>Bitte Glas unterstellen & Token eingeben</div>
                  )}
                </div>

                {status.state !== 'MixerDispensing' && (
                  <div style={{ marginBottom: '20px' }}>
                    <input 
                      type="text" 
                      placeholder="Dein Token"
                      value={recipeToken}
                      onChange={(e) => setRecipeToken(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  {status.state === 'MixerDispensing' ? (
                    <div className="pulse-animation">⚙️</div>
                  ) : (
                    <>
                      <button 
                        disabled={!recipeToken}
                        onClick={() => sendCommand(`/user/dispense/${selectedRecipe.uuid}`, [`recipeToken=${recipeToken}`])}
                        style={{ ...controlButtonStyle, backgroundColor: recipeToken ? '#28a745' : '#95a5a6' }}
                      >
                        🚀 Jetzt mischen!
                      </button>
                      <button 
                        style={{ ...controlButtonStyle, backgroundColor: '#dc3545' }}
                        onClick={() => { setSelectedRecipe(null); setRecipeToken(""); }}
                      >
                        🔙 Zurück
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={{marginTop: '80px', borderTop: '1px solid #ddd', paddingTop: '20px'}}>
        <button onClick={() => sendCommand('/admin/shutdown')} style={{fontSize: '11px', color: '#999', background: 'none', border: '1px solid #ddd', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer'}}>
          System ausschalten
        </button>
      </footer>
    </div>
  );
}

// Styles
const inputStyle = {
  padding: '15px',
  fontSize: '1.4rem',
  borderRadius: '10px',
  border: '2px solid #007bff',
  width: '100%',
  maxWidth: '300px',
  textAlign: 'center',
  outline: 'none',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
};

const adminButtonStyle = {
  padding: '15px 25px',
  background: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

const spinnerContainerStyle = {
  position: 'absolute',
  top: '10px',
  right: '10px'
};

const controlButtonStyle = {
  padding: '15px 30px',
  fontSize: '1.1rem',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.2s'
};

const recipeButtonStyle = {
  padding: '25px',
  borderRadius: '15px',
  border: '2px solid #007bff',
  cursor: 'pointer',
  background: 'white',
  color: '#333',
  fontSize: '1.2rem',
  width: '200px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
  transition: 'transform 0.2s'
};

const confirmContainerStyle = {
  marginTop: '20px',
  padding: '30px',
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  textAlign: 'center'
};

const mainHeadingStyle = {
  color: '#1a252f', // Fast Schwarz für die Hauptüberschrift
  marginBottom: '30px',
  fontSize: '2.5rem',
  textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
};

const statusBoxStyle = {
  background: '#ffffff', // Weißer Hintergrund für maximalen Kontrast
  padding: '25px',
  borderRadius: '15px',
  margin: '20px auto',
  maxWidth: '450px',
  borderLeft: '8px solid #007bff', // Kräftiger blauer Akzent
  boxShadow: '0 4px 15px rgba(0,0,0,0.15)', // Sanfter Schatten für Tiefe
  color: '#2c3e50' // Dunkles Blau-Grau für die Schrift
};

const stateValueStyle = {
  color: '#e67e22', // Ein kräftiges Orange für den Status (gut lesbar auf Weiß)
  fontWeight: 'bold',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

export default MixerUI_;