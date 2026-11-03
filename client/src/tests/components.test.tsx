import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LoginScreen } from '../components/auth/LoginScreen';
import { ClientModal } from '../components/modals/ClientModal';
import { PlanModal } from '../components/modals/PlanModal';
import { QuickRenewModal } from '../components/modals/QuickRenewModal';
import { AttendanceLineChart } from '../components/charts/AttendanceLineChart';

afterEach(() => {
  cleanup();
});

describe('FITZONE Client: Formularios, Modales y Gráficas (Fase 2 — D1)', () => {
  it('LoginScreen renderiza campos vacíos por defecto y envía credenciales al hacer submit', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginScreen onLogin={onLogin} errorMessage={null} />);

    const userInput = screen.getByLabelText(/Usuario o Correo Electrónico/i) as HTMLInputElement;
    const passInput = screen.getByLabelText(/Contraseña/i) as HTMLInputElement;

    expect(userInput.value).toBe('');
    expect(passInput.value).toBe('');

    fireEvent.change(userInput, { target: { value: 'admin@fitzone.com' } });
    fireEvent.change(passInput, { target: { value: 'admin123' } });

    const submitBtn = screen.getByRole('button', { name: /Ingresar al Panel FITZONE/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('admin@fitzone.com', 'admin123');
    });
  });

  it('LoginScreen muestra mensaje de error cuando las credenciales fallan', () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginScreen onLogin={onLogin} errorMessage="Usuario o contraseña incorrectos" />);

    expect(screen.getByText(/Usuario o contraseña incorrectos/i)).toBeTruthy();
  });

  it('ClientModal cumple A11y (role="dialog", Escape cierra) y envía datos de nuevo miembro', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<ClientModal isOpen={true} editingClient={null} onClose={onClose} onSave={onSave} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    fireEvent.change(screen.getByPlaceholderText(/1020456789/i), {
      target: { value: '1030555666' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Carlos Martínez/i), {
      target: { value: 'Laura Gómez' },
    });
    fireEvent.change(screen.getByPlaceholderText(/3104567890/i), {
      target: { value: '3157778899' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Miembro/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: '1030555666',
          fullName: 'Laura Gómez',
          phone: '3157778899',
        })
      );
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('PlanModal permite crear un plan de membresía con duración y precio', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<PlanModal isOpen={true} onClose={onClose} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/Plan Mensual/i), {
      target: { value: 'Plan Trimestral VIP' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Plan/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Plan Trimestral VIP',
          durationDays: 30,
          price: 100000,
        })
      );
    });
  });

  it('QuickRenewModal muestra CTA para crear plan cuando el catálogo está vacío', () => {
    const onClose = vi.fn();
    const onOpenPlanModal = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <QuickRenewModal
        isOpen={true}
        client={{
          id: 'c1',
          document_id: '10203040',
          full_name: 'Andrés Ruiz',
          phone: '3001234567',
          registration_date: '2026-11-01',
          status: 'ACTIVO',
          created_at: '2026-11-01 08:00:00',
          updated_at: '2026-11-01 08:00:00',
        }}
        plans={[]}
        onClose={onClose}
        onOpenPlanModal={onOpenPlanModal}
        onConfirm={onConfirm}
      />
    );

    const ctaBtn = screen.getByRole('button', { name: /\+ Crear Nuevo Plan Ahora/i });
    fireEvent.click(ctaBtn);
    expect(onOpenPlanModal).toHaveBeenCalled();
  });

  it('AttendanceLineChart filtra correctamente 7d, 14d y 30d (C1)', () => {
    const raw30 = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      label: `${i + 1} Oct`,
      count: i + 1,
    }));

    const { container, rerender } = render(
      <AttendanceLineChart rangeMode="7d" rawDays={raw30} />
    );
    expect(container.querySelectorAll('circle').length).toBe(7);

    rerender(<AttendanceLineChart rangeMode="14d" rawDays={raw30} />);
    expect(container.querySelectorAll('circle').length).toBe(14);

    rerender(<AttendanceLineChart rangeMode="30d" rawDays={raw30} />);
    expect(container.querySelectorAll('circle').length).toBe(30);
  });
});
