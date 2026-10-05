import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ManualIngredientDialog from './ManualIngredientDialog';

describe('ManualIngredientDialog', () => {
  it('rendert nichts wenn ingredient null', () => {
    const { container } = render(<ManualIngredientDialog ingredient={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('zeigt Zutatname', () => {
    render(
      <ManualIngredientDialog
        ingredient={{ name: 'Zitronensaft', uuid: '123' }}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Zitronensaft')).toBeInTheDocument();
  });

  it('zeigt Unbekannte Zutat wenn kein Name', () => {
    render(
      <ManualIngredientDialog
        ingredient={{ uuid: '123' }}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Unbekannte Zutat')).toBeInTheDocument();
  });

  it('zeigt Fehlermeldung', () => {
    render(
      <ManualIngredientDialog
        ingredient={{ name: 'Test', uuid: '123' }}
        error="Fehler aufgetreten"
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Fehler aufgetreten')).toBeInTheDocument();
  });

  it('zeigt syncError Warnung', () => {
    render(
      <ManualIngredientDialog
        ingredient={{ name: 'Test', uuid: '123' }}
        syncError="Verbindungsfehler"
        onConfirm={() => {}}
        onRetry={() => {}}
      />
    );
    expect(screen.getByText('Verbindungsfehler')).toBeInTheDocument();
  });

  it('zeigt Retry-Button bei syncError', () => {
    const onRetry = vi.fn();
    render(
      <ManualIngredientDialog
        ingredient={{ name: 'Test', uuid: '123' }}
        syncError="Verbindungsfehler"
        onConfirm={() => {}}
        onRetry={onRetry}
      />
    );
    fireEvent.click(screen.getByText('Erneut versuchen'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('deaktiviert Bestätigen-Button ohne uuid', () => {
    render(
      <ManualIngredientDialog
        ingredient={{ name: 'Test' }}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Zutat hinzugefuegt - bestaetigen')).toBeDisabled();
  });

  it('ruft onConfirm beim Klick auf', () => {
    const onConfirm = vi.fn();
    render(
      <ManualIngredientDialog
        ingredient={{ name: 'Test', uuid: '123' }}
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByText('Zutat hinzugefuegt - bestaetigen'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('verlangt Sicherheitsbestaetigung, wenn danach automatisch weiter abgefuellt wird', () => {
    const onConfirm = vi.fn();

    render(
      <ManualIngredientDialog
        ingredient={{ name: 'Test', uuid: '123', hasNextAutomaticDispenseStep: true }}
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByText('Zutat hinzugefuegt - bestaetigen');
    expect(screen.getByText(/Ich habe das Glas wieder korrekt positioniert/i)).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/Ich habe das Glas wieder korrekt positioniert/i));

    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('zeigt die Sicherheitsabfrage nicht ohne nachfolgenden automatischen Schritt', () => {
    render(
      <ManualIngredientDialog
        ingredient={{ name: 'Test', uuid: '123', hasNextAutomaticDispenseStep: false }}
        onConfirm={() => {}}
      />
    );

    expect(screen.queryByText(/Ich habe das Glas wieder korrekt positioniert/i)).not.toBeInTheDocument();
  });
});
