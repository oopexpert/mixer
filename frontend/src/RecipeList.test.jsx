import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeList from './RecipeList';

describe('RecipeList', () => {
  const recipes = [
    { uuid: '1', name: 'Mojito' },
    { uuid: '2', name: 'Caipirinha' },
    { uuid: '3', name: 'Gin Tonic' }
  ];

  it('zeigt alle Rezepte', () => {
    render(<RecipeList recipes={recipes} onSelect={() => {}} isLocked={false} />);
    expect(screen.getByText('Mojito')).toBeInTheDocument();
    expect(screen.getByText('Caipirinha')).toBeInTheDocument();
    expect(screen.getByText('Gin Tonic')).toBeInTheDocument();
  });

  it('zeigt Fehlermeldung bei leerer Liste', () => {
    render(<RecipeList recipes={[]} onSelect={() => {}} isLocked={false} />);
    expect(screen.getByText(/Keine Rezepte gefunden/)).toBeInTheDocument();
  });

  it('ruft onSelect mit dem Rezept auf', () => {
    const onSelect = vi.fn();
    render(<RecipeList recipes={recipes} onSelect={onSelect} isLocked={false} />);
    fireEvent.click(screen.getByText('Mojito'));
    expect(onSelect).toHaveBeenCalledWith(recipes[0]);
  });

  it('zeigt Locked-Hinweis wenn gesperrt', () => {
    render(<RecipeList recipes={recipes} onSelect={() => {}} isLocked={true} />);
    expect(screen.getByText(/System ist gerade beschäftigt/)).toBeInTheDocument();
  });
});
