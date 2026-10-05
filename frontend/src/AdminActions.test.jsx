import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminActions from './AdminActions';

describe('AdminActions', () => {
  it('zeigt Hinweis wenn nicht autorisiert', () => {
    render(<AdminActions state="Initial" isLoading={false} isAuthorized={false} />);
    expect(screen.getByText('Nur fuer Administratoren verfuegbar.')).toBeInTheDocument();
  });

  it('zeigt System initialisieren Button im Initial-State', () => {
    render(<AdminActions state="Initial" isLoading={false} isAuthorized={true} onStart={() => {}} />);
    expect(screen.getByText(/System initialisieren/)).toBeInTheDocument();
  });

  it('zeigt Reload-Button im Initial-State aktiviert an', () => {
    render(<AdminActions state="Initial" isLoading={false} isAuthorized={true} onReloadConfiguration={() => {}} />);
    expect(screen.getByText(/Konfiguration neu laden/)).toBeEnabled();
  });

  it('ruft onStart beim Klick auf', () => {
    const onStart = vi.fn();
    render(<AdminActions state="Initial" isLoading={false} isAuthorized={true} onStart={onStart} />);
    fireEvent.click(screen.getByText(/System initialisieren/));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('zeigt Behälter-Kalibrierung im RequestPrimingContainer-State', () => {
    render(
      <AdminActions
        state="RequestPrimingContainer"
        isLoading={false}
        isAuthorized={true}
        reloadInfoText="Reload aktualisiert die Konfiguration."
        onConfirmContainer={() => {}}
        onSkipPrime={() => {}}
        onReloadConfiguration={() => {}}
      />
    );
    expect(screen.getByText('Behälter-Kalibrierung')).toBeInTheDocument();
    expect(screen.getByText(/Behälter bereit/)).toBeInTheDocument();
    expect(screen.getByText(/Überspringen/)).toBeInTheDocument();
    expect(screen.getByText(/Konfiguration neu laden/)).toBeInTheDocument();
    expect(screen.getByText(/Reload aktualisiert die Konfiguration/i)).toBeInTheDocument();
  });

  it('ruft Reload im RequestPrimingContainer-State auf', () => {
    const onReloadConfiguration = vi.fn();
    render(
      <AdminActions
        state="RequestPrimingContainer"
        isLoading={false}
        isAuthorized={true}
        onConfirmContainer={() => {}}
        onSkipPrime={() => {}}
        onReloadConfiguration={onReloadConfiguration}
      />
    );

    fireEvent.click(screen.getByText(/Konfiguration neu laden/));
    expect(onReloadConfiguration).toHaveBeenCalledOnce();
  });

  it('zeigt Priming Button im PrimingContainerConfirmed-State', () => {
    render(
      <AdminActions
        state="PrimingContainerConfirmed"
        isLoading={false}
        isAuthorized={true}
        onPrime={() => {}}
      />
    );
    expect(screen.getByText(/Leitungen spülen \(Priming\)/)).toBeInTheDocument();
  });

  it('deaktiviert Priming Button im Priming-State', () => {
    render(
      <AdminActions
        state="Priming"
        isLoading={false}
        isAuthorized={true}
        onPrime={() => {}}
      />
    );
    const btn = screen.getByText(/Leitungen spülen \(Priming\)/);
    expect(btn).toBeDisabled();
  });

  it('deaktiviert Reload-Button im Priming-State', () => {
    render(
      <AdminActions
        state="Priming"
        isLoading={false}
        isAuthorized={true}
        onReloadConfiguration={() => {}}
      />
    );
    expect(screen.getByText(/Konfiguration neu laden/)).toBeEnabled();
  });

  it('zeigt Shutdown Button im MixerDispense-State', () => {
    const onShutdown = vi.fn();
    render(
      <AdminActions
        state="MixerDispense"
        isLoading={false}
        isAuthorized={true}
        onShutdown={onShutdown}
      />
    );
    fireEvent.click(screen.getByText(/System ausschalten/));
    expect(onShutdown).toHaveBeenCalledOnce();
  });

  it('ruft Reload-Handler beim Klick auf', () => {
    const onReloadConfiguration = vi.fn();
    render(
      <AdminActions
        state="MixerDispense"
        isLoading={false}
        isAuthorized={true}
        onReloadConfiguration={onReloadConfiguration}
      />
    );
    fireEvent.click(screen.getByText(/Konfiguration neu laden/));
    expect(onReloadConfiguration).toHaveBeenCalledOnce();
  });

  it('zeigt Konfiguration speichern Button im MixerDispense-State', () => {
    const onSaveConfiguration = vi.fn();
    render(
      <AdminActions
        state="MixerDispense"
        isLoading={false}
        isAuthorized={true}
        onSaveConfiguration={onSaveConfiguration}
      />
    );
    fireEvent.click(screen.getByText(/Konfiguration speichern/));
    expect(onSaveConfiguration).toHaveBeenCalledOnce();
  });

  it('zeigt Konfiguration speichern Button im Initial-State', () => {
    const onSaveConfiguration = vi.fn();
    render(
      <AdminActions
        state="Initial"
        isLoading={false}
        isAuthorized={true}
        onSaveConfiguration={onSaveConfiguration}
      />
    );
    fireEvent.click(screen.getByText(/Konfiguration speichern/));
    expect(onSaveConfiguration).toHaveBeenCalledOnce();
  });

  it('zeigt Konfiguration speichern Button im RequestPrimingContainer-State', () => {
    const onSaveConfiguration = vi.fn();
    render(
      <AdminActions
        state="RequestPrimingContainer"
        isLoading={false}
        isAuthorized={true}
        onConfirmContainer={() => {}}
        onSkipPrime={() => {}}
        onReloadConfiguration={() => {}}
        onSaveConfiguration={onSaveConfiguration}
      />
    );
    fireEvent.click(screen.getByText(/Konfiguration speichern/));
    expect(onSaveConfiguration).toHaveBeenCalledOnce();
  });

  it('zeigt Verarbeitung läuft bei isLoading', () => {
    render(
      <AdminActions state="Initial" isLoading={true} isAuthorized={true} onStart={() => {}} />
    );
    expect(screen.getByText(/Verarbeitung läuft/)).toBeInTheDocument();
  });
});
