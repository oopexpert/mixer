import { useState, useEffect } from 'react';
import axios from 'axios';
import StatusPanel from './StatusPanel';
import RecipeList from './RecipeList';
import DispenseControl from './DispenseControl';
import ManualIngredientDialog from './ManualIngredientDialog';
import DispenseErrorDialog from './DispenseErrorDialog';

const MixerUI = ({ isAdmin, adminToken, onAdminToggle }) => {
  const [status, setStatus] = useState({ state: 'Initial', message: 'System bereit.' });
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recipeToken, setRecipeToken] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [requireRecipeToken, setRequireRecipeToken] = useState(null);
  const [manualIngredient, setManualIngredient] = useState(null);
  const [manualError, setManualError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [manualConfirmationPending, setManualConfirmationPending] = useState(false);
  const [pendingDispenseSync, setPendingDispenseSync] = useState(false);
  const [dispenseError, setDispenseError] = useState('');

  // Panel soll auch bei ManualIngredient nach F5 immer sichtbar bleiben
  const showDispensePanel =
    status.state === 'MixerDispense' ||
    status.state === 'MixerDispensing' ||
    status.state === 'ManualIngredient';

  const dispenseUiState =
    status.state === 'ManualIngredient' || pendingDispenseSync
      ? 'MixerDispensing'
      : status.state;

  const displayRecipe = selectedRecipe ?? activeRecipe;

  const showDispenseFallback =
    !displayRecipe &&
    (status.state === 'MixerDispensing' || status.state === 'ManualIngredient' || pendingDispenseSync);

  const isBusy = (state) => ['MixerDispensing', 'Startup', 'Priming'].includes(state);

  const isWaitForIdleTimeout = (error) => {
    const responseStatus = error?.response?.status;
    return error?.code === 'ECONNABORTED' || responseStatus === 408 || responseStatus === 504;
  };

  const clearDispenseSelection = () => {
    setSelectedRecipe(null);
    setActiveRecipe(null);
    setRecipeToken("");
    setPendingDispenseSync(false);
    setDispenseError('');
  };

  const showInvalidTokenError = () => {
    setPendingDispenseSync(false);
    setDispenseError('Dieses Rezept-Token gibt es nicht. Bitte gib ein anderes ein.');
  };

  const fetchStatusAndApply = async (signal) => {
    const res = await axios.get('/user/status', signal ? { signal } : undefined);
    return { statusData: res.data, outcome: applyStatus(res.data) };
  };

  const applyStatus = (nextStatus) => {
    setStatus(nextStatus);

    const nextActiveRecipe = nextStatus?.activeRecipe ?? null;
    setActiveRecipe(nextActiveRecipe);

    if (nextActiveRecipe?.uuid) {
      setSelectedRecipe((currentRecipe) => {
        if (currentRecipe?.uuid === nextActiveRecipe.uuid) {
          return currentRecipe;
        }

        return nextActiveRecipe;
      });
    } else if (nextStatus?.state !== 'MixerDispense') {
      setSelectedRecipe((currentRecipe) => currentRecipe ?? null);
    }

    if (nextStatus?.state === 'ManualIngredient') {
      setManualIngredient(nextStatus.manualIngredient ?? null);
      setManualError('');
      setSyncError('');
      setManualConfirmationPending(false);
      return { requiresManual: true, busy: false };
    }

    setManualIngredient(null);
    setManualError('');
    setSyncError('');
    setManualConfirmationPending(false);

    return { requiresManual: false, busy: isBusy(nextStatus?.state) };
  };

  const waitForIdleAndSync = async (options = {}) => {
    const { signal, clearDispenseOnStable = false, suppressTimeoutError = false } = options;

    try {
      const waitRes = await axios.get('/user/wait-for-idle', signal ? { signal } : undefined);
      const outcome = applyStatus(waitRes.data);

      // Immer zurücksetzen, wenn der Vorgang abgeschlossen ist und kein manueller Schritt mehr offen ist
      if (!outcome.requiresManual && (waitRes.data.state === 'MixerDispense')) {
        clearDispenseSelection();
      } else if (!outcome.requiresManual && clearDispenseOnStable) {
        clearDispenseSelection();
      }

      return outcome;
    } catch (e) {
      const shouldSuppressSyncError = suppressTimeoutError && isWaitForIdleTimeout(e);

      if (!axios.isCancel(e) && !shouldSuppressSyncError) {
        setSyncError('Verbindung oder Timeout. Bitte erneut versuchen.');
      }

      throw e;
    }
  };

  const waitForStableState = async (options = {}) => {
    const { signal, clearDispenseOnStable = false } = options;

    while (true) {
      try {
        return await waitForIdleAndSync({
          signal,
          clearDispenseOnStable,
          suppressTimeoutError: true
        });
      } catch (e) {
        if (axios.isCancel(e)) {
          throw e;
        }

        if (!isWaitForIdleTimeout(e)) {
          throw e;
        }

        const { statusData, outcome } = await fetchStatusAndApply(signal);

        if (!outcome.busy || outcome.requiresManual) {
          if (!outcome.requiresManual && statusData?.state === 'MixerDispense') {
            clearDispenseSelection();
          }

          return outcome;
        }
      }
    }
  };

  const sendCommand = async (url, queryParams) => {
    const query = queryParams?.length > 0 ? `?${queryParams.join('&')}` : '';
    const isDispenseCommand = url.includes('/user/dispense');

    setManualError('');
    setSyncError('');
    setDispenseError('');
    setIsLoading(true);

    try {
      const res = await axios.post(`${url}${query}`);

      const outcome = applyStatus(res.data);

      if (outcome.requiresManual) {
        if (isDispenseCommand) {
          setPendingDispenseSync(true);
        }
        return;
      }

      if (outcome.busy) {
        if (isDispenseCommand) {
          setPendingDispenseSync(true);
        }
        await waitForStableState({ clearDispenseOnStable: isDispenseCommand });
      } else if (isDispenseCommand) {
        showInvalidTokenError();
      }

    } catch (e) {
      if (isDispenseCommand && e?.response?.status === 400) {
        showInvalidTokenError();
        return;
      }

      console.error("API Error", e);
    }
    finally { setIsLoading(false); }
  };

  const handleManualIngredientConfirm = async () => {
    const ingredientUuid = manualIngredient?.uuid;
    const confirmedManualIngredient = manualIngredient;

    if (!ingredientUuid) {
      setManualError('Bestätigung nicht möglich, bitte erneut versuchen.');
      return;
    }

    setManualError('');
    setSyncError('');
    setManualConfirmationPending(true);
    setIsLoading(true);

    try {
      await axios.post(`/user/confirm-manual-ingredient/${ingredientUuid}`);
      setManualIngredient(null);
      setStatus((currentStatus) => ({
        ...currentStatus,
        state: 'MixerDispensing',
        message: 'Die automatische Abfuellung wird fortgesetzt.'
      }));
      await waitForStableState({ clearDispenseOnStable: pendingDispenseSync });
    } catch (e) {
      if (e?.response?.status === 400) {
        setManualConfirmationPending(false);
        setManualError('Bestätigung nicht möglich, bitte erneut versuchen.');
        return;
      }

      if (confirmedManualIngredient) {
        setManualIngredient(confirmedManualIngredient);
      }

      console.error('Manual ingredient confirm failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrySync = async () => {
    setManualError('');
    setSyncError('');
    setIsLoading(true);

    try {
      // Hole aktuellen Status explizit vom Server
      const res = await axios.get('/user/status');
      applyStatus(res.data);
      // Optional: Wenn der Status busy ist, erneut waitForIdleAndSync starten
      if (isBusy(res.data.state)) {
        await waitForStableState({ clearDispenseOnStable: pendingDispenseSync });
      }
    } catch (e) {
      setSyncError('Verbindung oder Timeout. Bitte erneut versuchen.');
      console.error('Retry getStatus failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const init = async () => {
      try {
        const [statusResult, r, requireTokenRes] = await Promise.all([
          fetchStatusAndApply(controller.signal),
          axios.get('/user/recipes', { signal: controller.signal }),
          axios.get('/user/require-recipe-token', { signal: controller.signal })
        ]);
        const { outcome } = statusResult;
        setRecipes(r.data);
        setRequireRecipeToken(requireTokenRes.data.requireRecipeToken);
        setInitialized(true);

        if (outcome.busy) {
          setIsLoading(true);
          await waitForStableState({ signal: controller.signal });
          setIsLoading(false);
        }
      } catch (e) {
        if (!axios.isCancel(e)) {
          setStatus({
            state: 'Error',
            message: 'Keine Verbindung zum Server. Bitte prüfen und Seite neu laden.'
          });
          setSyncError('Verbindung oder Timeout. Bitte Server starten und Seite neu laden.');
          setInitialized(true);
          console.error('Initialisierung fehlgeschlagen:', e);
        }
      }
    };
    init();
    return () => controller.abort();
  }, []);

  return (
    <div style={pageStyle}>
      <style>{animations}</style>
      <h1 style={{ color: '#2c3e50', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '30px', marginTop: '0' }}>🍸 Smart Mixer</h1>
      
      {initialized && (
        <StatusPanel 
          status={status} 
          isLoading={isLoading}
          isAdmin={isAdmin}
          onAdminToggle={onAdminToggle}
        />
      )}

      <ManualIngredientDialog
        ingredient={manualIngredient}
        error={manualError}
        syncError={syncError}
        confirmPending={manualConfirmationPending}
        isLoading={isLoading}
        onConfirm={handleManualIngredientConfirm}
        onRetry={handleRetrySync}
      />

      <DispenseErrorDialog
        error={dispenseError}
        onDismiss={() => setDispenseError('')}
      />

      {syncError && !manualIngredient && (
        <div style={syncErrorBannerStyle}>
          <span>{syncError}</span>
          <button onClick={handleRetrySync} style={syncRetryButtonStyle}>
            Erneut versuchen
          </button>
        </div>
      )}


      {initialized && !isAdmin && !isLoading && ['Initial', 'RequestPrimingContainer', 'PrimingContainerConfirmed', 'Error'].includes(status.state) && (
        <div style={adminOnlyNoticeStyle}>
          <strong>Nur für Administratoren verfügbar.</strong>
          <span style={adminOnlyNoticeTextStyle}>
            Ein- und Ausschalten des Mixers sowie Kalibrierung sind nur nach Admin-Anmeldung nutzbar.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', marginTop: '20px', width: '100%', flexShrink: 0 }}>

        {showDispensePanel && (
          <div style={{ width: '100%', maxWidth: '600px', boxSizing: 'border-box' }}>
            {showDispenseFallback ? (
              <div style={dispenseFallbackStyle}>
                <div style={dispenseFallbackBadgeStyle}>AKTIVER MISCHVORGANG</div>
                <h2 style={dispenseFallbackTitleStyle}>Wird gerade gemischt...</h2>
                {activeRecipe?.name && (
                  <div style={dispenseFallbackRecipeStyle}>{activeRecipe.name}</div>
                )}
                <p style={dispenseFallbackTextStyle}>
                  Der Mischvorgang laeuft bereits. Bitte fuehre den manuellen Schritt aus oder warte auf die Fortsetzung durch den Server.
                </p>
              </div>
            ) : !selectedRecipe ? (
              <RecipeList 
                    recipes={recipes} 
                    onSelect={async (recipe) => {
                      setDispenseError('');
                      try {
                        const res = await axios.get('/user/require-recipe-token');
                        setRequireRecipeToken(res.data.requireRecipeToken);
                      } catch (e) {
                        console.error('Fehler beim Laden der Recipe-Token-Einstellung', e);
                      }
                      setSelectedRecipe(recipe);
                    }} 
                    isLocked={status.state === 'MixerDispensing'} 
                />
            ) : (
                <DispenseControl 
                state={dispenseUiState}
                    selectedRecipe={displayRecipe}
                    token={recipeToken}
                    setToken={setRecipeToken}
                    requireRecipeToken={requireRecipeToken ?? true}
                    onConfirm={() => {
                      const params = requireRecipeToken ? [`recipeToken=${recipeToken}`] : [];
                      sendCommand(`/user/dispense/${displayRecipe.uuid}`, params);
                    }}
                    onCancel={() => {
                      setSelectedRecipe(null);
                      setActiveRecipe(null);
                      setRecipeToken("");
                      setDispenseError('');
                    }}
                />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- STYLES ---

const animations = `
  @keyframes spin { 100% { transform: rotate(360deg); } }
  @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
  .loader { border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; }
  .pulse-animation { animation: pulse 1.5s infinite; font-size: 2.5rem; }
`;

const pageStyle = { 
  padding: 'clamp(20px, 5vw, 40px)', 
  textAlign: 'center', 
  fontFamily: '"Segoe UI", Roboto, Arial', 
  backgroundColor: '#f0f3f5', 
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  boxSizing: 'border-box'
};

const adminOnlyNoticeStyle = {
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto 20px',
  padding: '14px 18px',
  borderRadius: '14px',
  backgroundColor: '#fff7e6',
  border: '1px solid #f3d19c',
  color: '#8a5b12',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  textAlign: 'left'
};

const adminOnlyNoticeTextStyle = {
  fontSize: '0.95rem',
  color: '#6f4e1e'
};

const dispenseFallbackStyle = {
  backgroundColor: '#ffffff',
  border: '3px solid #007bff',
  boxShadow: '0 15px 40px rgba(0,123,255,0.2)',
  borderRadius: '24px',
  padding: '32px 24px',
  textAlign: 'center',
  width: '100%',
  boxSizing: 'border-box',
  margin: '20px auto'
};

const dispenseFallbackBadgeStyle = {
  fontSize: '0.75rem',
  letterSpacing: '2px',
  fontWeight: 'bold',
  color: '#007bff',
  marginBottom: '12px'
};

const dispenseFallbackTitleStyle = {
  margin: '0 0 14px',
  fontSize: '2rem',
  color: '#2c3e50'
};

const dispenseFallbackRecipeStyle = {
  margin: '0 0 14px',
  fontSize: '1.15rem',
  fontWeight: 'bold',
  color: '#17324d'
};

const dispenseFallbackTextStyle = {
  margin: 0,
  color: '#5c6773',
  fontSize: '1rem',
  lineHeight: 1.6
};

const syncErrorBannerStyle = {
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto 20px',
  padding: '14px 16px',
  borderRadius: '14px',
  backgroundColor: '#fdecec',
  border: '1px solid #f3b8b8',
  color: '#8f2d2d',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  boxSizing: 'border-box',
  textAlign: 'left'
};

const syncRetryButtonStyle = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#8f2d2d',
  color: '#ffffff',
  fontWeight: 'bold',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const syncInfoBannerStyle = {
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto 20px',
  padding: '14px 16px',
  borderRadius: '14px',
  backgroundColor: '#ebf5fb',
  border: '1px solid #b8d9f2',
  color: '#26638f',
  boxSizing: 'border-box',
  textAlign: 'left'
};

export default MixerUI;