import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
  errorMessage: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, errorMessage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(username, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Panel Izquierdo: Branding Motivacional FITZONE */}
      <div
        style={{
          flex: 1.15,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          color: '#ffffff',
          background:
            'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(24, 32, 44, 0.95) 100%), url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80") center/cover no-repeat',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="46" height="46" viewBox="0 0 44 44" fill="none">
            <rect x="3" y="13" width="4.5" height="18" rx="2" fill="#22c55e" />
            <rect x="9" y="8" width="5" height="28" rx="2" fill="#ffffff" />
            <rect x="14" y="19.5" width="16" height="5" rx="1.5" fill="#22c55e" />
            <rect x="30" y="8" width="5" height="28" rx="2" fill="#ffffff" />
            <rect x="36.5" y="13" width="4.5" height="18" rx="2" fill="#22c55e" />
          </svg>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1.1 }}>
              FITZONE
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: '#94a3b8',
                marginTop: 3,
              }}
            >
              TU MEJOR VERSIÓN
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 460 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(34, 197, 94, 0.18)',
              color: '#4ade80',
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 14px',
              borderRadius: 999,
              marginBottom: 16,
              border: '1px solid rgba(34, 197, 94, 0.35)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Sistema de Gestión Integral y Automatización IA</span>
          </div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 800,
              lineHeight: 1.15,
              fontStyle: 'italic',
              marginBottom: 16,
            }}
          >
            DISCIPLINA HOY,
            <br />
            RESULTADOS MAÑANA
          </h1>
          <span
            style={{
              display: 'block',
              width: 74,
              height: 5,
              backgroundColor: '#22c55e',
              borderRadius: 4,
              marginBottom: 18,
            }}
          />
          <p style={{ fontSize: 14.5, color: '#cbd5e1', lineHeight: 1.6 }}>
            Controla miembros, membresías acumulativas, recepción con validación en tiempo real, clases,
            finanzas y seguimiento automático por WhatsApp con Inteligencia Artificial.
          </p>
        </div>

        <div style={{ fontSize: 12, color: '#64748b' }}>
          © 2026 FITZONE Gym Management • Arquitectura React + Node.js Endurecida
        </div>
      </div>

      {/* Panel Derecho: Formulario de Inicio de Sesión */}
      <div
        style={{
          flex: 0.95,
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: '36px 34px',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Iniciar Sesión
            </h2>
            <p style={{ fontSize: 13.5, color: '#64748b' }}>
              Ingresa tu usuario y contraseña para acceder al panel de FITZONE.
            </p>
          </div>

          {errorMessage && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 600,
                marginBottom: 16,
                border: '1px solid #fecaca',
              }}
            >
              Error de autenticación: {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">
                Usuario o Correo Electrónico
              </label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="tu usuario o correo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 64 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#475569',
                  }}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-green"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 18px',
                fontSize: 14,
                marginTop: 8,
              }}
            >
              {loading ? 'Verificando credenciales...' : 'Ingresar al Panel FITZONE'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
