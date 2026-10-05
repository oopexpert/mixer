it('zeigt die richtige Zutat in der Combobox anhand von ingredientUuid', () => {
  const mockPorts = [
    { portName: 'COM3', ingredientName: 'Vodka', ingredientUuid: 'id-vodka' },
    { portName: 'COM4', ingredientName: 'Tonic', ingredientUuid: 'id-tonic' }
  ];
  const mockIngredients = [
    { uuid: 'id-vodka', name: 'Vodka' },
    { uuid: 'id-tonic', name: 'Tonic' }
  ];
  render(
    <HardwareControl
      ports={mockPorts}
      activePorts={{}}
      onControl={() => {}}
      ingredients={mockIngredients}
      onMapIngredient={() => {}}
    />
  );
  const selects = screen.getAllByRole('combobox');
  expect(selects[0].value).toBe('id-vodka');
  expect(selects[1].value).toBe('id-tonic');
});

it('zeigt "Keine Zutat" wenn ingredientUuid leer ist', () => {
  const mockPorts = [
    { portName: 'COM5', ingredientName: null, ingredientUuid: '' }
  ];
  const mockIngredients = [
    { uuid: 'id-vodka', name: 'Vodka' }
  ];
  render(
    <HardwareControl
      ports={mockPorts}
      activePorts={{}}
      onControl={() => {}}
      ingredients={mockIngredients}
      onMapIngredient={() => {}}
    />
  );
  const select = screen.getByRole('combobox');
  expect(select.value).toBe('');
  expect(screen.getByText('— Keine Zutat —')).toBeInTheDocument();
});
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HardwareControl from './HardwareControl';

describe('HardwareControl', () => {
  const mockPorts = [
    { portName: 'COM3', ingredientName: 'Vodka' },
    { portName: 'COM4', ingredientName: null }
  ];

  const renderHardwareControl = (props = {}) => render(
    <HardwareControl
      ports={mockPorts}
      activePorts={{}}
      onControl={() => {}}
      {...props}
    />
  );

  it('zeigt alle Ports', () => {
    renderHardwareControl();
    expect(screen.getByText('COM3')).toBeInTheDocument();
    expect(screen.getByText('COM4')).toBeInTheDocument();
  });

  it('zeigt Zutatnamen wenn vorhanden', () => {
    renderHardwareControl();
    expect(screen.getByText('Vodka')).toBeInTheDocument();
    expect(screen.getByText('Keine Zutat zugewiesen')).toBeInTheDocument();
  });

  it('ruft onControl mit leerer Dauer fuer regulaeres Schalten auf', () => {
    const onControl = vi.fn();
    renderHardwareControl({ onControl });
    const onButtons = screen.getAllByText('ON');
    fireEvent.click(onButtons[0]);
    expect(onControl).toHaveBeenCalledWith('COM3', 'on', '');
  });

  it('uebergibt eingegebene Millisekunden an die Schaltaktion', () => {
    const onControl = vi.fn();
    renderHardwareControl({ onControl });

    fireEvent.change(screen.getByLabelText('Pulsdauer fuer COM3'), { target: { value: '1200' } });
    fireEvent.click(screen.getAllByText('ON')[0]);

    expect(onControl).toHaveBeenCalledWith('COM3', 'on', '1200');
  });

  it('deaktiviert Buttons und Eingabe waehrend einer laufenden Direktsteuerung', () => {
    renderHardwareControl({
      isBusy: true,
      currentControlRequest: { port: 'COM3', state: 'on', mode: 'pulse' }
    });

    expect(screen.getByLabelText('Pulsdauer fuer COM3')).toBeDisabled();
    expect(screen.getByText('PULSE...')).toBeDisabled();
    expect(screen.getAllByText('OFF')[0]).toBeDisabled();
  });

  it('zeigt Hinweis bei leerer Port-Liste', () => {
    render(<HardwareControl ports={[]} activePorts={{}} onControl={() => {}} />);
    expect(screen.getByText('Suche nach Hardware...')).toBeInTheDocument();
  });
});
