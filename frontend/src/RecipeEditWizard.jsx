import { useState, useEffect } from 'react';
import axios from 'axios';
import RecordingMode from './RecordingMode';

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_LABELS = {
  LIQUID:  'Flüssig',
  VISCOUS: 'Viskos',
  CRYSTAL: 'Kristall',
  ADDON:   'Garnitur',
};

const TYPE_COLORS = {
  LIQUID:  { bg: '#dbeafe', color: '#1e40af' },
  VISCOUS: { bg: '#ffedd5', color: '#c2410c' },
  CRYSTAL: { bg: '#f3e8ff', color: '#7e22ce' },
  ADDON:   { bg: '#dcfce7', color: '#15803d' },
};

// ── Component ──────────────────────────────────────────────────────────────────

const RecipeEditWizard = ({ adminToken, recipe, onCancel, onSaved, initialRecordedMs = {}, initialStep = 1 }) => {
  const buildUrl = (path) => `${path}?adminToken=${encodeURIComponent(adminToken)}`;

  // ── Loading ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // ── Wizard step ──────────────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState(initialStep); // 1 = name, 2 = steps

  // ── Recipe data ──────────────────────────────────────────────────────────
  const [recipeName, setRecipeName] = useState(recipe.name);
  const [steps, setSteps] = useState([]);

  // ── Ingredient list (for add-step dropdown) ──────────────────────────────
  const [allIngredients, setAllIngredients] = useState([]);

  // ── Step-edit state ──────────────────────────────────────────────────────
  const [editIdx, setEditIdx] = useState(null);
  const [editValue, setEditValue] = useState('');

  // ── Add-step form state ──────────────────────────────────────────────────
  const [addingStep, setAddingStep] = useState(false);
  const [newIngUuid, setNewIngUuid] = useState('');
  const [newDurationMs, setNewDurationMs] = useState('1000');
  const [newRotations, setNewRotations] = useState('1');

  // ── Save / recording state ───────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [recordingSession, setRecordingSession] = useState(null);
  // Kumulierte Abfüllwerte aus Aufzeichnungssessions { ingredientName → ms }
  // Initial 0; sobald > 0 wurde abgefüllt und dieser Wert hat Vorrang beim Speichern
  const [recordedMs, setRecordedMs] = useState(initialRecordedMs);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const hasInitialRecordedMs = Object.keys(initialRecordedMs).some(k => initialRecordedMs[k] > 0);
    Promise.all([
      axios.get(buildUrl(`/admin/recipes/${recipe.uuid}`)),
      axios.get(buildUrl('/admin/ingredients')),
      hasInitialRecordedMs
        ? axios.get(buildUrl(`/admin/recipes/${recipe.uuid}/recorded-ms`)).catch(() => ({ data: { recordedMs: {} } }))
        : Promise.resolve({ data: { recordedMs: {} } }),
    ])
      .then(([recipeRes, ingRes, recordedMsRes]) => {
        setRecipeName(recipeRes.data.name);
        setSteps(recipeRes.data.steps.map((s) => ({ ...s })));
        setAllIngredients(
          ingRes.data.map((i) => ({
            uuid: i.ingredientUuid ?? i.ingredientUUID ?? i.uuid,
            name: i.name,
            type: i.type,
          }))
        );
        // Backend-Werte als Basis; initialRecordedMs (aus laufender Session) hat Vorrang
        const backendMs = recordedMsRes.data?.recordedMs ?? {};
        const merged = { ...backendMs };
        for (const [name, ms] of Object.entries(initialRecordedMs)) {
          if (ms > 0) merged[name] = ms;
        }
        setRecordedMs(merged);
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Fehler beim Laden des Rezepts.');
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PUT body builder ─────────────────────────────────────────────────────
  // Aufgezeichneter Wert hat Vorrang vor dem manuell eingegebenen Wert
  const buildPutBody = () => ({
    name: recipeName.trim(),
    recipeIngredients: steps.map((s) => {
      const base = { type: s.type, ingredientUUID: s.ingredientUuid };
      if (s.type === 'LIQUID') {
        const ms = (recordedMs[s.ingredientName] > 0 ? recordedMs[s.ingredientName] : Number(s.durationMs)) || 0;
        return { ...base, durationMilliseconds: ms };
      }
      if (s.type === 'CRYSTAL') return { ...base, rotations: Number(s.rotations) || 0 };
      return base;
    }),
  });

  // ── Step CRUD ─────────────────────────────────────────────────────────────
  const startEdit = (idx) => {
    setAddingStep(false);
    const s = steps[idx];
    // Zeige aufgezeichneten Wert als Startpunkt, falls vorhanden
    const liquidVal = recordedMs[s.ingredientName] > 0
      ? String(recordedMs[s.ingredientName])
      : String(s.durationMs ?? 1000);
    setEditValue(
      s.type === 'LIQUID'  ? liquidVal :
      s.type === 'CRYSTAL' ? String(s.rotations ?? 1) : ''
    );
    setEditIdx(idx);
  };

  const confirmEdit = () => {
    if (editIdx === null) return;
    const s = steps[editIdx];
    const updated = [...steps];
    if (s.type === 'LIQUID') {
      updated[editIdx] = { ...s, durationMs: Number(editValue) || 0 };
      // Manuelle Eingabe überschreibt aufgezeichneten Wert
      setRecordedMs((prev) => { const n = { ...prev }; delete n[s.ingredientName]; return n; });
    } else if (s.type === 'CRYSTAL') {
      updated[editIdx] = { ...s, rotations: Number(editValue) || 0 };
    }
    setSteps(updated);
    setEditIdx(null);
  };

  const moveStep = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSteps(next);
    setEditIdx(target);
  };

  const removeStep = (idx) => {
    setSteps(steps.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
    else if (editIdx !== null && editIdx > idx) setEditIdx(editIdx - 1);
  };

  const handleAddStep = () => {
    const ing = allIngredients.find((i) => i.uuid === newIngUuid);
    if (!ing) return;
    setSteps([
      ...steps,
      {
        type:           ing.type,
        ingredientUuid: ing.uuid,
        ingredientName: ing.name,
        portName:       null,
        durationMs:     ing.type === 'LIQUID'  ? Number(newDurationMs) || 1000 : null,
        rotations:      ing.type === 'CRYSTAL' ? Number(newRotations)  || 1    : null,
      },
    ]);
    setAddingStep(false);
    setNewIngUuid('');
    setNewDurationMs('1000');
    setNewRotations('1');
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    try {
      await axios.put(buildUrl(`/admin/recipes/${recipe.uuid}`), buildPutBody());
      axios.delete(buildUrl(`/admin/recipes/${recipe.uuid}/recorded-ms`)).catch(() => {});
      onSaved();
    } catch (e) {
      const msg = e?.response?.data?.message ?? (typeof e?.response?.data === 'string' ? e?.response?.data : null);
      setSaveError(msg || `Fehler ${e?.response?.status ?? ''}: Speichern fehlgeschlagen.`);
      setSaving(false);
    }
  };

  // ── Record ────────────────────────────────────────────────────────────────
  const handleRecord = async () => {
    setSaveError('');
    setSaving(true);
    try {
      await axios.post(buildUrl(`/admin/recording/start/${recipe.uuid}`));
      // POST response enthält kein vollständiges steps-Array → vollständige Session laden.
      const sessionRes = await axios.get(buildUrl('/admin/recording/session'));
      setRecordingSession(sessionRes.data);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? (typeof e?.response?.data === 'string' ? e?.response?.data : null);
      if (status === 409) {
        // Session bereits aktiv → bestehende Session laden und fortsetzen
        try {
          const sessionRes = await axios.get(buildUrl('/admin/recording/session'));
          setRecordingSession(sessionRes.data);
        } catch {
          setSaveError('Aufzeichnungssession bereits aktiv, konnte aber nicht geladen werden.');
        }
      }
      else if (status === 400) setSaveError(msg || 'Rezept hat keine automatischen Pump-Schritte.');
      else                     setSaveError(msg || `Fehler ${status ?? ''}: Aufzeichnung konnte nicht gestartet werden.`);
    } finally {
      setSaving(false);
    }
  };

  // ── Recording active → delegate entirely to RecordingMode ────────────────
  const handleRecordingDone = async () => {
    // Reload updated timings from backend, then return to step 2
    try {
      const res = await axios.get(buildUrl(`/admin/recipes/${recipe.uuid}`));
      setRecipeName(res.data.name);
      setSteps(res.data.steps.map((s) => ({ ...s })));
    } catch (e) {
      // keep existing steps if reload fails
    }    setRecordedMs({}); // Backend hat gespeichert – aufgezeichnete Werte sind jetzt in steps    setRecordingSession(null);
    // wizardStep stays at 2
  };

  if (recordingSession) {
    return (
      <RecordingMode
        adminToken={adminToken}
        initialSession={recordingSession}
        onAbort={() => setRecordingSession(null)}
        onSaved={handleRecordingDone}
        initialRecordedMs={recordedMs}
        recipeUuid={recipe.uuid}
        onPause={(byName) => {
          // Kumulierte Abfüllwerte in recordedMs übernehmen (steps-State bleibt unberührt)
          const next = { ...recordedMs };
          for (const [name, hist] of Object.entries(byName)) {
            if (hist.displayMs > 0) next[name] = hist.displayMs;
          }
          setRecordedMs(next);
          axios.put(buildUrl(`/admin/recipes/${recipe.uuid}/recorded-ms`), { recordedMs: next }).catch(() => {});
          setRecordingSession(null);
        }}
        skipSaveDialog
      />
    );
  }

  // ── Shared header helper ──────────────────────────────────────────────────
  const renderHeader = (subtitle, rightBtn) => (
    <div style={headerStyle}>
      <div>
        <div style={badgeStyle}>REZEPT BEARBEITEN</div>
        <div style={titleStyle}>{recipeName || recipe.name}</div>
        {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
      </div>
      {rightBtn}
    </div>
  );

  const abortBtn = (disabled = false) => (
    <button style={abortButtonStyle} onClick={onCancel} disabled={disabled}>
      ✕ Abbrechen
    </button>
  );

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={screenStyle}>
        {renderHeader(null, abortBtn())}
        <div style={cardStyle}>
          <p style={{ color: '#6c757d' }}>Lade Rezeptdaten…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={screenStyle}>
        {renderHeader(null, abortBtn())}
        <div style={{ ...cardStyle, ...errorBannerStyle }}>{loadError}</div>
      </div>
    );
  }

  // ── Step 1: Name ──────────────────────────────────────────────────────────
  if (wizardStep === 1) {
    const canProceed = recipeName.trim().length > 0;
    return (
      <div style={screenStyle}>
        {renderHeader('Schritt 1 von 2 – Name', abortBtn())}
        <div style={cardStyle}>
          <div style={fieldGroupStyle}>
            <label style={fieldLabelStyle}>Rezeptname</label>
            <input
              style={inputStyle}
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="Rezeptname eingeben"
              maxLength={100}
              autoFocus
            />
          </div>
          <div style={controlsRowStyle}>
            <button
              style={{
                ...ctrlBtnStyle,
                flex: 1,
                backgroundColor: canProceed ? '#007bff' : '#adb5bd',
                cursor: canProceed ? 'pointer' : 'not-allowed',
              }}
              disabled={!canProceed}
              onClick={() => setWizardStep(2)}
            >
              Weiter ›
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Steps ─────────────────────────────────────────────────────────
  const selectedNewIng = allIngredients.find((i) => i.uuid === newIngUuid);
  const canSave = steps.length > 0 && !saving;

  return (
    <div style={screenStyle}>
      {renderHeader('Schritt 2 von 2 – Zutaten & Abfüllungen', abortBtn(saving))}

      <div style={cardStyle}>
        {saveError && <div style={errorBannerStyle}>{saveError}</div>}

        {/* Table + Arrow buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', marginBottom: '0' }}>
          <div style={{ ...tableWrapStyle, flex: 1, maxHeight: '260px', overflowY: 'auto', overflowX: 'auto', marginBottom: 0 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Zutat</th>
                  <th style={thStyle}>Port</th>
                  <th style={thStyle}>Typ</th>
                  <th style={thStyle}>Wert</th>
                  <th style={{ ...thStyle, width: '52px', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s, i) => {
                  const isEditing = editIdx === i;
                  const tc = TYPE_COLORS[s.type] ?? { bg: '#e9ecef', color: '#495057' };
                  return (
                    <tr key={i} style={i % 2 === 0 ? trEvenStyle : {}}>
                      <td style={{ ...tdStyle, color: '#adb5bd', fontSize: '0.8rem', width: '24px' }}>{i + 1}</td>
                      <td style={tdStyle}>{s.ingredientName}</td>
                      <td style={{ ...tdStyle, color: s.portName ? '#2c3e50' : '#adb5bd', fontSize: '0.85rem' }}>
                        {s.portName ?? <em>manuell</em>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 'bold', padding: '2px 7px', borderRadius: '10px', backgroundColor: tc.bg, color: tc.color, whiteSpace: 'nowrap' }}>
                          {TYPE_LABELS[s.type] ?? s.type}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, minWidth: '80px' }}>
                        {isEditing && s.type === 'LIQUID' ? (
                          <input
                            type="number" min="0"
                            style={inlineInputStyle}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                          />
                        ) : isEditing && s.type === 'CRYSTAL' ? (
                          <input
                            type="number" min="0"
                            style={{ ...inlineInputStyle, width: '56px' }}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                          />
                        ) : s.type === 'LIQUID' ? (
                          recordedMs[s.ingredientName] > 0
                            ? `${recordedMs[s.ingredientName]} ms`
                            : `${s.durationMs ?? 0} ms`
                        ) : s.type === 'CRYSTAL' ? (
                          `${s.rotations ?? 0} Umdh.`
                        ) : (
                          <span style={{ color: '#adb5bd' }}>–</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                        {isEditing ? (
                          <button style={{ ...iconBtnStyle, color: '#28a745' }} onClick={confirmEdit} title="Bestätigen">✓</button>
                        ) : (
                          <>
                            <button style={iconBtnStyle} onClick={() => startEdit(i)} title="Bearbeiten">✎</button>
                            <button style={{ ...iconBtnStyle, color: '#e74c3c' }} onClick={() => removeStep(i)} title="Entfernen">✕</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Plus row */}
                {!addingStep && (
                  <tr
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (editIdx !== null) confirmEdit();
                      setAddingStep(true);
                    }}
                  >
                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#007bff', fontSize: '1.3rem', padding: '8px 12px', fontWeight: 'bold' }}>
                      +
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ↑↓ Arrow buttons – visible when a step is in edit mode */}
          {editIdx !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center', minWidth: '36px' }}>
              <button
                style={{ ...arrowBtnStyle, opacity: editIdx > 0 ? 1 : 0.3, cursor: editIdx > 0 ? 'pointer' : 'default' }}
                disabled={editIdx === 0}
                onClick={() => moveStep(editIdx, -1)}
                title="Nach oben"
              >↑</button>
              <button
                style={{ ...arrowBtnStyle, opacity: editIdx < steps.length - 1 ? 1 : 0.3, cursor: editIdx < steps.length - 1 ? 'pointer' : 'default' }}
                disabled={editIdx >= steps.length - 1}
                onClick={() => moveStep(editIdx, 1)}
                title="Nach unten"
              >↓</button>
            </div>
          )}
        </div>

        {/* Add step form */}
        {addingStep && (
          <div style={addStepPanelStyle}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
                <label style={fieldLabelStyle}>Zutat</label>
                <select style={selectStyle} value={newIngUuid} onChange={(e) => setNewIngUuid(e.target.value)}>
                  <option value="">– auswählen –</option>
                  {allIngredients.map((ing) => (
                    <option key={ing.uuid} value={ing.uuid}>
                      {ing.name} ({TYPE_LABELS[ing.type] ?? ing.type})
                    </option>
                  ))}
                </select>
              </div>
              {selectedNewIng?.type === 'LIQUID' && (
                <div>
                  <label style={fieldLabelStyle}>Dauer (ms)</label>
                  <input type="number" min="0" style={{ ...inputStyle, width: '88px' }} value={newDurationMs} onChange={(e) => setNewDurationMs(e.target.value)} />
                </div>
              )}
              {selectedNewIng?.type === 'CRYSTAL' && (
                <div>
                  <label style={fieldLabelStyle}>Umdrehungen</label>
                  <input type="number" min="0" style={{ ...inputStyle, width: '88px' }} value={newRotations} onChange={(e) => setNewRotations(e.target.value)} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  style={{ ...ctrlBtnStyle, backgroundColor: newIngUuid ? '#28a745' : '#adb5bd', cursor: newIngUuid ? 'pointer' : 'not-allowed', padding: '8px 14px', fontSize: '0.85rem' }}
                  disabled={!newIngUuid}
                  onClick={handleAddStep}
                >Hinzufügen</button>
                <button
                  style={{ ...ctrlBtnStyle, backgroundColor: '#6c757d', padding: '8px 14px', fontSize: '0.85rem' }}
                  onClick={() => { setAddingStep(false); setNewIngUuid(''); }}
                >Abbrechen</button>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={controlsRowStyle}>
          <button
            style={{ ...ctrlBtnStyle, flex: 1, backgroundColor: '#6c757d' }}
            onClick={() => setWizardStep(1)}
            disabled={saving}
          >‹ Zurück</button>
          <button
            style={{ ...ctrlBtnStyle, flex: 2, backgroundColor: canSave ? '#28a745' : '#adb5bd', cursor: canSave ? 'pointer' : 'not-allowed' }}
            disabled={!canSave}
            onClick={handleSave}
          >{saving ? '⏳ Speichern…' : '💾 Speichern'}</button>
          <button
            style={{ ...ctrlBtnStyle, flex: 2, backgroundColor: canSave ? '#e67e22' : '#adb5bd', cursor: canSave ? 'pointer' : 'not-allowed' }}
            disabled={!canSave}
            onClick={handleRecord}
          >🎤 Aufzeichnen</button>
        </div>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const screenStyle = {
  width: '100%',
  maxWidth: '640px',
  margin: '0 auto',
  padding: '0 8px',
  boxSizing: 'border-box',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '20px',
  gap: '12px',
};

const badgeStyle = {
  fontSize: '0.72rem',
  letterSpacing: '2px',
  fontWeight: 'bold',
  color: '#007bff',
  marginBottom: '4px',
  textTransform: 'uppercase',
};

const titleStyle = {
  fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
  fontWeight: 'bold',
  color: '#2c3e50',
};

const subtitleStyle = {
  fontSize: '0.9rem',
  color: '#7f8c8d',
  marginTop: '2px',
};

const abortButtonStyle = {
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px solid #6c757d',
  backgroundColor: 'transparent',
  color: '#6c757d',
  fontWeight: 'bold',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontSize: '0.9rem',
};

const cardStyle = {
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

const fieldGroupStyle = {
  marginBottom: '20px',
};

const fieldLabelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 'bold',
  color: '#6c757d',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
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

const selectStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid #ced4da',
  fontSize: '0.9rem',
  color: '#2c3e50',
  boxSizing: 'border-box',
  backgroundColor: '#fff',
};

const tableWrapStyle = {
  borderRadius: '10px',
  border: '1px solid #dee2e6',
  marginBottom: '12px',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.88rem',
};

const thStyle = {
  padding: '9px 10px',
  backgroundColor: '#f8f9fa',
  color: '#495057',
  fontWeight: 'bold',
  textAlign: 'left',
  borderBottom: '1px solid #dee2e6',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const tdStyle = {
  padding: '8px 10px',
  color: '#2c3e50',
  borderBottom: '1px solid #f1f3f5',
  verticalAlign: 'middle',
};

const trEvenStyle = {
  backgroundColor: '#fafbfc',
};

const inlineInputStyle = {
  padding: '4px 8px',
  borderRadius: '6px',
  border: '1px solid #ced4da',
  fontSize: '0.88rem',
  width: '76px',
  boxSizing: 'border-box',
};

const iconBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.95rem',
  color: '#6c757d',
  padding: '2px 4px',
  borderRadius: '4px',
  lineHeight: 1,
};

const arrowBtnStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: '1px solid #dee2e6',
  backgroundColor: '#ffffff',
  color: '#2c3e50',
  fontWeight: 'bold',
  fontSize: '1rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
};

const addStepPanelStyle = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #dee2e6',
  borderRadius: '10px',
  padding: '14px 16px',
  marginTop: '8px',
  marginBottom: '12px',
};

const controlsRowStyle = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  marginTop: 'auto',
  paddingTop: '12px',
};

const ctrlBtnStyle = {
  flex: 1,
  minWidth: '80px',
  padding: '12px 16px',
  borderRadius: '10px',
  border: 'none',
  color: '#ffffff',
  fontWeight: 'bold',
  fontSize: '0.95rem',
  transition: 'background-color 0.2s',
};

const errorBannerStyle = {
  marginBottom: '12px',
  padding: '12px 16px',
  borderRadius: '10px',
  backgroundColor: '#fdeeee',
  border: '1px solid #f1b9b9',
  color: '#992a2a',
  fontSize: '0.9rem',
};

export default RecipeEditWizard;
