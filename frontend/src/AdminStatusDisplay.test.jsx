import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminStatusDisplay, { getStatusColor, getStatusText } from './AdminStatusDisplay';

describe('AdminStatusDisplay', () => {
  it('zeigt den Status-Text für MixerDispense', () => {
    render(<AdminStatusDisplay state="MixerDispense" />);
    expect(screen.getByText('System bereit für Abfüllung')).toBeInTheDocument();
  });

  it('zeigt den Status-Text für Initial', () => {
    render(<AdminStatusDisplay state="Initial" />);
    expect(screen.getByText('System aus')).toBeInTheDocument();
  });

  it('zeigt den Status-Text für Priming', () => {
    render(<AdminStatusDisplay state="Priming" />);
    expect(screen.getByText('Leitungen werden gespült')).toBeInTheDocument();
  });

  it('zeigt authNotice wenn vorhanden', () => {
    render(<AdminStatusDisplay state="Initial" authNotice="Testhinweis" />);
    expect(screen.getByText('Testhinweis')).toBeInTheDocument();
  });

  it('zeigt keine authNotice wenn leer', () => {
    render(<AdminStatusDisplay state="Initial" />);
    expect(screen.queryByText('Testhinweis')).not.toBeInTheDocument();
  });

  it('zeigt SYSTEM-STATUS Label', () => {
    render(<AdminStatusDisplay state="Initial" />);
    expect(screen.getByText('SYSTEM-STATUS')).toBeInTheDocument();
  });
});

describe('getStatusColor', () => {
  it('gibt grün für MixerDispense', () => {
    expect(getStatusColor('MixerDispense')).toBe('#27ae60');
  });

  it('gibt orange für Priming', () => {
    expect(getStatusColor('Priming')).toBe('#f39c12');
  });

  it('gibt rot für Error', () => {
    expect(getStatusColor('Error')).toBe('#e74c3c');
  });

  it('gibt grau für unbekannten Status', () => {
    expect(getStatusColor('Unknown')).toBe('#95a5a6');
  });
});

describe('getStatusText', () => {
  it('gibt korrekten Text für MixerDispensing', () => {
    expect(getStatusText('MixerDispensing')).toBe('System füllt ab');
  });

  it('gibt Unbekannter Status für unbekannten Wert', () => {
    expect(getStatusText('FooBar')).toBe('Unbekannter Status: FooBar');
  });
});
