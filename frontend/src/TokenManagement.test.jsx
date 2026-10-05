import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TokenManagement from './TokenManagement';

describe('TokenManagement', () => {
  it('zeigt neues Token wenn vorhanden', () => {
    render(<TokenManagement tokens={[]} newToken="ABC123" onGenerate={() => {}} onRefresh={() => {}} />);
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText('Geben Sie diesen Code dem Gast:')).toBeInTheDocument();
  });

  it('zeigt Token-Liste', () => {
    render(<TokenManagement tokens={['T1', 'T2', 'T3']} newToken="" onGenerate={() => {}} onRefresh={() => {}} />);
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('T2')).toBeInTheDocument();
    expect(screen.getByText('T3')).toBeInTheDocument();
  });

  it('zeigt Hinweis wenn keine Tokens', () => {
    render(<TokenManagement tokens={[]} newToken="" onGenerate={() => {}} onRefresh={() => {}} />);
    expect(screen.getByText('Keine Tokens aktiv.')).toBeInTheDocument();
  });

  it('ruft onGenerate beim Klick auf', () => {
    const onGenerate = vi.fn();
    render(<TokenManagement tokens={[]} newToken="" onGenerate={onGenerate} onRefresh={() => {}} />);
    fireEvent.click(screen.getByText(/Neues Token generieren/));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it('ruft onRefresh beim Klick auf', () => {
    const onRefresh = vi.fn();
    render(<TokenManagement tokens={[]} newToken="" onGenerate={() => {}} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText(/Liste aktualisieren/));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
