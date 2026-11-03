import React, { useState, useEffect } from 'react';
import type { TrackingRule, TrackingCandidate, CommunicationLog } from '../types/api';

// ============================================================================
// 9. VISTA CONFIGURACIÓN & WHATSAPP IA (BAILEYS QR + GEMINI AI)
// ============================================================================
interface WhatsAppAiViewProps {
  waStatus: {
    status: string;
    qrDataUrl: string | null;
    qrCodeDataUrl?: string | null;
    connectedPhone: string | null;
    userPhone?: string | null;
  };
  rules: TrackingRule[];
  candidates: TrackingCandidate[];
  logs: CommunicationLog[];
  onRefreshWa: () => Promise<void>;
  onConnectWa: () => Promise<void>;
  onDisconnectWa: () => Promise<void>;
  onRunAutomatedSweep: () => Promise<void>;
  onSendSingleCandidate: (cand: TrackingCandidate) => Promise<void>;
  onUpdateRule: (
    ruleType: string,
    data: { thresholdDays: number; isEnabled: boolean; messageTemplate: string }
  ) => Promise<void>;
}

export const WhatsAppAiView: React.FC<WhatsAppAiViewProps> = ({
  waStatus,
  rules,
  candidates,
  logs,
  onRefreshWa,
  onConnectWa,
  onDisconnectWa,
  onRunAutomatedSweep,
  onSendSingleCandidate,
  onUpdateRule,
}) => {
  const [runningSweep, setRunningSweep] = useState(false);
  const [editingRules, setEditingRules] = useState<Record<string, { days: number; tpl: string }>>({});

  // E1: Polling automático del estado y QR de WhatsApp mientras la vista está abierta
  useEffect(() => {
    const intervalMs = waStatus.status === 'SCAN_QR' ? 4000 : 8000;
    const timer = setInterval(() => {
      onRefreshWa();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [waStatus.status, onRefreshWa]);

  const handleRunSweep = async () => {
    setRunningSweep(true);
    try {
      await onRunAutomatedSweep();
    } finally {
      setRunningSweep(false);
    }
  };

  const qrImg = waStatus.qrDataUrl || waStatus.qrCodeDataUrl || null;
  const phoneDisplay = waStatus.connectedPhone || waStatus.userPhone || 'Activo';

  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Configuración y Automatización WhatsApp IA</h1>
          <p className="welcome-sub">
            Vinculación directa por código QR (Baileys) y seguimiento inteligente con Gemini AI (DP-011).
          </p>
        </div>
        <button
          type="button"
          className="btn-green"
          disabled={runningSweep}
          onClick={handleRunSweep}
        >
          {runningSweep ? 'Procesando con IA...' : 'Ejecutar Barrido Automático IA Ahora'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.45fr', gap: 18, marginBottom: 18 }}>
        {/* Panel QR Baileys */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-header">
            <div className="card-title">Vinculación WhatsApp del Gimnasio</div>
            <span className={waStatus.status === 'CONNECTED' ? 'pill-green' : 'pill-amber'}>
              {waStatus.status === 'CONNECTED'
                ? `Conectado (${phoneDisplay})`
                : waStatus.status === 'SCAN_QR'
                ? 'Esperando escaneo QR'
                : 'Desconectado'}
            </span>
          </div>

          <div
            style={{
              minHeight: 230,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#121a2d',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: 16,
              marginBottom: 14,
            }}
          >
            {waStatus.status === 'CONNECTED' ? (
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#4ade80', marginBottom: 6 }}>
                  Sesión de WhatsApp Vinculada
                </div>
                <p style={{ fontSize: 12.5, color: '#475569' }}>
                  El motor de IA enviará los recordatorios directamente desde el WhatsApp del gimnasio.
                </p>
              </div>
            ) : qrImg ? (
              <div>
                <img
                  src={qrImg}
                  alt="Código QR WhatsApp Baileys"
                  style={{
                    width: 195,
                    height: 195,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    marginBottom: 8,
                  }}
                />
                <p style={{ fontSize: 12, color: '#475569' }}>
                  Abre WhatsApp en tu celular → Dispositivos vinculados → Escanea este código QR
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                  Haz clic en "Generar / Reconectar QR" para vincular el WhatsApp del gimnasio.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-green" onClick={onConnectWa}>
              Generar / Reconectar QR
            </button>
            <button type="button" className="btn-secondary" onClick={onRefreshWa}>
              Actualizar Estado
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ color: '#b91c1c' }}
              onClick={onDisconnectWa}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Candidatos detectados hoy con su mensaje redactado por IA */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Candidatos Detectados Hoy por el Motor IA ({candidates.length})
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
            {candidates.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: 12 }}>
                No hay miembros pendientes de recordatorio en este momento.
              </div>
            ) : (
              candidates.map((cand) => (
                <div
                  key={`${cand.clientId}-${cand.reason}`}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: cand.reason === 'INACTIVITY' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <strong style={{ color: '#ffffff' }}>{cand.fullName}</strong> ({cand.phone})
                    </div>
                    <span className={cand.reason === 'INACTIVITY' ? 'pill-red' : 'pill-amber'}>
                      {cand.reason === 'INACTIVITY'
                        ? `Inactivo ${cand.daysInfo} días`
                        : `Vence en ${cand.daysInfo} días`}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#cbd5e1',
                      background: '#0e1628',
                      padding: '8px 10px',
                      borderRadius: 8,
                      marginBottom: 8,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {cand.suggestedMessage}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-green"
                      style={{ padding: '5px 12px', fontSize: 11.5 }}
                      onClick={() => onSendSingleCandidate(cand)}
                    >
                      Enviar Recordatorio IA
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Configuración de Reglas IA */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title">Reglas de Seguimiento Inteligente (Umbrales y Plantillas)</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {rules.map((r) => {
            const currentDays = editingRules[r.rule_type]?.days ?? r.threshold_days;
            const currentTpl = editingRules[r.rule_type]?.tpl ?? r.message_template;

            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: 14,
                  background: '#121a2d',
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 8, color: '#ffffff' }}>
                  {r.rule_type === 'INACTIVITY'
                    ? 'Regla de Inactividad (Días sin asistir)'
                    : 'Regla de Vencimiento Próximo (Días antes)'}
                </div>
                <div className="form-group">
                  <label className="form-label">Umbral en Días</label>
                  <input
                    type="number"
                    className="form-input"
                    value={currentDays}
                    onChange={(e) =>
                      setEditingRules((prev) => ({
                        ...prev,
                        [r.rule_type]: { days: Number(e.target.value), tpl: currentTpl },
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Plantilla Base / Contexto IA</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    value={currentTpl}
                    onChange={(e) =>
                      setEditingRules((prev) => ({
                        ...prev,
                        [r.rule_type]: { days: currentDays, tpl: e.target.value },
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className="btn-green"
                  onClick={() =>
                    onUpdateRule(r.rule_type, {
                      thresholdDays: currentDays,
                      isEnabled: true,
                      messageTemplate: currentTpl,
                    })
                  }
                >
                  Guardar Regla
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bitácora de mensajes enviados */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Bitácora de Mensajes Procesados por la IA ({logs.length})</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="fit-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Miembro</th>
                <th>Regla</th>
                <th>Mensaje Enviado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px 12px', color: '#64748b' }}>
                    No se han enviado comunicaciones automáticas todavía.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{l.sent_at}</td>
                    <td style={{ fontWeight: 700 }}>{l.full_name || 'Miembro'}</td>
                    <td>{l.rule_type}</td>
                    <td style={{ maxWidth: 440, fontSize: 12, color: '#334155' }}>{l.message}</td>
                    <td>
                      <span className="pill-green">{l.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
