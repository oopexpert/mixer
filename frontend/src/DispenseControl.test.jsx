import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DispenseControl from './DispenseControl';

describe('DispenseControl', () => {
  const recipe = { uuid: '1', name: 'Mojito' };

  it('rendert nichts wenn kein Rezept ausgewählt', () => {
    const { container } = render(
      <DispenseControl state="MixerDispense" selectedRecipe={null} token="" setToken={() => {}} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('zeigt Rezeptname', () => {
    render(
      <DispenseControl state="MixerDispense" selectedRecipe={recipe} token="" setToken={() => {}} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText('Mojito')).toBeInTheDocument();
  });

  it('zeigt Eingabefeld wenn nicht locked', () => {
    render(
      <DispenseControl state="MixerDispense" selectedRecipe={recipe} token="" setToken={() => {}} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByPlaceholderText('Dein Rezepttoken')).toBeInTheDocument();
  });

  it('versteckt Eingabefeld wenn locked (MixerDispensing)', () => {
    render(
      <DispenseControl state="MixerDispensing" selectedRecipe={recipe} token="" setToken={() => {}} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.queryByPlaceholderText('Dein Rezepttoken')).not.toBeInTheDocument();
    expect(screen.getByText(/Dein Drink ist in Arbeit/)).toBeInTheDocument();
  });

  it('deaktiviert Mischen-Button ohne Token', () => {
    render(
      <DispenseControl state="MixerDispense" selectedRecipe={recipe} token="" setToken={() => {}} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText(/Jetzt mischen/)).toBeDisabled();
  });

  it('aktiviert Mischen-Button mit Token', () => {
    render(
      <DispenseControl state="MixerDispense" selectedRecipe={recipe} token="ABC" setToken={() => {}} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText(/Jetzt mischen/)).not.toBeDisabled();
  });

  it('ruft onConfirm beim Klick auf Mischen', () => {
    const onConfirm = vi.fn();
    render(
      <DispenseControl state="MixerDispense" selectedRecipe={recipe} token="ABC" setToken={() => {}} onConfirm={onConfirm} onCancel={() => {}} />
    );
    fireEvent.click(screen.getByText(/Jetzt mischen/));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('ruft onCancel beim Klick auf Zurück', () => {
    const onCancel = vi.fn();
    render(
      <DispenseControl state="MixerDispense" selectedRecipe={recipe} token="" setToken={() => {}} onConfirm={() => {}} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText(/Zurück/));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
