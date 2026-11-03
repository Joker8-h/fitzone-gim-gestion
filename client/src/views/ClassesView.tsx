import React from 'react';
import type { GymClass, GymEvent } from '../types/api';

// ============================================================================
// 3. VISTA CLASES Y EVENTOS DEL GIMNASIO
// ============================================================================
interface ClassesViewProps {
  classes: GymClass[];
  events: GymEvent[];
  onOpenClassModal: () => void;
  onOpenEventModal: () => void;
  onAdjustClassQuota: (id: string, delta: number) => void;
  onDeleteClass: (id: string) => void;
  onDeleteEvent: (id: string) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  events,
  onOpenClassModal,
  onOpenEventModal,
  onAdjustClassQuota,
  onDeleteClass,
  onDeleteEvent,
}) => {
  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Clases Grupales y Eventos</h1>
          <p className="welcome-sub">
            Control de horarios, instructores, cupos de clases en vivo y calendario de eventos FITZONE.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn-green" onClick={onOpenClassModal}>
            + Nueva Clase
          </button>
          <button
            type="button"
            className="btn-green"
            style={{ backgroundColor: '#334155' }}
            onClick={onOpenEventModal}
          >
            + Nuevo Evento
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Horario de Clases de Hoy ({classes.length})</div>
          </div>
          <div className="class-list">
            {classes.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: '16px 0' }}>
                No hay clases grupales programadas. Haz clic en <strong>"+ Nueva Clase"</strong> para agregar una al horario.
              </div>
            ) : (
              classes.map((c) => {
                const pct = Math.min(100, Math.round((c.enrolled_count / (c.capacity || 20)) * 100));
                return (
                  <div key={c.id} className="class-item">
                    <div className="class-item-left">
                      <div className={`class-badge-icon ${c.color_theme || 'emerald'}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6.5 6.5l11 11" />
                          <path d="M21 21l-1-1" />
                          <path d="M3 3l1 1" />
                          <path d="M18 22l4-4" />
                          <path d="M2 6l4-4" />
                        </svg>
                      </div>
                      <div>
                        <div className="class-time">{c.schedule_time}</div>
                        <div className="class-name">{c.name}</div>
                        <div className="class-coach">Instructor: {c.instructor_name}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="class-progress-wrap">
                        <div className="class-quota">
                          {c.enrolled_count} / {c.capacity} inscritos
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="action-icon-btn"
                        title="Inscribir alumno (+1)"
                        onClick={() => onAdjustClassQuota(c.id, 1)}
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn"
                        title="Retirar alumno (-1)"
                        onClick={() => onAdjustClassQuota(c.id, -1)}
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn"
                        title="Eliminar clase"
                        onClick={() => onDeleteClass(c.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Calendario de Próximos Eventos ({events.length})</div>
          </div>
          <div className="event-list">
            {events.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: '16px 0' }}>
                No hay próximos eventos publicados. Haz clic en <strong>"+ Nuevo Evento"</strong> para publicar uno.
              </div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="event-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="event-date-box">
                      <span className="event-day">{ev.day_num}</span>
                      <span className="event-month">{ev.month_short}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ev.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{ev.time_range}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="action-icon-btn"
                    title="Eliminar evento"
                    onClick={() => onDeleteEvent(ev.id)}
                  >
                    Eliminar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
