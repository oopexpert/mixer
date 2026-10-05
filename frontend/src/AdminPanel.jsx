import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AdminStatusDisplay from './AdminStatusDisplay';
import AdminActions from './AdminActions';
import HardwareControl from './HardwareControl';
import TokenManagement from './TokenManagement';
import RecordingMode from './RecordingMode';
import RecipeEditWizard from './RecipeEditWizard';
import RecipeList from './RecipeList';

const AdminPanel = ({ adminToken, onLogout }) => {
  const [status, setStatus] = useState({ state: 'Initial', message: 'System bereit.' });
  const [activeTokens, setActiveTokens] = useState([]);
  const [newToken, setNewToken] = useState(null);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [activePorts, setActivePorts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(Boolean(adminToken));
  const [authNotice, setAuthNotice] = useState('');
  const [reloadFeedback, setReloadFeedback] = useState(null);
  const [showReloadToast, setShowReloadToast] = useState(false);
  const reloadToastTimeout = useRef(null);
  const [controlFeedback, setControlFeedback] = useState(null);
  const [currentControlRequest, setCurrentControlRequest] = useState(null);
  const [requireRecipeToken, setRequireRecipeToken] = useState(null);
  const [recipeTokenFeedback, setRecipeTokenFeedback] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [recordingSession, setRecordingSession] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [pendingRecordedMs, setPendingRecordedMs] = useState({});
  const [pendingSessionStepsMs, setPendingSessionStepsMs] = useState({});
  const [pendingInitialStep, setPendingInitialStep] = useState(1);
  const [recipes, setRecipes] = useState([]);

  const hasAdminToken = Boolean(adminToken);

  const buildAdminUrl = (path) => `${path}?adminToken=${encodeURIComponent(adminToken)}`;
  const isAuthorizationError = (error) => {
    const responseStatus = error?.response?.status;
    return responseStatus === 401 || responseStatus === 403;
  };
  const isTokenManagementState = (state) => state === 'MixerDispense';

  const denyAdminAccess = (message = 'Nur fuer Administratoren verfuegbar.') => {
    setIsAuthorized(false);
    setAuthNotice(message);
    return false;
  };

  const ensureAdminAccess = () => {
    if (!hasAdminToken || !isAuthorized) {
      return denyAdminAccess('Nur fuer Administratoren verfuegbar. Bitte erneut als Admin anmelden.');
    }

    if (authNotice) {
      setAuthNotice('');
    }

    return true;
  };

  const isIdleReloadState = (state) => state === 'MixerDispense';
  const isControlRetryableConflict = (error) => error?.response?.status === 409;
  const shouldManageTokens = isAuthorized && isTokenManagementState(status.state) && !recordingSession;

  const refreshAdminDataForState = (nextState) => {
    fetchPorts();

    if (nextState === 'MixerDispense') {
      fetchRecipes();
    }

    if (isTokenManagementState(nextState)) {
      fetchTokens();
      return;
    }

    setActiveTokens([]);
    setNewToken(null);
  };

  const normalizePulseDuration = (rawDuration) => {
    if (typeof rawDuration !== 'string') {
      return null;
    }

    const trimmedDuration = rawDuration.trim();

    if (!trimmedDuration) {
      return null;
    }

    const parsedDuration = Number.parseInt(trimmedDuration, 10);

    if (!Number.isFinite(parsedDuration)) {
      return 500;
    }

    return Math.min(20000, Math.max(500, parsedDuration));
  };

  const getReloadInfoText = (state) => {
    if (state === 'Initial') {
      return 'System ist aus: Reload aktualisiert nur die Konfiguration. COM-Ports werden erst beim Start geoeffnet.';
    }

    if (state === 'RequestPrimingContainer') {
      return 'Kalibrierung aktiv: Reload aktualisiert die Konfiguration auch waehrend der Behaelter-Vorbereitung und laedt anschliessend die COM-Ports neu.';
    }

    if (isIdleReloadState(state)) {
      return 'System ist bereit: Reload aktualisiert die Konfiguration und anschliessend auch die COM-Ports. Nicht mehr gemappte Ports werden geschlossen, neue Ports geoeffnet.';
    }

    return 'System ist aktuell beschaeftigt: Reload wird serverseitig mit HTTP 400 abgelehnt. Die Rueckmeldung aus dem Backend wird hier angezeigt.';
  };

  const fetchIngredients = async () => {
    try {
      const res = await axios.get(buildAdminUrl('/admin/ingredients'));
      const normalized = res.data.map((ing) => ({
        uuid: ing.ingredientUuid ?? ing.ingredientUUID ?? ing.uuid,
        name: ing.name
      }));
      setIngredients(normalized);
    } catch (e) {
      console.error('Fehler beim Laden der Zutaten', e);
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await axios.get('/user/recipes');
      setRecipes(res.data);
    } catch (e) {
      console.error('Fehler beim Laden der Rezepte', e);
    }
  };

  const checkForActiveRecording = async () => {
    if (!hasAdminToken) return;
    try {
      const res = await axios.get(buildAdminUrl('/admin/recording/session'));
      // Session-relative Werte aus der /recorded-ms API bevorzugen (fire-and-forget PUT in
      // handleStop schreibt session-relative Werte dorthin). Nur als Fallback step.totalDurationMs
      // verwenden (absolut kumulativ), damit beim Zurück-Navigieren alle Zutaten sichtbar sind.
      // WICHTIG: setRecordingSession NACH dem Berechnen von sessionMs aufrufen, damit beide
      // State-Updates im selben React-Render-Zyklus landen. Sonst würde RecordingMode mit
      // initialRecordedMs={} gemountet, bevor setPendingRecordedMs() aufgerufen werden kann.
      const recipeUuid = res.data.sourceRecipeUuid;
      let sessionMs = {};
      if (recipeUuid) {
        try {
          const msRes = await axios.get(buildAdminUrl(`/admin/recipes/${recipeUuid}/recorded-ms`));
          const apiMs = msRes.data?.recordedMs ?? {};
          for (const [name, ms] of Object.entries(apiMs)) {
            if (ms > 0) sessionMs[name] = ms;
          }
        } catch {
          // /recorded-ms nicht verfügbar → absoluten totalDurationMs als Fallback
          for (const step of (res.data.steps ?? [])) {
            if (step.ingredientName && step.totalDurationMs > 0) {
              sessionMs[step.ingredientName] = step.totalDurationMs;
            }
          }
        }
      }
      // sessionStepsMs: Schritte, die in der AKTUELLEN Session aufgezeichnet wurden.
      // Das Backend setzt totalDurationMs zu Session-Start auf originalDurationMs.
      // Daher gilt: totalDurationMs - originalDurationMs = in dieser Session aufgezeichnete Zeit.
      // cycleCount > 0 wäre gleichwertig, aber der Absolutwert wird für die Anzeige benötigt.
      const sessionStepsMs = {};
      for (const s of (res.data.steps ?? [])) {
        if (!s.ingredientName) continue;
        const sessionRelative = (s.totalDurationMs ?? 0) - (s.originalDurationMs ?? 0);
        if (sessionRelative > 0) {
          sessionStepsMs[s.ingredientName] = sessionRelative;
        }
      }
      // Beide Updates atomar: RecordingMode sieht beim Mounten bereits pendingRecordedMs
      setRecordingSession(res.data);
      if (Object.keys(sessionMs).length > 0) {
        setPendingRecordedMs(sessionMs);
      }
      setPendingSessionStepsMs(sessionStepsMs);
    } catch (e) {
      if (e?.response?.status !== 404) {
        console.error('Fehler beim Prüfen der Aufzeichnungssession', e);
      }
    }
  };

  const handleStartRecording = async (recipe) => {
    if (!ensureAdminAccess()) return;
    setIsLoading(true);
    try {
      const res = await axios.post(buildAdminUrl(`/admin/recording/start/${recipe.uuid}`));
      setRecordingSession(res.data);
    } catch (e) {
      const httpStatus = e?.response?.status;
      const msg = e?.response?.data?.message ?? (typeof e?.response?.data === 'string' ? e?.response?.data : null);
      if (httpStatus === 409) {
        alert('System ist beschäftigt. Bitte warten, bis der Mixer bereit ist.');
      } else if (httpStatus === 404) {
        alert('Rezept nicht gefunden.');
      } else if (httpStatus === 400) {
        alert(msg || 'Dieses Rezept hat keine aufzeichenbaren Zutaten (COM-Port-Zutaten).');
      } else {
        alert(msg || 'Fehler beim Starten der Aufzeichnung.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordingAbort = () => {
    const recipe = recipes.find(r => r.name === recordingSession?.sourceRecipeName);
    setRecordingSession(null);
    setPendingRecordedMs({});
    setPendingSessionStepsMs({});
    if (recipe) {
      setPendingInitialStep(2);
      setEditingRecipe(recipe);
    } else {
      fetchStatus().then((s) => { if (s) refreshAdminDataForState(s.state); });
    }
  };

  const handleRecordingSaved = () => {
    setRecordingSession(null);
    fetchStatus().then((s) => { if (s) refreshAdminDataForState(s.state); });
    fetchRecipes();
  };

  const handleStartEdit = (recipe) => {
    setPendingRecordedMs({});
    setPendingSessionStepsMs({});
    setPendingInitialStep(1);
    setEditingRecipe(recipe);
  };

  const handleEditCancel = () => {
    setEditingRecipe(null);
    setPendingRecordedMs({});
    setPendingSessionStepsMs({});
    setPendingInitialStep(1);
    fetchStatus().then((s) => { if (s) refreshAdminDataForState(s.state); });
  };

  const handleEditSaved = () => {
    setEditingRecipe(null);
    setPendingRecordedMs({});
    setPendingSessionStepsMs({});
    setPendingInitialStep(1);
    fetchStatus().then((s) => { if (s) refreshAdminDataForState(s.state); });
    fetchRecipes();
  };

  const handleDeleteRecipe = async (recipe) => {
    if (!window.confirm(`Rezept "${recipe.name}" wirklich löschen?`)) return;
    try {
      await axios.delete(buildAdminUrl(`/admin/recipes/${recipe.uuid}`));
      fetchRecipes();
    } catch (e) {
      alert(`Fehler beim Löschen: ${e?.response?.data?.message ?? e?.response?.data ?? e.message}`);
    }
  };

  const handleMapPortIngredient = async (portName, ingredientUuid) => {
    if (!ensureAdminAccess()) return;

    try {
      const res = await axios.post('/admin/map-port-ingredient', null, {
        params: { adminToken, comPort: portName, ingredientUuid }
      });
      const updatedMappings = res.data?.updatedMappings;
      if (Array.isArray(updatedMappings)) {
        setAvailablePorts((prevPorts) =>
          prevPorts.map((port) => {
            const updated = updatedMappings.find((m) => m.comPort === port.portName);
            if (!updated) return port;
            return { ...port, ingredientName: updated.ingredientName, ingredientUuid: updated.ingredientUuid };
          })
        );
      } else {
        // Backend liefert kein updatedMappings → Ports neu laden
        await fetchPorts();
      }
    } catch (e) {
      const errorMsg = e?.response?.data?.message;
      console.error('Fehler beim Zuordnen der Zutat:', e?.response?.status, e?.response?.data, e);
      alert(errorMsg || 'Fehler beim Zuordnen der Zutat.');
    }
  };

  const fetchRequireRecipeToken = async () => {
    try {
      const res = await axios.get('/user/require-recipe-token');
      setRequireRecipeToken(res.data.requireRecipeToken);
    } catch (e) {
      console.error('Fehler beim Laden der Recipe-Token-Einstellung', e);
    }
  };

  const handleSetRecipeTokenRequired = async (required) => {
    if (!ensureAdminAccess()) return;

    setRecipeTokenFeedback(null);
    try {
      await axios.post('/admin/set-recipe-token-required', null, {
        params: { adminToken, required }
      });
      setRequireRecipeToken(required);
      setRecipeTokenFeedback({
        type: 'success',
        message: required
          ? 'Rezept-Token-Pflicht wurde aktiviert.'
          : 'Rezept-Token-Pflicht wurde deaktiviert.'
      });
    } catch (e) {
      const errorMsg = e?.response?.data?.message;
      setRecipeTokenFeedback({
        type: 'error',
        message: errorMsg || 'Fehler beim Ändern der Einstellung.'
      });
      console.error(e);
    }
  };

  // Funktion zum Laden der Ports
  const fetchPorts = async () => {
    if (!ensureAdminAccess()) {
      setAvailablePorts([]);
      return;
    }

    try {
      const res = await axios.get(buildAdminUrl('/admin/com-ports'));
      const normalized = res.data.map((port) => ({
        ...port,
        ingredientUuid: port.ingredientUuid ?? port.ingredientUUID ?? port.ingredientId ?? ''
      }));
      setAvailablePorts(normalized);
      if (!isAuthorized) {
        setIsAuthorized(true);
      }
    } catch (e) {
      console.error("Fehler beim Laden der COM-Ports", e);

      if (isAuthorizationError(e)) {
        denyAdminAccess('COM-Ports koennen nur mit gueltigem Admin-Token geladen werden.');
      }
    }
  };

  // Funktion zum Laden der aktuellen Tokens vom Server
  const fetchTokens = async () => {
    if (!ensureAdminAccess()) {
      setActiveTokens([]);
      return;
    }

    try {
      const res = await axios.get(buildAdminUrl('/admin/list-active-tokens'));
      setActiveTokens(res.data);
      setNewToken((currentToken) => {
        if (!currentToken) {
          return currentToken;
        }

        return res.data.includes(currentToken) ? currentToken : null;
      });
      if (!isAuthorized) {
        setIsAuthorized(true);
      }
    } catch (e) {
      console.error("Fehler beim Laden der Tokens", e);

        if (isAuthorizationError(e)) {
          denyAdminAccess('Rezept-Tokens koennen nur mit gueltigem Admin-Token geladen werden.');
        }
    }
  };

  // Ein neues Token generieren
  const handleGenerate = async () => {
    if (!ensureAdminAccess()) {
      return;
    }

    try {
      const res = await axios.get(buildAdminUrl('/admin/claim-recipe-token'));
      // Da dein Backend Map.of("recipeToken", ...) schickt:
      setNewToken(res.data.recipeToken);
      if (!isAuthorized) {
        setIsAuthorized(true);
      }
      try {
        const refreshedTokens = await axios.get(buildAdminUrl('/admin/list-active-tokens'));
        setActiveTokens(refreshedTokens.data);
      } catch (e) {
        console.error("Fehler beim Laden der Tokens", e);
      }
    } catch (e) {
      alert("Generierung fehlgeschlagen");
    }
  };

  // Die Schaltfunktion nutzt jetzt die neue Pfad-Struktur
  const handleComControl = async (port, state, rawDuration = '') => {
    if (!ensureAdminAccess()) {
      return;
    }

    const normalizedDuration = normalizePulseDuration(rawDuration);
    const usesPulseEndpoint = state === 'on' && normalizedDuration !== null;

    setControlFeedback(null);
    setCurrentControlRequest({
      port,
      state,
      mode: usesPulseEndpoint ? 'pulse' : 'switch'
    });

    try {
      if (usesPulseEndpoint) {
        await sendPulseCommand(port, normalizedDuration);

        setActivePorts((prev) => ({ ...prev, [port]: 'off' }));
      } else {
        await axios.post(buildAdminUrl(`/admin/com-ports/${encodeURIComponent(port)}/${state}`));

        // Idempotenz im UI: Wir merken uns den letzten erfolgreichen Befehl
        setActivePorts((prev) => ({ ...prev, [port]: state }));
      }

      if (!isAuthorized) {
        setIsAuthorized(true);
      }
    } catch (e) {
      const responseStatus = e?.response?.status;
      const backendMessage = e?.response?.data?.message;

      if (responseStatus === 401) {
        denyAdminAccess('Admin-Token ungueltig oder abgelaufen. Bitte erneut als Admin anmelden.');
        setControlFeedback({
          type: 'error',
          message: backendMessage || 'Direktsteuerung fehlgeschlagen: Admin-Token ungueltig oder abgelaufen.'
        });
        return;
      }

      if (responseStatus === 404) {
        setControlFeedback({
          type: 'error',
          message: backendMessage || `Der Port ${port} wurde nicht gefunden.`
        });
        return;
      }

      if (responseStatus === 400) {
        setControlFeedback({
          type: 'error',
          message: backendMessage || `Der Port ${port} ist vorhanden, aber aktuell nicht geoeffnet.`
        });
        return;
      }

      if (responseStatus === 409) {
        setControlFeedback({
          type: 'error',
          message: backendMessage || 'Mixer ist aktuell beschaeftigt. Bitte erneut versuchen.'
        });
        return;
      }

      setControlFeedback({
        type: 'error',
        message: backendMessage || `Fehler beim Schalten von ${port}.`
      });
    }
    finally {
      setCurrentControlRequest(null);
    }
  };

  // System-Initialisierung
  const handleStartSystem = async () => {
    if (!ensureAdminAccess()) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(buildAdminUrl('/admin/start'));
      setStatus(res.data);
      if (!isAuthorized) {
        setIsAuthorized(true);
      }
      // Ports sofort laden
      setTimeout(() => {
        refreshAdminDataForState(res.data?.state);
      }, 500);
    } catch (e) {
      alert('Fehler bei System-Initialisierung');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Behälter bestätigen (Kalibrierung)
  const handleConfirmContainer = async () => {
    if (!ensureAdminAccess()) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(buildAdminUrl('/admin/confirm-container'));
      setStatus(res.data);
      if (!isAuthorized) {
        setIsAuthorized(true);
      }
      // Ports aktualisieren
      setTimeout(() => {
        refreshAdminDataForState(res.data?.state);
      }, 500);
    } catch (e) {
      alert('Fehler beim Bestätigen des Behälters');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Kalibrierung überspringen
  const handleSkipPrime = async () => {
    if (!ensureAdminAccess()) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(buildAdminUrl('/admin/skip-prime'));
      setStatus(res.data);
      if (!isAuthorized) {
        setIsAuthorized(true);
      }
      // Ports aktualisieren und Tokens laden
      setTimeout(() => {
        refreshAdminDataForState(res.data?.state);
      }, 500);
    } catch (e) {
      alert('Fehler beim Überspringen');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Leitungen spülen (Prime)
  const handlePrime = async () => {
    if (!ensureAdminAccess()) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(buildAdminUrl('/admin/prime'));
      setStatus(res.data);
      if (!isAuthorized) {
        setIsAuthorized(true);
      }
      // Ports aktualisieren und Tokens laden
      setTimeout(() => {
        refreshAdminDataForState(res.data?.state);
      }, 500);
    } catch (e) {
      alert('Fehler beim Spülen');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // System ausschalten
  const handleShutdown = async () => {
    if (!ensureAdminAccess()) {
      return;
    }

    if (!window.confirm('System wirklich ausschalten?')) return;
    setIsLoading(true);
    try {
      await axios.post(buildAdminUrl('/admin/shutdown'));
      // Zurück zum Initial State
      setStatus({ state: 'Initial', message: 'System bereit.' });
      setAvailablePorts([]);
      setActivePorts({});
      setActiveTokens([]);
      setNewToken(null);
      alert('System wird ausgeschaltet');
    } catch (e) {
      alert('Fehler beim Ausschalten');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Status abrufen (nur Initial)
  const fetchStatus = async () => {
    try {
      // Versuche /user/status - das ist der verfügbare Endpoint
      const res = await axios.get(`/user/status`, { params: { adminToken } });
      setStatus(res.data);
      return res.data;
    } catch (e) {
      console.error("Fehler beim Laden des Status", e);
      // Fallback: behalte aktuellen Status
      return null;
    }
  };

  const handleReloadConfiguration = async () => {
    if (!ensureAdminAccess()) {
      return;
    }

    setIsLoading(true);
    setReloadFeedback(null);

    try {
      const res = await axios.post(buildAdminUrl('/admin/reload-configuration'));
      setStatus(res.data);
      setReloadFeedback({
        type: 'success',
        message: res.data?.message || 'Konfiguration wurde neu geladen.'
      });
      setShowReloadToast(true);
      if (reloadToastTimeout.current) clearTimeout(reloadToastTimeout.current);
      reloadToastTimeout.current = setTimeout(() => setShowReloadToast(false), 3000);

      if (!isAuthorized) {
        setIsAuthorized(true);
      }

      const refreshedStatus = await fetchStatus();
      const nextStatus = refreshedStatus || res.data;

      if (isIdleReloadState(nextStatus?.state)) {
        await fetchPorts();
      }
    } catch (e) {
      const errorStatus = e?.response?.data;

      if (errorStatus?.state) {
        setStatus(errorStatus);
      }

      setReloadFeedback({
        type: 'error',
        message: errorStatus?.message || 'Fehler beim Neuladen der Konfiguration'
      });
      setShowReloadToast(true);
      if (reloadToastTimeout.current) clearTimeout(reloadToastTimeout.current);
      reloadToastTimeout.current = setTimeout(() => setShowReloadToast(false), 4000);
      console.error('Fehler beim Neuladen der Konfiguration', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!ensureAdminAccess()) {
      return;
    }

    setIsLoading(true);
    setReloadFeedback(null);

    try {
      const res = await axios.post(buildAdminUrl('/admin/save-configuration'));
      setReloadFeedback({
        type: 'success',
        title: 'Konfiguration gespeichert',
        message: res.data?.message || 'Konfiguration wurde gespeichert.'
      });
      setShowReloadToast(true);
      if (reloadToastTimeout.current) clearTimeout(reloadToastTimeout.current);
      reloadToastTimeout.current = setTimeout(() => setShowReloadToast(false), 3000);
    } catch (e) {
      const errorData = e?.response?.data;
      setReloadFeedback({
        type: 'error',
        title: 'Speichern fehlgeschlagen',
        message: errorData?.message || 'Fehler beim Speichern der Konfiguration.'
      });
      setShowReloadToast(true);
      if (reloadToastTimeout.current) clearTimeout(reloadToastTimeout.current);
      reloadToastTimeout.current = setTimeout(() => setShowReloadToast(false), 4000);
      console.error('Fehler beim Speichern der Konfiguration', e);
    } finally {
      setIsLoading(false);
    }
  };

  const isWaitForIdleTimeout = (error) => {
    const responseStatus = error?.response?.status;
    return error?.code === 'ECONNABORTED' || responseStatus === 408 || responseStatus === 504;
  };

  const waitForStableAdminState = async (signal) => {
    while (true) {
      try {
        const waitRes = await axios.get('/user/wait-for-idle', signal ? { signal } : undefined);
        setStatus(waitRes.data);
        return waitRes.data;
      } catch (e) {
        if (axios.isCancel(e)) {
          throw e;
        }

        if (!isWaitForIdleTimeout(e)) {
          throw e;
        }

        const latestStatus = await fetchStatus();

        if (!latestStatus || latestStatus.state !== 'Priming') {
          return latestStatus;
        }
      }
    }
  };

  const waitForIdleBeforeControl = async () => {
    const idleStatus = await waitForStableAdminState();

    if (idleStatus) {
      setStatus(idleStatus);
    }

    return idleStatus;
  };

  const sendPulseCommand = async (port, durationMs) => {
    await waitForIdleBeforeControl();

    try {
      return await axios.post(`/admin/com-ports/${encodeURIComponent(port)}/pulse`, null, {
        params: {
          adminToken,
          durationMs
        }
      });
    } catch (error) {
      if (!isControlRetryableConflict(error)) {
        throw error;
      }

      await waitForIdleBeforeControl();

      return axios.post(`/admin/com-ports/${encodeURIComponent(port)}/pulse`, null, {
        params: {
          adminToken,
          durationMs
        }
      });
    }
  };

  useEffect(() => {
    const initAdminPanel = () => {
      fetchStatus();

      if (!hasAdminToken) {
        setIsAuthorized(false);
        setAuthNotice('Nur fuer Administratoren verfuegbar.');
        return;
      }

      setIsAuthorized(true);
      setAuthNotice('');
      fetchPorts();
    };

    initAdminPanel();
    fetchRequireRecipeToken();
    fetchIngredients();

    if (hasAdminToken) {
      fetchRecipes();
    }
  }, [adminToken]);

  useEffect(() => {
    if (!hasAdminToken || !shouldManageTokens) {
      return undefined;
    }

    fetchTokens();

    const tokenInterval = setInterval(fetchTokens, 10000);

    return () => {
      clearInterval(tokenInterval);
    };
  }, [adminToken, hasAdminToken, shouldManageTokens]);

  useEffect(() => {
    if (!hasAdminToken || !isAuthorized || status.state !== 'Priming') {
      return undefined;
    }

    const controller = new AbortController();

    const syncPrimingState = async () => {
      try {
        const nextStatus = await waitForStableAdminState(controller.signal);

        if (nextStatus && !controller.signal.aborted) {
          await fetchPorts();

          if (isTokenManagementState(nextStatus.state)) {
            await fetchTokens();
          } else {
            setActiveTokens([]);
            setNewToken(null);
          }
        }
      } catch (e) {
        if (!axios.isCancel(e)) {
          console.error('Fehler beim Warten auf Abschluss des Spuelvorgangs', e);
        }
      }
    };

    syncPrimingState();

    return () => {
      controller.abort();
    };
  }, [adminToken, hasAdminToken, isAuthorized, status.state]);

  // Aufzeichnungssession wiederherstellen, wenn der Mixer-Status Recording anzeigt
  // Nur wenn NICHT gerade ein Rezept im Wizard bearbeitet wird (Wizard verwaltet Recording selbst)
  useEffect(() => {
    if (hasAdminToken && isAuthorized && status.state === 'RecordingIngredient' && !recordingSession && !editingRecipe) {
      checkForActiveRecording();
    }
  }, [status.state, isAuthorized, hasAdminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const showHardware = isAuthorized && ['RequestPrimingContainer', 'PrimingContainerConfirmed', 'Priming', 'MixerDispense'].includes(status.state);

  if (recordingSession) {
    return (
      <div style={adminContainerStyle}>
        <div style={headerStyle}>
          <h2 style={adminTitleStyle}>🍸 Mixer Admin</h2>
          {onLogout && (
            <button onClick={onLogout} style={logoutButtonStyle}>
              🔐 Logout
            </button>
          )}
        </div>
        <RecordingMode
          adminToken={adminToken}
          initialSession={recordingSession}
          onAbort={handleRecordingAbort}
          onSaved={handleRecordingSaved}
          skipSaveDialog
          recipeUuid={recipes.find(r => r.name === recordingSession?.sourceRecipeName)?.uuid}
          initialRecordedMs={pendingRecordedMs}
          initialSessionStepsMs={pendingSessionStepsMs}
          onPause={(byName) => {
            const recipe = recipes.find(r => r.name === recordingSession?.sourceRecipeName);
            if (recipe) {
              // pendingRecordedMs enthält alle Session-Werte (aus checkForActiveRecording);
              // byName überschreibt mit den lokal aufgezeichneten Werten
              const initialMs = { ...pendingRecordedMs };
              for (const [name, hist] of Object.entries(byName)) {
                if (hist.displayMs > 0) initialMs[name] = hist.displayMs;
              }
              setPendingRecordedMs(initialMs);
              setPendingInitialStep(2);
              setEditingRecipe(recipe);
            }
            setRecordingSession(null);
          }}
        />
      </div>
    );
  }

  if (editingRecipe) {
    return (
      <div style={adminContainerStyle}>
        <div style={headerStyle}>
          <h2 style={adminTitleStyle}>🍸 Mixer Admin</h2>
          {onLogout && (
            <button onClick={onLogout} style={logoutButtonStyle}>
              🔐 Logout
            </button>
          )}
        </div>
        <RecipeEditWizard
          adminToken={adminToken}
          recipe={editingRecipe}
          onCancel={handleEditCancel}
          onSaved={handleEditSaved}
          initialRecordedMs={pendingRecordedMs}
          initialStep={pendingInitialStep}
        />
      </div>
    );
  }

  return (
    <div style={adminContainerStyle}>
      <div style={headerStyle}>
        <h2 style={adminTitleStyle}>🍸 Mixer Admin</h2>
        {onLogout && (
          <button onClick={onLogout} style={logoutButtonStyle}>
            🔐 Logout
          </button>
        )}
      </div>

      <AdminStatusDisplay state={status.state} authNotice={authNotice} />


      {/* Toast für Reload-Feedback */}
      {showReloadToast && reloadFeedback && (
        <div
          role="alert"
          data-testid="reload-toast"
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            minWidth: 260,
            maxWidth: 400,
            background: reloadFeedback.type === 'error' ? '#fdeeee' : '#edf9f1',
            color: reloadFeedback.type === 'error' ? '#992a2a' : '#1f6b38',
            border: `1.5px solid ${reloadFeedback.type === 'error' ? '#f1b9b9' : '#b9e2c5'}`,
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
            padding: '18px 22px',
            fontSize: '1rem',
            fontWeight: 500,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            alignItems: 'flex-start',
            pointerEvents: 'none',
            transition: 'opacity 0.3s',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }} data-testid="reload-toast-title">
            {reloadFeedback.title ?? (reloadFeedback.type === 'error' ? 'Reload fehlgeschlagen' : 'Konfiguration neu geladen')}
          </div>
          <div data-testid="reload-toast-message">{reloadFeedback.message}</div>
        </div>
      )}

      <AdminActions
        state={status.state}
        isLoading={isLoading}
        isAuthorized={isAuthorized}
        reloadInfoText={getReloadInfoText(status.state)}
        onStart={handleStartSystem}
        onConfirmContainer={handleConfirmContainer}
        onSkipPrime={handleSkipPrime}
        onPrime={handlePrime}
        onShutdown={handleShutdown}
        onReloadConfiguration={handleReloadConfiguration}
        onSaveConfiguration={handleSaveConfiguration}
      />

      <hr style={{ margin: '30px 0', backgroundColor: '#ddd', border: 'none', height: '1px' }} />

      {showHardware && (
        <>
          <HardwareControl
            ports={availablePorts}
            activePorts={activePorts}
            onControl={handleComControl}
            isBusy={Boolean(currentControlRequest)}
            currentControlRequest={currentControlRequest}
            ingredients={ingredients}
            onMapIngredient={handleMapPortIngredient}
          />

          {controlFeedback && (
            <div
              role="alert"
              style={controlFeedback.type === 'error' ? reloadErrorStyle : reloadSuccessStyle}
            >
              <div style={reloadFeedbackTitleStyle}>Direktsteuerung</div>
              <div>{controlFeedback.message}</div>
            </div>
          )}
        </>
      )}

      {isAuthorized && status.state === 'MixerDispense' && recipes.length > 0 && (
        <div style={recordingSectionStyle}>
          <h3 style={recordingSectionTitleStyle}>📹 Aufzeichnungsmodus</h3>
          <p style={recordingSectionDescStyle}>
            Rezept auswählen, um tatsächliche Abfüllzeiten manuell aufzuzeichnen.
          </p>
          <RecipeList
            recipes={recipes}
            onSelect={() => {}}
            isLocked={isLoading}
            onRecord={handleStartEdit}
            onDelete={handleDeleteRecipe}
          />
        </div>
      )}

      {isAuthorized && requireRecipeToken !== null && (
        <div style={recipeTokenSettingStyle}>
          <h3 style={recipeTokenSettingTitleStyle}>🔑 Rezept-Token-Pflicht</h3>
          <p style={recipeTokenSettingTextStyle}>
            Aktuell:{' '}
            <strong>{requireRecipeToken ? 'Aktiv – Benutzer müssen ein Token eingeben' : 'Inaktiv – kein Token erforderlich'}</strong>
          </p>
          {recipeTokenFeedback && (
            <div
              role="alert"
              style={recipeTokenFeedback.type === 'error' ? reloadErrorStyle : reloadSuccessStyle}
            >
              {recipeTokenFeedback.message}
            </div>
          )}
          <button
            onClick={() => handleSetRecipeTokenRequired(!requireRecipeToken)}
            disabled={isLoading}
            style={{
              ...recipeTokenToggleButtonStyle,
              backgroundColor: requireRecipeToken ? '#6c757d' : '#28a745'
            }}
          >
            {requireRecipeToken ? '🔓 Token-Pflicht deaktivieren' : '🔒 Token-Pflicht aktivieren'}
          </button>
        </div>
      )}

      {shouldManageTokens && (
        <TokenManagement
          tokens={activeTokens}
          newToken={newToken}
          onGenerate={handleGenerate}
          onRefresh={fetchTokens}
        />
      )}
    </div>
  );
};

const adminContainerStyle = {
  padding: 'clamp(15px, 5vw, 20px)',
  backgroundColor: '#f4f4f4',
  color: '#000000',
  width: '100%',
  boxSizing: 'border-box',
  maxWidth: '1200px',
  margin: '0 auto'
};

const adminTitleStyle = {
  fontSize: 'clamp(1.5rem, 4vw, 2rem)',
  marginTop: '0',
  marginBottom: '0'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '20px',
  marginBottom: '20px'
};

const logoutButtonStyle = {
  padding: 'clamp(8px, 2vw, 12px)',
  fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
  backgroundColor: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap'
};

const reloadFeedbackBaseStyle = {
  marginBottom: '20px',
  padding: '16px 18px',
  borderRadius: '12px',
  border: '1px solid transparent',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
};

const reloadSuccessStyle = {
  ...reloadFeedbackBaseStyle,
  backgroundColor: '#edf9f1',
  borderColor: '#b9e2c5',
  color: '#1f6b38'
};

const reloadErrorStyle = {
  ...reloadFeedbackBaseStyle,
  backgroundColor: '#fdeeee',
  borderColor: '#f1b9b9',
  color: '#992a2a'
};

const reloadFeedbackTitleStyle = {
  fontWeight: 'bold',
  marginBottom: '6px'
};

const recipeTokenSettingStyle = {
  background: '#ffffff',
  padding: '20px',
  borderRadius: '12px',
  marginBottom: '20px',
  border: '1px solid #dee2e6'
};

const recipeTokenSettingTitleStyle = {
  marginTop: '0',
  marginBottom: '10px',
  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
  color: '#2c3e50'
};

const recipeTokenSettingTextStyle = {
  color: '#555',
  fontSize: '0.95rem',
  marginBottom: '14px'
};

const recipeTokenToggleButtonStyle = {
  padding: 'clamp(10px, 2vw, 14px) 20px',
  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.2s ease'
};

const recordingSectionStyle = {
  background: '#ffffff',
  padding: '20px',
  borderRadius: '12px',
  marginBottom: '20px',
  border: '1px solid #dee2e6',
  width: '100%',
  boxSizing: 'border-box'
};

const recordingSectionTitleStyle = {
  marginTop: '0',
  marginBottom: '8px',
  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
  color: '#2c3e50'
};

const recordingSectionDescStyle = {
  color: '#6c757d',
  fontSize: '0.95rem',
  margin: '0 0 16px'
};

export default AdminPanel;