import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusPanel from './StatusPanel';

describe('StatusPanel', () => {
  const defaultStatus = { state: 'MixerDispense', message: 'Bereit zum Mixen!' };

  it('zeigt die Status-Nachricht', () => {
    render(<StatusPanel status={defaultStatus} isLoading={false} isAdmin={false} />);
    expect(screen.getByText('Bereit zum Mixen!')).toBeInTheDocument();
  });

  it('zeigt AKTUELLER SYSTEM-MODUS Label', () => {
    render(<StatusPanel status={defaultStatus} isLoading={false} isAdmin={false} />);
    expect(screen.getByText('AKTUELLER SYSTEM-MODUS')).toBeInTheDocument();
  });

  it('zeigt Admin Button wenn onAdminToggle vorhanden', () => {
    render(
      <StatusPanel
        status={defaultStatus}
        isLoading={false}
        isAdmin={false}
        onAdminToggle={() => {}}
      />
    );
    expect(screen.getByText('🔑 Admin')).toBeInTheDocument();
  });

  it('zeigt Logout wenn isAdmin', () => {
    render(
      <StatusPanel
        status={defaultStatus}
        isLoading={false}
        isAdmin={true}
        onAdminToggle={() => {}}
      />
    );
    expect(screen.getByText('🔐 Logout')).toBeInTheDocument();
  });

  it('ruft onAdminToggle beim Klick auf', () => {
    const onToggle = vi.fn();
    render(
      <StatusPanel
        status={defaultStatus}
        isLoading={false}
        isAdmin={false}
        onAdminToggle={onToggle}
      />
    );
    fireEvent.click(screen.getByText('🔑 Admin'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
