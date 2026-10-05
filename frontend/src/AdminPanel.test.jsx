import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import AdminPanel from './AdminPanel';

vi.mock('axios');
vi.mock('./AdminStatusDisplay', () => ({
  default: ({ state, authNotice }) => (
    <div>
      <span>{state}</span>
      {authNotice && <span>{authNotice}</span>}
    </div>
  )
}));
vi.mock('./AdminActions', () => ({
  default: ({ onReloadConfiguration, onStart, onConfirmContainer, onSkipPrime, onPrime, state, isAuthorized, reloadInfoText }) => (
    <div>
      <span>{state}</span>
      <span>{String(isAuthorized)}</span>
      {reloadInfoText && <span>{reloadInfoText}</span>}
      <button onClick={onStart}>System initialisieren</button>
      <button onClick={onConfirmContainer}>Behälter bereit</button>
      <button onClick={onSkipPrime}>Überspringen</button>
      <button onClick={onPrime}>Leitungen spülen</button>
      <button onClick={onReloadConfiguration}>Konfiguration neu laden</button>
    </div>
  )
}));
vi.mock('./HardwareControl', () => ({
  default: ({ onControl, isBusy, currentControlRequest }) => (
    <div>
      <button onClick={() => onControl('COM3', 'on', '1200')}>Pulse COM3</button>
      <button onClick={() => onControl('COM3', 'on', '   ')}>Switch COM3 on</button>
      <button onClick={() => onControl('COM3', 'on', 'abc')}>Pulse invalid COM3</button>
      <button onClick={() => onControl('COM3', 'on', '25000')}>Pulse capped COM3</button>
      <button onClick={() => onControl('COM3', 'off', '1500')}>Switch COM3 off</button>
      {isBusy && <span>Hardware busy</span>}
      {currentControlRequest && <span>{currentControlRequest.mode}</span>}
    </div>
  )
}));
vi.mock('./TokenManagement', () => ({
  default: ({ tokens }) => <div>TokenManagement:{Array.isArray(tokens) ? tokens.length : 'invalid'}</div>
}));

