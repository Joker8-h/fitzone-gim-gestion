import { db } from '../db/database.js';
import crypto from 'crypto';
import { auditService } from './auditService.js';

const TOKEN_SECRET = process.env.AUTH_SECRET || 'fitzone-super-secret-key-2026-hmac-sha256';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith('scrypt:')) {
    // Soporte de migración automática para contraseña inicial en texto plano del seed
    return password === stored;
  }
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [, salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function signToken(user: AuthUser): string {
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${signature}`;
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(base64Payload)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf-8'));
    if (!payload.exp || Date.now() > payload.exp) return null;

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export const authService = {
  ensureDefaultUsers() {
    // Asegurar que exista el usuario admin con hash seguro scrypt
    // @ts-ignore
    const existing = db.prepare('SELECT * FROM users WHERE email = ? OR email = ?').get('admin@fitzone.com', 'admin@gimnasio.com') as any;
    if (!existing) {
      db.prepare(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (?, ?, ?, ?, 'ADMIN')
      `).run(
        crypto.randomUUID(),
        'Administrador FITZONE',
        'admin@fitzone.com',
        hashPassword('admin123')
      );
    } else if (!String(existing.password).startsWith('scrypt:')) {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(
        hashPassword(existing.password || 'admin123'),
        existing.id
      );
    }
  },

  login(identifier: string, password: string): { token: string; user: AuthUser } {
    this.ensureDefaultUsers();
    const cleanId = identifier.trim().toLowerCase();

    // Permitir ingresar con 'admin', 'admin@fitzone.com', 'admin@gimnasio.com' o el nombre/correo del usuario
    let row: any;
    if (cleanId === 'admin') {
      // @ts-ignore
      row = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
    } else {
      // @ts-ignore
      row = db
        .prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(name) = ? LIMIT 1')
        .get(cleanId, cleanId);
    }

    if (!row || !verifyPassword(password, row.password)) {
      auditService.log('LOGIN_FAILED', 'Auth', undefined, `Intento fallido para usuario: ${cleanId}`, cleanId);
      throw new Error('Usuario o contraseña incorrectos. Verifica tus credenciales.');
    }

    // Si la contraseña estaba sin hash scrypt, actualizarla automáticamente
    if (!String(row.password).startsWith('scrypt:')) {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), row.id);
    }

    const user: AuthUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
    };

    const token = signToken(user);
    auditService.log('LOGIN_SUCCESS', 'Auth', user.id, `Inicio de sesión exitoso: ${user.name} (${user.email})`, user.name);

    return { token, user };
  },

  listUsers(): Array<{ id: string; name: string; email: string; role: string; created_at: string }> {
    this.ensureDefaultUsers();
    // @ts-ignore
    return db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC').all() as any[];
  },

  createUser(data: { name: string; email: string; password: string; role?: string }) {
    const cleanEmail = data.email.trim().toLowerCase();
    if (data.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }
    // @ts-ignore
    const exists = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (exists) {
      throw new Error(`Ya existe un usuario registrado con el correo/usuario ${cleanEmail}`);
    }

    const id = crypto.randomUUID();
    const hashed = hashPassword(data.password);
    const role = data.role || 'RECEPCION';

    db.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name.trim(), cleanEmail, hashed, role);

    auditService.log('CREATE_USER', 'User', id, `Usuario del sistema creado: ${data.name} (${cleanEmail}) - Rol: ${role}`, 'Admin');

    return {
      id,
      name: data.name.trim(),
      email: cleanEmail,
      role,
    };
  },

  deleteUser(id: string) {
    // @ts-ignore
    const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 1;
    if (count <= 1) {
      throw new Error('No puedes eliminar el único usuario administrador del sistema.');
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { deleted: true };
  },
};
