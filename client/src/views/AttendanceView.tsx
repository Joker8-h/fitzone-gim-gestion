import React, { useState } from 'react';
import type { Client, AttendanceRecord } from '../types/api';
import { formatTime12h } from '../utils/format';

// ============================================================================
// 4. VISTA ASISTENCIA Y KIOSCO DE RECEPCIÓN (DP-003)
// ============================================================================
interface AttendanceViewProps {
  clients: Client[];
  attendances: AttendanceRecord[];
  onCheckInAttempt: (
    client: Client,
    override?: boolean,
    overrideReason?: string
  ) => Promise<{ ok: boolean; status?: number; message: string }>;
  onOpenQuickRenew: (client: Client) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  clients,
  attendances,
  onCheckInAttempt,
  onOpenQuickRenew,
}) => {
  const [docInput, setDocInput] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'blocked' | 'notfound';
    message: string;
    client?: Client;
  } | null>(null);

  const handleKioskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = docInput.trim().toLowerCase();
    if (!q) return;

    const match =
      clients.find((c) => c.document_id.toLowerCase() === q) ||
      clients.find((c) => c.full_name.toLowerCase().includes(q));

    if (!match) {
      setFeedback({
        type: 'notfound',
        message: `No se encontró ningún miembro con el documento o nombre "${docInput}".`,
      });
      return;
    }

    const res = await onCheckInAttempt(match, false);
    if (res.ok || res.status === 409) {
      setFeedback({
        type: 'success',
        message: res.ok
          ? `Bienvenido/a ${match.full_name}. Entrada registrada correctamente.`
          : res.message,
        client: match,
      });
      setDocInput('');
    } else {
      setFeedback({
        type: 'blocked',
        message: res.message,
        client: match,
      });
    }
  };

  const handleOverride = async (client: Client) => {
    const res = await onCheckInAttempt(client, true, 'Autorizado excepcionalmente en recepción');
    if (res.ok) {
      setFeedback({
        type: 'success',
        message: `Ingreso excepcional autorizado y auditado para ${client.full_name}.`,
        client,
      });
      setDocInput('');
    }
  };

  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Control de Asistencia (Check-in)</h1>
          <p className="welcome-sub">
            Validación estricta de vigencia en recepción (DP-003): bloquea membresías vencidas salvo autorización auditada.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.55fr', gap: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Terminal de Ingreso por Documento o Nombre</div>
          </div>
          <form onSubmit={handleKioskSubmit}>
            <div className="form-group">
              <label className="form-label">Documento / Cédula o Nombre del Miembro *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: 1020456789 o Carlos Martínez"
                value={docInput}
                onChange={(e) => setDocInput(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-green"
              style={{ width: '100%', justifyContent: 'center', padding: 11 }}
            >
              Validar Vigencia y Registrar Entrada
            </button>
          </form>

          {feedback && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                backgroundColor:
                  feedback.type === 'success'
                    ? 'rgba(34, 197, 94, 0.15)'
                    : feedback.type === 'blocked'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${
                  feedback.type === 'success'
                    ? 'rgba(74, 222, 128, 0.35)'
                    : feedback.type === 'blocked'
                    ? 'rgba(251, 191, 36, 0.35)'
                    : 'rgba(248, 113, 113, 0.35)'
                }`,
                color:
                  feedback.type === 'success'
                    ? '#4ade80'
                    : feedback.type === 'blocked'
                    ? '#fbbf24'
                    : '#f87171',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                {feedback.type === 'success'
                  ? 'ACCESO PERMITIDO'
                  : feedback.type === 'blocked'
                  ? `ACCESO BLOQUEADO (${feedback.client?.full_name})`
                  : 'MIEMBRO NO ENCONTRADO'}
              </div>
              <div style={{ fontSize: 12.5, marginBottom: feedback.type === 'blocked' ? 12 : 0 }}>
                {feedback.message}
              </div>

              {feedback.type === 'blocked' && feedback.client && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-green"
                    onClick={() => onOpenQuickRenew(feedback.client!)}
                  >
                    Renovar Membresía Ahora
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleOverride(feedback.client!)}
                  >
                    Autorizar Excepción (Auditado)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Bitácora de Entradas Registradas ({attendances.length})</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="fit-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Miembro</th>
                  <th>Documento</th>
                  <th>Modalidad</th>
                </tr>
              </thead>
              <tbody>
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
                      No hay entradas registradas todavía.
                    </td>
                  </tr>
                ) : (
                  attendances.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>
                        {a.check_in_time.split(' ')[0]} • {formatTime12h(a.check_in_time)}
                      </td>
                      <td style={{ fontWeight: 700 }}>{a.full_name}</td>
                      <td>{a.document_id}</td>
                      <td>
                        {a.was_overridden ? (
                          <span className="pill-amber">Autorizado Manual</span>
                        ) : (
                          <span className="pill-green">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