const createStatusResponse = (state = 'MixerDispense', message = 'System bereit.') => ({
  data: { state, message }
});

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    axios.get.mockImplementation((url) => {
      if (url === '/user/status') {
        return Promise.resolve(createStatusResponse());
      }

      if (url === '/user/wait-for-idle') {
        return Promise.resolve(createStatusResponse());
      }

      if (url.includes('/admin/list-active-tokens')) {
        return Promise.resolve({ data: [] });
      }

      if (url.includes('/admin/com-ports')) {
        return Promise.resolve({ data: [] });
      }

      if (url.includes('/admin/ingredients')) {
        return Promise.resolve({ data: [
          { ingredientUuid: 'id-vodka', name: 'Vodka' },
          { ingredientUuid: 'id-tonic', name: 'Tonic' }
        ] });
      }

      if (url.includes('/user/require-recipe-token')) {
        return Promise.resolve({ data: { requireRecipeToken: true } });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    axios.post.mockResolvedValue(createStatusResponse('MixerDispense', 'Konfiguration erfolgreich geladen.'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('zeigt fuer ausgeschaltetes System den passenden Reload-Hinweis', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/user/status') {
        return Promise.resolve(createStatusResponse('Initial', 'System bereit.'));
      }

      if (url === '/user/wait-for-idle') {
        return Promise.resolve(createStatusResponse('Initial', 'System bereit.'));
      }

      if (url.includes('/admin/list-active-tokens')) {
        return Promise.resolve({ data: [] });
      }

      if (url.includes('/admin/com-ports')) {
        return Promise.resolve({ data: [] });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<AdminPanel adminToken="secret-token" />);

    expect(await screen.findByText(/System ist aus: Reload aktualisiert nur die Konfiguration/i)).toBeInTheDocument();
  });

  it('zeigt fuer RequestPrimingContainer den aktualisierten Reload-Hinweis', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/user/status') {
        return Promise.resolve(createStatusResponse('RequestPrimingContainer', 'Kalibrierung gestartet.'));
      }

      if (url === '/user/wait-for-idle') {
        return Promise.resolve(createStatusResponse('RequestPrimingContainer', 'Kalibrierung gestartet.'));
      }

      if (url.includes('/admin/list-active-tokens')) {
        return Promise.resolve({ data: [] });
      }

      if (url.includes('/admin/com-ports')) {
        return Promise.resolve({ data: [] });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<AdminPanel adminToken="secret-token" />);

    expect(await screen.findByText(/Kalibrierung aktiv: Reload aktualisiert die Konfiguration auch waehrend der Behaelter-Vorbereitung und laedt anschliessend die COM-Ports neu/i)).toBeInTheDocument();
  });

  it('sendet Reload-Request, zeigt Toast, aktualisiert Status und refreshed Ports im Idle-State', async () => {
    render(<AdminPanel adminToken="secret-token" />);

    expect(await screen.findByText(/System ist bereit: Reload aktualisiert die Konfiguration/i)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Konfiguration neu laden/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/admin/reload-configuration?adminToken=secret-token');
    });

    // Toast sichtbar (über data-testid)
    const toast = await screen.findByTestId('reload-toast');
    expect(toast).toBeInTheDocument();
    // Toast hat fixed style
    expect(toast).toHaveStyle({ position: 'fixed' });

    // Kein zusätzliches Panel im Hauptbereich (Toast-Verschwinden wird separat getestet)

    await waitFor(() => {
      const statusCalls = axios.get.mock.calls.filter(([url]) => url === '/user/status');
      expect(statusCalls.length).toBeGreaterThanOrEqual(2);
    });

    await waitFor(() => {
      const portCalls = axios.get.mock.calls.filter(([url]) => String(url).includes('/admin/com-ports'));
      expect(portCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('blendet den Reload-Toast nach 3 Sekunden automatisch aus', async () => {
    // Mit echten Timern rendern, damit findByRole/findByTestId nicht hängt
    render(<AdminPanel adminToken="secret-token" />);
    // Warten bis Button bereit ist (echte Timer)
    const button = await screen.findByRole('button', { name: /Konfiguration neu laden/i });

    // Erst jetzt auf Fake-Timer umschalten (betrifft nur den setTimeout im Component)
    vi.useFakeTimers();

    fireEvent.click(button);

    // Axios-Promise (Microtask) abarbeiten lassen
    await act(async () => {});

    expect(screen.getByTestId('reload-toast')).toBeInTheDocument();

    // 3 Sekunden simulieren → Toast-Timeout feuert
    act(() => { vi.advanceTimersByTime(3100); });
    await act(async () => {});

    expect(screen.queryByTestId('reload-toast')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('zeigt Backend-Fehlertext im Busy-State und refreshed die Portliste nicht blind', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/user/status') {
        return Promise.resolve(createStatusResponse());
      }

      if (url.includes('/admin/list-active-tokens')) {
        return Promise.resolve({ data: [] });
      }

      if (url.includes('/admin/com-ports')) {
        return Promise.resolve({ data: [] });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    axios.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          state: 'MixerDispensing',
          message: 'Konfiguration kann nur im Idle-Modus neu geladen werden.'
        }
      }
    });

    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Konfiguration neu laden/i }));

    const errorToast = await screen.findByTestId('reload-toast');
    expect(errorToast).toBeInTheDocument();
    expect(screen.getByTestId('reload-toast-title')).toHaveTextContent('Reload fehlgeschlagen');
    expect(screen.getByTestId('reload-toast-message')).toHaveTextContent('Konfiguration kann nur im Idle-Modus neu geladen werden.');

    expect(screen.getByText(/System ist aktuell beschaeftigt: Reload wird serverseitig mit HTTP 400 abgelehnt/i)).toBeInTheDocument();

    const portCalls = axios.get.mock.calls.filter(([url]) => String(url).includes('/admin/com-ports'));
    expect(portCalls.length).toBe(1);
  });

  it('refresht Ports nach erfolgreichem Reload nicht, wenn der aktualisierte Status Initial ist', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/user/status') {
        return Promise.resolve(createStatusResponse('Initial', 'System bereit.'));
      }

      if (url === '/user/wait-for-idle') {
        return Promise.resolve(createStatusResponse('Initial', 'System bereit.'));
      }

      if (url.includes('/admin/list-active-tokens')) {
        return Promise.resolve({ data: [] });
      }

      if (url.includes('/admin/com-ports')) {
        return Promise.resolve({ data: [] });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    axios.post.mockResolvedValueOnce(createStatusResponse('Initial', 'Konfiguration aktualisiert.'));

    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Konfiguration neu laden/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Konfiguration aktualisiert.');
    });

    const portCalls = axios.get.mock.calls.filter(([url]) => String(url).includes('/admin/com-ports'));
    expect(portCalls.length).toBe(1);
  });

  it('nutzt bei leerer Dauer weiterhin den regulaeren ON-Endpunkt', async () => {
    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Switch COM3 on/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/admin/com-ports/COM3/on?adminToken=secret-token');
    });
  });

  it('nutzt fuer ON mit Dauer den Puls-Endpunkt', async () => {
    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Pulse COM3/i }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/user/wait-for-idle', undefined);
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/admin/com-ports/COM3/pulse', null, {
        params: {
          adminToken: 'secret-token',
          durationMs: 1200
        }
      });
    });
  });

  it('normalisiert ungueltige Dauer auf 500 Millisekunden', async () => {
    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Pulse invalid COM3/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/admin/com-ports/COM3/pulse', null, {
        params: {
          adminToken: 'secret-token',
          durationMs: 500
        }
      });
    });
  });

  it('begrenzt die Dauer auf maximal 20000 Millisekunden', async () => {
    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Pulse capped COM3/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/admin/com-ports/COM3/pulse', null, {
        params: {
          adminToken: 'secret-token',
          durationMs: 20000
        }
      });
    });
  });

  it('zeigt bei 404 einen Port-Fehler fuer die Direktsteuerung', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          message: 'Port COM3 wurde nicht gefunden.'
        }
      }
    });

    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Pulse COM3/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Port COM3 wurde nicht gefunden.');
    });
  });

  it('entzieht bei 401 den Admin-Zugriff und zeigt den Auth-Hinweis', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          message: 'Admin-Token ist ungueltig.'
        }
      }
    });

    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Pulse COM3/i }));

    await waitFor(() => {
      expect(screen.getByText(/Admin-Token ungueltig oder abgelaufen/i)).toBeInTheDocument();
    });
  });

  it('wartet bei 409 erneut auf idle und versucht den Puls danach noch einmal', async () => {
    axios.post
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            message: 'Mixer ist beschaeftigt.'
          }
        }
      })
      .mockResolvedValueOnce(createStatusResponse('MixerDispense', 'Puls erfolgreich.'));

    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Pulse COM3/i }));

    await waitFor(() => {
      const idleCalls = axios.get.mock.calls.filter(([url]) => url === '/user/wait-for-idle');
      expect(idleCalls.length).toBeGreaterThanOrEqual(2);
    });

    await waitFor(() => {
      const pulseCalls = axios.post.mock.calls.filter(([url]) => url === '/admin/com-ports/COM3/pulse');
      expect(pulseCalls.length).toBe(2);
    });
  });

  it('zeigt bei 400 einen Hinweis, dass der Port nicht geoeffnet ist', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'Port COM3 ist nicht geoeffnet.'
        }
      }
    });

    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(await screen.findByRole('button', { name: /Pulse COM3/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Port COM3 ist nicht geoeffnet.');
    });
  });

  it('pollt Tokens nicht im Zustand RequestPrimingContainer', async () => {
    const intervalSpy = vi.spyOn(globalThis, 'setInterval');

    axios.get.mockImplementation((url) => {
      if (url === '/user/status') {
        return Promise.resolve(createStatusResponse('RequestPrimingContainer', 'Kalibrierung gestartet.'));
      }

      if (url === '/user/wait-for-idle') {
        return Promise.resolve(createStatusResponse('RequestPrimingContainer', 'Kalibrierung gestartet.'));
      }

      if (url.includes('/admin/com-ports')) {
        return Promise.resolve({ data: [] });
      }

      if (url.includes('/admin/list-active-tokens')) {
        return Promise.resolve({ data: [] });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<AdminPanel adminToken="secret-token" />);

    await screen.findAllByText('RequestPrimingContainer');

    const tokenCalls = axios.get.mock.calls.filter(([url]) => String(url).includes('/admin/list-active-tokens'));
    const pollingIntervals = intervalSpy.mock.calls.filter(([, delay]) => delay === 10000);
    expect(tokenCalls.length).toBe(0);
    expect(pollingIntervals.length).toBe(0);
  });

  it('pollt Tokens nur im Zustand MixerDispense', async () => {
    const intervalSpy = vi.spyOn(globalThis, 'setInterval');

    render(<AdminPanel adminToken="secret-token" />);

    await screen.findAllByText('MixerDispense');

    await waitFor(() => {
      const tokenCalls = axios.get.mock.calls.filter(([url]) => String(url).includes('/admin/list-active-tokens'));
      expect(tokenCalls.length).toBe(1);
    });

    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
  });

  it('laedt nach Start in RequestPrimingContainer keine Tokens nach', async () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    axios.get.mockImplementation((url) => {
      if (url === '/user/status') {
        return Promise.resolve(createStatusResponse('Initial', 'System bereit.'));
      }

      if (url.includes('/admin/com-ports')) {
        return Promise.resolve({ data: [] });
      }

      if (url.includes('/admin/list-active-tokens')) {
        return Promise.resolve({ data: [] });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    axios.post.mockResolvedValueOnce(createStatusResponse('RequestPrimingContainer', 'Kalibrierung gestartet.'));

    render(<AdminPanel adminToken="secret-token" />);

    fireEvent.click(screen.getByRole('button', { name: /System initialisieren/i }));

    await Promise.resolve();

    expect(axios.post).toHaveBeenCalledWith('/admin/start?adminToken=secret-token');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await Promise.resolve();

    const tokenCalls = axios.get.mock.calls.filter(([url]) => String(url).includes('/admin/list-active-tokens'));
    expect(tokenCalls.length).toBe(0);
  });

  it('entzieht bei Token-Fehler 500 nicht den Admin-Zugriff', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/user/status') {
        return Promise.resolve(createStatusResponse('MixerDispense', 'System bereit.'));
      }

      if (url === '/user/wait-for-idle') {
        return Promise.resolve(createStatusResponse('MixerDispense', 'System bereit.'));
      }

      if (url.includes('/admin/com-ports')) {
        return Promise.resolve({ data: [] });
      }

      if (url.includes('/admin/list-active-tokens')) {
        return Promise.reject({
          response: {
            status: 500,
            data: {
              message: 'Interner Fehler'
            }
          }
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<AdminPanel adminToken="secret-token" />);

    await screen.findAllByText('MixerDispense');

    await waitFor(() => {
      const tokenCalls = axios.get.mock.calls.filter(([url]) => String(url).includes('/admin/list-active-tokens'));
      expect(tokenCalls.length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.queryByText(/Nur fuer Administratoren verfuegbar/i)).not.toBeInTheDocument();
  });

});