import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DispenseErrorDialog from './DispenseErrorDialog';

describe('DispenseErrorDialog', () => {
  it('rendert nichts wenn error leer', () => {
    const { container } = render(<DispenseErrorDialog error="" onDismiss={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('rendert nichts wenn error null', () => {
    const { container } = render(<DispenseErrorDialog error={null} onDismiss={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('zeigt Fehlermeldung', () => {
    render(<DispenseErrorDialog error="Token ungültig" onDismiss={() => {}} />);
    expect(screen.getByText('Token ungültig')).toBeInTheDocument();
    expect(screen.getByText('Token nicht gefunden')).toBeInTheDocument();
  });

  it('ruft onDismiss beim Klick auf Verstanden', () => {
    const onDismiss = vi.fn();
    render(<DispenseErrorDialog error="Token ungültig" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Verstanden'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
