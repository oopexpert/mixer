import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const formatDisplayMs = (ms) => {
  if (!ms || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const milli = ms % 1000;
  if (min > 0) {
    return `${min}:${String(sec).padStart(2, '0')}.${String(milli).padStart(3, '0')}`;
  }
  return `${sec}.${String(milli).padStart(3, '0')} s`;
};

const formatSec = (ms) => {
  if (ms == null) return '– (keine Referenz)';
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
};

const formatDiff = (diffMs) => {
  if (diffMs == null) return null;
  const sign = diffMs >= 0 ? '+' : '';
  return `${sign}${(diffMs / 1000).toFixed(1).replace('.', ',')} s`;
};

// Server kann Timestamps in Sekunden oder Millisekunden liefern
const toEpochMs = (ts) => (ts != null && ts < 1e12) ? ts * 1000 : ts;

// ──────────────────────────────────────────────────────────────────────────────
// RecordingMode
// ──────────────────────────────────────────────────────────────────────────────

const RecordingMode = ({ adminToken, initialSession, onAbort, onSaved, skipSaveDialog = false, onPause, initialRecordedMs, initialSessionStepsMs, recipeUuid }) => {
  const [totalSteps, setTotalSteps] = useState(initialSession?.totalSteps ?? 0);
  const [currentStepIndex, setCurrentStepIndex] = useState(initialSession?.currentStepIndex ?? 0);
  const [sourceRecipeName, setSourceRecipeName] = useState(initialSession?.sourceRecipeName ?? '');
  const [sessionComplete, setSessionComplete] = useState(initialSession?.sessionComplete ?? false);

  const [step, setStep] = useState(initialSession?.currentStep ?? null);
  const [portOn, setPortOn] = useState(initialSession?.currentStep?.portCurrentlyOn ?? false);
  const [completedCycles, setCompletedCycles] = useState([]);

  // Nach einem Seitenrefresh enthält initialRecordedMs den bereits aufgezeichneten Session-Wert
  // für den aktuellen Schritt (aus dem fire-and-forget PUT in handleStop geschrieben).
  // Wir initialisieren completedMs/displayMs damit, damit der Timer korrekt aufaddiert und
  // handleNext nicht "kein Zyklus, kein Wert" annimmt.
  const initialStepIngredient = initialSession?.currentStep?.ingredientName;
  // initialSessionStepsMs enthält nur Werte aus der aktuellen Session (totalDurationMs > 0
  // aus den Session-Schritten). initialRecordedMs kann Werte aus früheren Sessions enthalten.
  // → completedMs / hasRecorded nur auf Basis von Session-Daten bestimmen.
  const initialSessionStepMs = (initialSessionStepsMs?.[initialStepIngredient] ?? 0);
  // Exakten Wert aus initialRecordedMs bevorzugen (fire-and-forget PUT schreibt Exaktwert);
  // falls nicht vorhanden, gemessenen Session-Wert nehmen.
  const initialStepPreRecorded = initialSessionStepMs > 0
    ? (initialRecordedMs?.[initialStepIngredient] ?? initialSessionStepMs)
    : 0;
  const [completedMs, setCompletedMs] = useState(initialStepPreRecorded);
  const [displayMs, setDisplayMs] = useState(initialStepPreRecorded);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Save-dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [allSteps, setAllSteps] = useState([]);
  const [saveError, setSaveError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Refs for stopwatch (avoid stale closures in setInterval)
  const completedMsRef = useRef(initialStepPreRecorded); // session-relative completed ms (excluding running cycle)
  const runningStartedAtRef = useRef(null);
  const intervalRef = useRef(null);
  const savingRef = useRef(false); // synchrone Sperre gegen Doppelklick
  const referenceTimeoutRef = useRef(null); // auto-stop timer für Referenzabfüllung
  const stepHistoryRef = useRef({}); // { stepIndex: { displayMs, completedCycles, ingredientName } }
  // Absolute backend totalDurationMs when each step was first entered in this session.
  // session-relative display = backend.totalDurationMs - stepPreSessionBaseRef[stepIndex]
  // Bei Refresh: totalDurationMs enthält bereits den Session-Wert aus dem vorherigen Durchlauf,
  // daher wird initialStepPreRecorded abgezogen, damit der Basis-Offset korrekt bleibt.
  const stepPreSessionBaseRef = useRef({
    [initialSession?.currentStepIndex ?? 0]:
      (initialSession?.currentStep?.totalDurationMs ?? 0) - initialStepPreRecorded,
  });

  const buildUrl = (path) => `${path}?adminToken=${encodeURIComponent(adminToken)}`;

  // ── Stopwatch helpers ──────────────────────────────────────────────────────

  const startInterval = (startedAt, baseMs) => {
    clearInterval(intervalRef.current);
    runningStartedAtRef.current = startedAt;
    completedMsRef.current = baseMs;
    intervalRef.current = setInterval(() => {
      setDisplayMs(completedMsRef.current + (Date.now() - runningStartedAtRef.current));
    }, 16);
  };

  const stopInterval = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    runningStartedAtRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(referenceTimeoutRef.current);
    };
  }, []);

  // ── On mount: restore if port is already on or session is complete ─────────

  useEffect(() => {
    if (initialSession?.currentStep?.portCurrentlyOn) {
      syncAndRestore();
    } else if (initialSession?.sessionComplete) {
      loadFullSessionForSave(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session sync / restore ────────────────────────────────────────────────

  const syncAndRestore = async () => {
    try {
      const res = await axios.get(buildUrl('/admin/recording/session'));
      applySessionData(res.data);
    } catch (e) {
      if (e?.response?.status === 404) {
        setError('Session nicht mehr aktiv. Bitte zur Rezeptliste zurückkehren.');
      }
    }
  };

  const applySessionData = (data) => {
    setTotalSteps(data.totalSteps);
    setCurrentStepIndex(data.currentStepIndex);
    setSourceRecipeName(data.sourceRecipeName ?? '');

    if (data.sessionComplete) {
      setSessionComplete(true);
      loadFullSessionForSave(data);
      return;
    }

    const currentStep = data.currentStep;
    if (!currentStep) return;

    setStep(currentStep);
    setPortOn(currentStep.portCurrentlyOn ?? false);

    const stepFull = data.steps?.[data.currentStepIndex];
    const cycles = stepFull?.cycles ?? [];
    const closed = cycles.filter((c) => !c.running);
    const running = cycles.find((c) => c.running);

    setCompletedCycles(
      closed.map((c, i) => ({
        index: i,
        startedAt: c.startedAt,
        stoppedAt: c.stoppedAt,
        durationMs: c.durationMs,
      }))
    );

    // Absolute closed value (cumulativeRecordedMs, excluding any running cycle).
    const absoluteCompleted = running
      ? (currentStep.totalDurationMs ?? 0) - (running.durationMs ?? 0)
      : (currentStep.totalDurationMs ?? 0);
    // Derive or restore pre-session base for this step.
    const stepIdx = data.currentStepIndex;
    if (stepPreSessionBaseRef.current[stepIdx] == null) {
      // Fresh resume: estimate base as totalDurationMs minus all current-pass cycle durations.
      const currentPassMs = cycles.reduce((s, c) => s + (c.durationMs ?? 0), 0);
      stepPreSessionBaseRef.current[stepIdx] = absoluteCompleted - currentPassMs;
    }
    const sessionRelativeCompleted = absoluteCompleted - stepPreSessionBaseRef.current[stepIdx];
    completedMsRef.current = sessionRelativeCompleted;
    setCompletedMs(sessionRelativeCompleted);

    if (running) {
      startInterval(toEpochMs(running.startedAt), sessionRelativeCompleted);
    } else {
      setDisplayMs(sessionRelativeCompleted);
    }
  };

  const loadFullSessionForSave = async (existingData) => {
    try {
      const data =
        existingData ?? (await axios.get(buildUrl('/admin/recording/session'))).data;
      if (skipSaveDialog) {
        const res = await axios.post(buildUrl('/admin/recording/save'), {
          recipeName: data.sourceRecipeName ?? sourceRecipeName,
          replaceSourceRecipe: true,
        });
        onSaved(res.data);
      } else {
        setAllSteps(data.steps ?? []);
        setShowSaveDialog(true);
      }
    } catch (e) {
      if (skipSaveDialog) {
        // Im Wizard-Kontext: bei Fehler zurück zum Wizard statt hängenbleiben
        onAbort();
      } else {
        setError('Fehler beim Laden der Aufzeichnungsdaten.');
      }
    }
  };

  // ── Recording actions ─────────────────────────────────────────────────────

  const handleStart = async () => {
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const res = await axios.post(buildUrl('/admin/recording/ingredient/start'));
      setPortOn(true);
      startInterval(toEpochMs(res.data.startedAt), completedMs);
    } catch (e) {
      const status = e?.response?.status;
      const msg = extractMessage(e);
      if (status === 400) {
        await syncAndRestore();
      } else if (status === 409) {
        setError('Keine aktive Aufzeichnungssession. Bitte zur Rezeptliste zurückkehren.');
      } else {
        setError(msg || 'Fehler beim Einschalten des Ports.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const res = await axios.post(buildUrl('/admin/recording/ingredient/stop'));
      stopInterval();
      setPortOn(false);
      // Session-relative: subtract the absolute base that was present when this step was
      // first entered in this session (= the persisted value from the last session).
      const preBase = stepPreSessionBaseRef.current[currentStepIndex] ?? 0;
      const newTotal = res.data.totalDurationMs - preBase;
      completedMsRef.current = newTotal;
      setCompletedMs(newTotal);
      setDisplayMs(newTotal);
      setCompletedCycles((prev) => [
        ...prev,
        {
          index: res.data.cycleIndex,
          startedAt: res.data.startedAt,
          stoppedAt: res.data.stoppedAt,
          durationMs: res.data.cycleDurationMs,
        },
      ]);
      // Kumulierte Werte nach jedem Ausschalten persistieren (fire-and-forget)
      if (recipeUuid) {
        const byName = {};
        for (const hist of Object.values(stepHistoryRef.current)) {
          if (hist.ingredientName && hist.displayMs > 0) byName[hist.ingredientName] = hist.displayMs;
        }
        if (step?.ingredientName) byName[step.ingredientName] = newTotal;
        for (const [name, ms] of Object.entries(initialRecordedMs ?? {})) {
          if (!(name in byName) && ms > 0) byName[name] = ms;
        }
        axios.put(buildUrl(`/admin/recipes/${recipeUuid}/recorded-ms`), { recordedMs: byName }).catch(() => {});
      }
    } catch (e) {
      const status = e?.response?.status;
      const msg = extractMessage(e);
      if (status === 400) {
        await syncAndRestore();
      } else if (status === 409) {
        setError('Keine aktive Aufzeichnungssession. Bitte zur Rezeptliste zurückkehren.');
      } else {
        setError(msg || 'Fehler beim Ausschalten des Ports.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (isLoading || sessionComplete) return; // Session bereits abgeschlossen
    setError('');
    setIsLoading(true);
    try {
      // Kein Zyklus UND kein kumulierter Vorwert → Initialwert (Rezept-Original) beibehalten
      // Kein neuer Zyklus, aber kumulierter Vorwert vorhanden → kumulierten Wert senden
      // Neuer Zyklus aufgezeichnet → aktuellen displayMs senden
      const body = (completedCycles.length === 0 && completedMs === 0)
        ? { keepOriginalDurationMs: step.originalDurationMs ?? 0 }
        : { keepOriginalDurationMs: displayMs };
      const res = await axios.post(buildUrl('/admin/recording/ingredient/next'), body);
      // Schritt-Historie NACH erfolgreichem API-Aufruf speichern
      stepHistoryRef.current[currentStepIndex] = { displayMs, completedCycles: [...completedCycles], ingredientName: step?.ingredientName };
      stopInterval();
      if (res.data.sessionComplete) {
        if (skipSaveDialog) {
          // Wizard-Kontext: zurück zu "Zutaten & Abfüllungen" mit aufgezeichneten Werten
          const byName = {};
          for (const hist of Object.values(stepHistoryRef.current)) {
            if (hist.ingredientName) byName[hist.ingredientName] = hist;
          }
          // Session im Backend sauber schließen, damit der nächste Start nicht auf einen
          // "completed"-Zombie trifft (würde zu "Schritt 3/2" und fehlendem Panel führen)
          axios.post(buildUrl('/admin/recording/abort')).catch(() => {});
          onPause ? onPause(byName) : onAbort();
        } else {
          setSessionComplete(true);
          await loadFullSessionForSave(null);
        }
      } else {
        const nextIndex = res.data.currentStepIndex;
        const nextStep = res.data.currentStep;
        setStep(nextStep);
        setPortOn(nextStep.portCurrentlyOn ?? false);
        setCurrentStepIndex(nextIndex);
        // Vorherigen Zustand aus Historie wiederherstellen (falls vorhanden)
        // completedMs = history.displayMs: für hasRecorded, handleNext-Bedingung und
        // Startwert des Laufzeit-Timers (startInterval baseMs).
        // stepBaseMsRef bleibt 0: Backend-cumulativeRecordedMs überlebt reset(), daher
        // liefert /stop immer den vollen Kumulativwert ohne zusätzlichen Offset.
        const history = stepHistoryRef.current[nextIndex];
        if (history) {
          // Restore session-relative values from history; preSessionBase already set on first visit.
          setCompletedCycles(history.completedCycles);
          completedMsRef.current = history.displayMs;
          setCompletedMs(history.displayMs);
          setDisplayMs(history.displayMs);
        } else {
          // First visit to this step: nur Session-Wert (initialSessionStepsMs) → hasRecorded.
          // initialRecordedMs kann Werte aus früheren Sessions enthalten und dürfte den Button
          // nicht ausblenden.
          const sessionRecorded = initialSessionStepsMs?.[nextStep.ingredientName] ?? 0;
          // Exakten Wert aus initialRecordedMs bevorzugen (fire-and-forget schreibt Exaktwert),
          // Fallback auf gemessenen Session-Wert. 0 wenn in dieser Session noch nicht aufgezeichnet.
          const displayInit = sessionRecorded > 0
            ? (initialRecordedMs?.[nextStep.ingredientName] ?? sessionRecorded)
            : 0;
          if (stepPreSessionBaseRef.current[nextIndex] == null) {
            stepPreSessionBaseRef.current[nextIndex] = (nextStep.totalDurationMs ?? 0) - displayInit;
          }
          setCompletedCycles([]);
          completedMsRef.current = displayInit;
          setCompletedMs(displayInit);
          setDisplayMs(displayInit);
        }
      }
    } catch (e) {
      setError(extractMessage(e) || 'Fehler beim Weiterschalten.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrev = async () => {
    if (isLoading || currentStepIndex <= 0) return;
    setError('');
    setIsLoading(true);
    try {
      const res = await axios.post(buildUrl('/admin/recording/ingredient/prev'));
      // Schritt-Historie NACH erfolgreichem API-Aufruf speichern
      stepHistoryRef.current[currentStepIndex] = { displayMs, completedCycles: [...completedCycles], ingredientName: step?.ingredientName };
      stopInterval();
      const prevIndex = res.data.currentStepIndex;
      const prevStep = res.data.currentStep;
      setStep(prevStep);
      setPortOn(prevStep.portCurrentlyOn ?? false);
      setCurrentStepIndex(prevIndex);
      // Vorherigen Zustand aus Historie wiederherstellen (falls vorhanden)
      // completedMs = history.displayMs: für hasRecorded, handleNext-Bedingung und
      // Startwert des Laufzeit-Timers (startInterval baseMs).
      // stepBaseMsRef bleibt 0: Backend-cumulativeRecordedMs überlebt reset(), daher
      // liefert /stop immer den vollen Kumulativwert ohne zusätzlichen Offset.
      const history = stepHistoryRef.current[prevIndex];
      if (history) {
        // Restore session-relative values from history; preSessionBase already set on first visit.
        setCompletedCycles(history.completedCycles);
        completedMsRef.current = history.displayMs;
        setCompletedMs(history.displayMs);
        setDisplayMs(history.displayMs);
      } else {
        // First visit to this step: nur Session-Wert (initialSessionStepsMs) → hasRecorded.
        const sessionRecorded = initialSessionStepsMs?.[prevStep.ingredientName] ?? 0;
        const displayInit = sessionRecorded > 0
          ? (initialRecordedMs?.[prevStep.ingredientName] ?? sessionRecorded)
          : 0;
        if (stepPreSessionBaseRef.current[prevIndex] == null) {
          stepPreSessionBaseRef.current[prevIndex] = (prevStep.totalDurationMs ?? 0) - displayInit;
        }
        setCompletedCycles([]);
        completedMsRef.current = displayInit;
        setCompletedMs(displayInit);
        setDisplayMs(displayInit);
      }
    } catch (e) {
      setError(extractMessage(e) || 'Fehler beim Zurückgehen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEdit = () => {
    stopInterval();
    // Aktuellen Schritt noch in die Historie aufnehmen
    stepHistoryRef.current[currentStepIndex] = { displayMs, completedCycles: [...completedCycles], ingredientName: step?.ingredientName };
    if (onPause) {
      // Name-basierte Map → Wizard kann unabhängig von Recording-Step-Indices matchen
      const byName = {};
      for (const hist of Object.values(stepHistoryRef.current)) {
        if (hist.ingredientName) byName[hist.ingredientName] = hist;
      }
      // Session im Backend sauber schließen (analog zu handleNext beim letzten Schritt),
      // damit kein aktiver Session-Zombie zurückbleibt.
      axios.post(buildUrl('/admin/recording/abort')).catch(() => {});
      onPause(byName); // mit Aufzeichnungsstand zurück zum Wizard
    } else {
      onAbort(); // Session im Backend bleibt aktiv – kein Abort-Aufruf
    }
  };

  const handleUseReference = async () => {
    if (isLoading || portOn || !step?.originalDurationMs) return;
    const durationMs = step.originalDurationMs;
    setError('');
    setIsLoading(true);
    try {
      const res = await axios.post(buildUrl('/admin/recording/ingredient/start'));
      setPortOn(true);
      startInterval(toEpochMs(res.data.startedAt), completedMs);
    } catch (e) {
      setError(extractMessage(e) || 'Fehler beim Starten der Referenzabfüllung.');
      setIsLoading(false);
      return;
    }
    setIsLoading(false);

    // Auto-Stopp nach Referenzdauer
    await new Promise(resolve => { referenceTimeoutRef.current = setTimeout(resolve, durationMs); });
    referenceTimeoutRef.current = null;

    setIsLoading(true);
    try {
      const res = await axios.post(buildUrl('/admin/recording/ingredient/stop'));
      stopInterval();
      setPortOn(false);
      // Exakt den Referenzwert setzen (nicht den gemessenen Wert mit Netzwerk-Latenz).
      // stepPreSessionBaseRef wird so angepasst, dass spätere Zyklen korrekt aufaddieren:
      //   newBase = res.data.totalDurationMs - durationMs
      // → nächster Stop: totalDurationMs_new - newBase = durationMs + neueCycleDauer ✓
      stepPreSessionBaseRef.current[currentStepIndex] = res.data.totalDurationMs - durationMs;
      completedMsRef.current = durationMs;
      setCompletedMs(durationMs);
      setDisplayMs(durationMs);
      setCompletedCycles(prev => [
        ...prev,
        {
          index: res.data.cycleIndex,
          startedAt: res.data.startedAt,
          stoppedAt: res.data.stoppedAt,
          durationMs: res.data.cycleDurationMs,
        },
      ]);
      if (recipeUuid) {
        const byName = {};
        for (const hist of Object.values(stepHistoryRef.current)) {
          if (hist.ingredientName && hist.displayMs > 0) byName[hist.ingredientName] = hist.displayMs;
        }
        if (step?.ingredientName) byName[step.ingredientName] = durationMs;
        for (const [name, ms] of Object.entries(initialRecordedMs ?? {})) {
          if (!(name in byName) && ms > 0) byName[name] = ms;
        }
        axios.put(buildUrl(`/admin/recipes/${recipeUuid}/recorded-ms`), { recordedMs: byName }).catch(() => {});
      }
    } catch (e) {
      const status = e?.response?.status;
      // 409/400 = Nutzer hat manuell gestoppt – kein Fehler anzeigen
      if (status !== 409 && status !== 400) {
        setError(extractMessage(e) || 'Fehler beim Auto-Stopp nach Referenzabfüllung.');
      }
      stopInterval();
      setPortOn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbort = async () => {
    if (!window.confirm('Aufzeichnung wirklich abbrechen? Alle aufgezeichneten Daten gehen verloren.'))
      return;
    stopInterval();
    setIsLoading(true);
    try {
      await axios.post(buildUrl('/admin/recording/abort'));
    } catch (e) {
      console.error('Fehler beim Abbrechen der Aufzeichnung', e);
    } finally {
      onAbort();
    }
  };

  const handleSave = async () => {
    if (savingRef.current || saveSuccess) return;
    savingRef.current = true;
    setSaveError('');
    setSaveLoading(true);
    try {
      const res = await axios.post(buildUrl('/admin/recording/save'), {
        recipeName: sourceRecipeName,
        replaceSourceRecipe: true,
      });
      setSaveSuccess(true);
      setTimeout(() => onSaved(res.data), 1200);
    } catch (e) {
      const status = e?.response?.status;
      const msg = extractMessage(e);
      console.error('[RecordingMode] Fehler beim Speichern:', status, e?.response?.data, e);
      if (status === 409) {
        setSaveError(
          'Session nicht abgeschlossen oder nicht vorhanden. Bitte zur Rezeptliste zurückkehren.'
        );
      } else {
        setSaveError(`Fehler ${status ?? ''}: ${msg || e?.message || 'Unbekannter Fehler'}`.trim());
      }
      savingRef.current = false;
      setSaveLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!window.confirm('Aufzeichnung verwerfen? Die aufgezeichneten Daten gehen verloren.'))
      return;
    stopInterval();
    try {
      await axios.post(buildUrl('/admin/recording/abort'));
    } catch (e) {
      console.error('Fehler beim Verwerfen', e);
    } finally {
      onAbort();
    }
  };

  // ── Render: Save Dialog ───────────────────────────────────────────────────

  if (showSaveDialog) {
    return (
      <div style={screenStyle}>
        {/* Header – gleiche Struktur wie Recording Screen */}
        <div style={recordingHeaderStyle}>
          <div>
            <div style={recordingBadgeStyle}>AUFZEICHNUNGSMODUS</div>
            <div style={recordingTitleStyle}>{sourceRecipeName}</div>
            <div style={recordingStepStyle}>Aufzeichnung abgeschlossen</div>
          </div>
          <button
            style={abortButtonStyle}
            onClick={handleDiscard}
            disabled={saveLoading || saveSuccess}
          >
            🗑 Verwerfen
          </button>
        </div>

        {/* Card – gleicher Stil wie stepCard */}
        <div style={{ ...stepCardStyle, display: 'flex', flexDirection: 'column' }}>
          {saveError && <div style={errorBannerStyle}>{saveError}</div>}
          {saveSuccess && <div style={successBannerStyle}>✅ Rezept wurde gespeichert!</div>}

          {/* Scrollbare Zutatentabelle */}
          <div style={{ ...tableWrapStyle, maxHeight: '280px', overflowY: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Zutat</th>
                  <th style={thStyle}>Port</th>
                  <th style={thStyle}>Ursprünglich</th>
                  <th style={thStyle}>Aufgezeichnet</th>
                  <th style={thStyle}>Differenz</th>
                </tr>
              </thead>
              <tbody>
                {allSteps.map((s, i) => {
                  const isUnchanged = s.totalDurationMs === 0;
                  const diff = (!isUnchanged && s.originalDurationMs != null)
                    ? s.totalDurationMs - s.originalDurationMs
                    : null;
                  const diffPositive = diff != null && diff > 0;
                  const diffNegative = diff != null && diff < 0;
                  return (
                    <tr key={i} style={i % 2 === 0 ? trEvenStyle : {}}>
                      <td style={tdStyle}>{s.ingredientName}</td>
                      <td style={{ ...tdStyle, color: '#6c757d', fontSize: '0.85rem' }}>{s.portName}</td>
                      <td style={tdStyle}>{formatSec(s.originalDurationMs)}</td>
                      <td style={{ ...tdStyle, fontWeight: isUnchanged ? 'normal' : 'bold', color: isUnchanged ? '#6c757d' : undefined }}>
                        {isUnchanged
                          ? <span style={{ fontStyle: 'italic' }}>{formatSec(s.originalDurationMs)} (unverändert)</span>
                          : formatSec(s.totalDurationMs)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: diffPositive ? '#c0392b' : diffNegative ? '#27ae60' : '#6c757d',
                          fontWeight: diff != null && diff !== 0 ? 'bold' : 'normal',
                        }}
                      >
                        {formatDiff(diff) ?? '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Hinweis */}
          <div style={{ ...replaceHintStyle, marginTop: 'auto', paddingTop: '14px', marginBottom: '16px' }}>
            ⚠️ Das Rezept <strong>{sourceRecipeName}</strong> wird mit den aufgezeichneten Werten überschrieben.
          </div>

          {/* Controls – gleiche Position wie Weiter/Abschließen */}
          <div style={controlsRowStyle}>
            <button
              style={{
                ...controlButtonStyle,
                flex: '1',
                backgroundColor: (savingRef.current || saveSuccess) ? '#adb5bd' : '#28a745',
                cursor: (savingRef.current || saveSuccess) ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSave}
              disabled={savingRef.current || saveSuccess}
            >
              {saveLoading ? '⏳ Speichern...' : '💾 Speichern'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Recording Screen ──────────────────────────────────────────────

  // hasRecorded: nur auf Basis von portOn, aufgezeichneten Zyklen ODER Session-Schritt-Daten.
  // completedMs > 0 reicht nicht, da completedMs auch Werte aus vorherigen Sessions enthalten
  // kann (via initialRecordedMs → handleNext/handlePrev else-Branch).
  const hasRecorded = portOn || completedCycles.length > 0
    || (initialSessionStepsMs?.[step?.ingredientName] ?? 0) > 0;
  const prevRecordedMs = initialRecordedMs?.[step?.ingredientName] ?? 0;
  const shownDisplayMs = hasRecorded ? displayMs : (prevRecordedMs > 0 ? prevRecordedMs : (step?.originalDurationMs ?? 0));
  // Differenz auch anzeigen wenn prevRecordedMs > 0 (z.B. nach Navigation mit kumuliertem Backend-Wert)
  const diffMs = (step?.originalDurationMs != null && (hasRecorded || prevRecordedMs > 0))
    ? shownDisplayMs - step.originalDurationMs
    : null;

  return (
    <div style={screenStyle}>
      {/* Header */}
      <div style={recordingHeaderStyle}>
        <div>
          <div style={recordingBadgeStyle}>AUFZEICHNUNGSMODUS</div>
          <div style={recordingTitleStyle}>{sourceRecipeName}</div>
          <div style={recordingStepStyle}>
            Schritt {currentStepIndex + 1} von {totalSteps}
          </div>
        </div>
        <button
          style={abortButtonStyle}
          onClick={handleAbort}
          disabled={isLoading}
        >
          ✕ Abbrechen
        </button>
      </div>

      {/* Step card */}
      {step && (
        <div style={stepCardStyle}>
          <div style={ingredientNameStyle}>{step.ingredientName}</div>
          <div style={portNameStyle}>Port: {step.portName}</div>

          {/* Reference / Recorded / Diff */}
          <div style={timingGridStyle}>
            <div style={timingRowStyle}>
              <span style={timingLabelStyle}>Referenz (Rezept):</span>
              <span style={{ ...timingValueStyle, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {formatSec(step.originalDurationMs)}
                {step.originalDurationMs > 0 && !hasRecorded && (
                  <button
                    style={{
                      ...refPulseButtonStyle,
                      opacity: isLoading ? 0.45 : 1,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                    onClick={handleUseReference}
                    disabled={isLoading}
                    title="Referenzwert abfüllen"
                  >
                    ▶ Abfüllen
                  </button>
                )}
              </span>
            </div>
            <div style={timingRowStyle}>
              <span style={timingLabelStyle}>Aufgezeichnet:</span>
              <span style={{ ...timingValueStyle, fontWeight: 'bold', fontSize: '1.5rem' }}>
                {formatDisplayMs(shownDisplayMs)}
                {portOn && <span style={runningDotStyle}> ●</span>}
                {!hasRecorded && prevRecordedMs === 0 && <span style={{ fontSize: '0.85rem', color: '#6c757d', fontWeight: 'normal', marginLeft: '6px' }}>(Original)</span>}
              </span>
            </div>
            <div style={timingRowStyle}>
              <span style={timingLabelStyle}>Differenz:</span>
              <span
                style={{
                  ...timingValueStyle,
                  color: diffMs != null
                    ? (diffMs > 0 ? '#c0392b' : diffMs < 0 ? '#27ae60' : '#6c757d')
                    : '#adb5bd',
                  fontWeight: diffMs != null ? 'bold' : 'normal',
                }}
              >
                {diffMs != null ? formatDiff(diffMs) : '–'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ ...controlsRowStyle, marginTop: 'auto' }}>
            <button
              style={{
                ...controlButtonStyle,
                backgroundColor: (isLoading || portOn) ? '#adb5bd' : '#6c757d',
                cursor: (isLoading || portOn) ? 'not-allowed' : 'pointer',
              }}
              onClick={currentStepIndex > 0 ? handlePrev : handleBackToEdit}
              disabled={isLoading || portOn}
            >
              ‹ Zurück
            </button>
            <button
              style={{
                ...controlButtonStyle,
                flex: '2',
                backgroundColor: isLoading ? '#adb5bd' : portOn ? '#dc3545' : '#28a745',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
              onClick={portOn ? handleStop : handleStart}
              disabled={isLoading}
            >
              {isLoading ? '⏳' : portOn ? '■ Ausschalten' : '▶ Einschalten'}
            </button>
            <button
              style={{
                ...controlButtonStyle,
                backgroundColor: (isLoading || portOn) ? '#adb5bd' : '#007bff',
                cursor: (isLoading || portOn) ? 'not-allowed' : 'pointer',
              }}
              onClick={handleNext}
              disabled={isLoading || portOn}
            >
              {isLoading ? '⏳' : currentStepIndex + 1 >= totalSteps ? '✓ Abschließen' : 'Weiter ›'}
            </button>
          </div>
        </div>
      )}

      {error && <div style={errorBannerStyle}>{error}</div>}
    </div>
  );
};

// ── Helper ────────────────────────────────────────────────────────────────────

const extractMessage = (e) => {
  const data = e?.response?.data;
  if (typeof data === 'string') return data;
  if (typeof data?.message === 'string') return data.message;
  return null;
};

// ── Styles ────────────────────────────────────────────────────────────────────

const screenStyle = {
  width: '100%',
  maxWidth: '640px',
  margin: '0 auto',
  padding: '0 8px',
  boxSizing: 'border-box',
};

const recordingHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '20px',
  gap: '12px',
};

const recordingBadgeStyle = {
  fontSize: '0.72rem',
  letterSpacing: '2px',
  fontWeight: 'bold',
  color: '#e67e22',
  marginBottom: '4px',
  textTransform: 'uppercase',
};

const recordingTitleStyle = {
  fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
  fontWeight: 'bold',
  color: '#2c3e50',
};

const recordingStepStyle = {
  fontSize: '0.9rem',
  color: '#7f8c8d',
  marginTop: '2px',
};

const refPulseButtonStyle = {
  padding: '3px 10px',
  borderRadius: '6px',
  border: '1px solid #6c757d',
  backgroundColor: '#f8f9fa',
  color: '#495057',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  lineHeight: 1.4,
};

const abortButtonStyle = {
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px solid #dc3545',
  backgroundColor: 'transparent',
  color: '#dc3545',
  fontWeight: 'bold',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontSize: '0.9rem',
};

const stepCardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #dee2e6',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
  marginBottom: '16px',
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column',
};

const ingredientNameStyle = {
  fontSize: 'clamp(1.4rem, 4vw, 2rem)',
  fontWeight: 'bold',
  color: '#2c3e50',
  marginBottom: '4px',
};

const portNameStyle = {
  fontSize: '0.9rem',
  color: '#6c757d',
  marginBottom: '20px',
};

const timingGridStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginBottom: '20px',
  backgroundColor: '#f8f9fa',
  borderRadius: '10px',
  padding: '14px 16px',
};

const timingRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
};

const timingLabelStyle = {
  fontSize: '0.9rem',
  color: '#6c757d',
};

const timingValueStyle = {
  fontSize: '1.1rem',
  color: '#2c3e50',
  fontVariantNumeric: 'tabular-nums',
};

const runningDotStyle = {
  color: '#28a745',
  animation: 'pulse 1s infinite',
};

const cyclesContainerStyle = {
  marginBottom: '20px',
};

const cyclesLabelStyle = {
  fontSize: '0.8rem',
  color: '#6c757d',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const cyclesListStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

const cycleBadgeStyle = {
  padding: '4px 10px',
  borderRadius: '20px',
  backgroundColor: '#e9ecef',
  color: '#495057',
  fontSize: '0.85rem',
  fontVariantNumeric: 'tabular-nums',
};

const controlsRowStyle = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
};

const controlButtonStyle = {
  flex: 1,
  minWidth: '100px',
  padding: '12px 16px',
  borderRadius: '10px',
  border: 'none',
  color: '#ffffff',
  fontWeight: 'bold',
  fontSize: '0.95rem',
  transition: 'background-color 0.2s',
};

const errorBannerStyle = {
  margin: '12px 0',
  padding: '12px 16px',
  borderRadius: '10px',
  backgroundColor: '#fdeeee',
  border: '1px solid #f1b9b9',
  color: '#992a2a',
  fontSize: '0.9rem',
};

const successBannerStyle = {
  margin: '12px 0',
  padding: '12px 16px',
  borderRadius: '10px',
  backgroundColor: '#edf9f1',
  border: '1px solid #b9e2c5',
  color: '#1f6b38',
  fontSize: '0.9rem',
  fontWeight: 'bold',
};

// Save dialog styles
const saveDialogCardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #dee2e6',
  borderRadius: '16px',
  padding: '28px 24px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  width: '100%',
  boxSizing: 'border-box',
};

const saveTitleStyle = {
  margin: '0 0 4px',
  fontSize: 'clamp(1.3rem, 3vw, 1.7rem)',
  color: '#2c3e50',
};

const saveSubtitleStyle = {
  margin: '0 0 20px',
  color: '#6c757d',
  fontSize: '0.95rem',
};

const tableWrapStyle = {
  overflowX: 'auto',
  marginBottom: '20px',
  borderRadius: '10px',
  border: '1px solid #dee2e6',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem',
};

const thStyle = {
  padding: '10px 12px',
  backgroundColor: '#f8f9fa',
  color: '#495057',
  fontWeight: 'bold',
  textAlign: 'left',
  borderBottom: '1px solid #dee2e6',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '9px 12px',
  color: '#2c3e50',
  borderBottom: '1px solid #f1f3f5',
};

const trEvenStyle = {
  backgroundColor: '#fafbfc',
};

const formGroupStyle = {
  marginBottom: '14px',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  color: '#6c757d',
  marginBottom: '5px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #ced4da',
  fontSize: '1rem',
  boxSizing: 'border-box',
  color: '#2c3e50',
};

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.95rem',
  color: '#2c3e50',
  cursor: 'pointer',
  marginBottom: '20px',
  userSelect: 'none',
};

const replaceHintStyle = {
  marginTop: '6px',
  fontSize: '0.85rem',
  color: '#6c757d',
};

const saveButtonRowStyle = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
};

const saveButtonStyle = {
  padding: '12px 24px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#28a745',
  color: '#ffffff',
  fontWeight: 'bold',
  fontSize: '1rem',
  cursor: 'pointer',
};

export default RecordingMode;
