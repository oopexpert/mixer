package mixer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import mixer.port.PortAdapter;
import mixer.recording.RecordingSession;
import mixer.recording.RecordingStep;

/**
 * State: Admin führt gerade eine Rezeptaufzeichnung durch.
 *
 * Pro Zutat (Schritt) kann der Admin den Port beliebig oft ein- und ausschalten.
 * Erst mit "Weiter" ({@link #nextRecordingIngredient(Mixer)}) wird zum nächsten Schritt
 * vorgerückt. Nach dem letzten Schritt wechselt der Mixer zurück in den {@code resumeState}
 * (typischerweise {@link MixerDispenseState}) und die Session ist abschlussbereit.
 */
class RecordingIngredientState implements MixerStateInternal {

    private static final Logger log = LoggerFactory.getLogger(RecordingIngredientState.class);

    private final RecordingSession session;
    private final MixerStateInternal resumeState;

    public RecordingIngredientState(RecordingSession session, MixerStateInternal resumeState) {
        this.session = session;
        this.resumeState = resumeState;
    }

    @Override
    public String getDescription() {
        RecordingStep step = session.getCurrentStep();
        if (step == null) {
            return "Aufzeichnungsmodus: alle Schritte abgeschlossen.";
        }
        return String.format("Aufzeichnungsmodus: Schritt %d/%d – Zutat '%s' (Port: %s)",
                session.getCurrentStepIndex() + 1, session.getTotalSteps(),
                step.getIngredientName(), step.getPortName());
    }

    @Override
    public void startRecordingIngredient(Mixer mixer) {
        RecordingStep step = session.getCurrentStep();
        if (step == null) {
            throw new IllegalStateException("Kein aktiver Aufzeichnungsschritt vorhanden.");
        }
        PortAdapter port = mixer.getOrOpenPort(step.getPortName());
        if (port == null) {
            throw new IllegalStateException("Port '" + step.getPortName() + "' nicht verfügbar.");
        }
        step.startCycle();
        port.start();
        log.debug("Aufzeichnung: Port '{}' für Zutat '{}' eingeschaltet (Zyklus {}).",
                step.getPortName(), step.getIngredientName(), step.getCycleCount());
    }

    @Override
    public void stopRecordingIngredient(Mixer mixer) {
        RecordingStep step = session.getCurrentStep();
        if (step == null) {
            throw new IllegalStateException("Kein aktiver Aufzeichnungsschritt vorhanden.");
        }
        if (!step.isPortCurrentlyOn()) {
            throw new IllegalStateException("Port '" + step.getPortName() + "' ist nicht eingeschaltet.");
        }
        PortAdapter port = mixer.getOrOpenPort(step.getPortName());
        if (port != null) {
            try { port.stop(); } catch (Exception e) {
                log.warn("Fehler beim Stoppen von Port '{}': {}", step.getPortName(), e.getMessage());
            }
        }
        step.stopCycle();
        log.debug("Aufzeichnung: Port '{}' für Zutat '{}' ausgeschaltet. Akkumuliert: {}ms.",
                step.getPortName(), step.getIngredientName(), step.getTotalDurationMs());
    }

    @Override
    public void nextRecordingIngredient(Mixer mixer) {
        RecordingStep step = session.getCurrentStep();
        // Auto-Stop falls Port noch eingeschaltet ist
        if (step != null && step.isPortCurrentlyOn()) {
            PortAdapter port = mixer.getOrOpenPort(step.getPortName());
            if (port != null) {
                try { port.stop(); } catch (Exception e) {
                    log.warn("Auto-Stop beim Vorwärts-Schalten fehlgeschlagen für Port '{}': {}",
                            step.getPortName(), e.getMessage());
                }
            }
            step.stopCycle();
            log.debug("Aufzeichnung: Auto-Stop für Port '{}' beim Weiterschalten.", step.getPortName());
        }
        RecordingStep nextStep = session.advance();
        if (nextStep == null) {
            log.info("Aufzeichnung abgeschlossen. Session '{}' bereit zum Speichern.", session.getSessionId());
            mixer.setState(resumeState);
        } else {
            log.debug("Aufzeichnung: weiter zu Schritt {}/{} – Zutat '{}'.",
                    session.getCurrentStepIndex() + 1, session.getTotalSteps(), nextStep.getIngredientName());
            // Gleiche State-Instanz, Session hat sich intern weiterentwickelt
        }
    }

    @Override
    public void abortRecording(Mixer mixer) {
        RecordingStep step = session.getCurrentStep();
        if (step != null && step.isPortCurrentlyOn()) {
            PortAdapter port = mixer.getOrOpenPort(step.getPortName());
            if (port != null) {
                try { port.stop(); } catch (Exception e) {
                    log.warn("Abort: Stop für Port '{}' fehlgeschlagen: {}", step.getPortName(), e.getMessage());
                }
            }
            step.stopCycle();
        }
        mixer.clearRecordingSession();
        mixer.setState(resumeState);
        log.info("Aufzeichnung abgebrochen.");
    }

    public RecordingSession getSession() {
        return session;
    }
}
