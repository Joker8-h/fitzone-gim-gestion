import { db } from '../db/database.js';
import crypto from 'crypto';
import { auditService } from './auditService.js';

function getTokenSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET ausente o demasiado corto (mínimo 16 caracteres). Configúralo en las variables de entorno antes de desplegar.'
    );
  }
  // Desarrollo: secreto efímero por proceso (las sesiones se invalidan al reiniciar)
  console.warn('[AUTH] AUTH_SECRET no definido: usando secreto efímero solo para desarrollo.');
  return crypto.randomBytes(32).toString('hex');
}

const TOKEN_SECRET = getTokenSecret();

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
    const a = Buffer.from(password);
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
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

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

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
    // Asegurar que exista el usuario admin con hash seguro scrypt.
    // La contraseña inicial proviene de ADMIN_INITIAL_PASSWORD; si no está definida
    // se genera una aleatoria que se imprime UNA sola vez en consola.
    // @ts-ignore
    const existing = db.prepare('SELECT * FROM users WHERE email = ? OR email = ?').get('admin@fitzone.com', 'admin@gimnasio.com') as any;
    if (!existing) {
      const envPassword = process.env.ADMIN_INITIAL_PASSWORD;
      const initialPassword = envPassword && envPassword.length >= 8
        ? envPassword
        : crypto.randomBytes(12).toString('base64url');
      db.prepare(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (?, ?, ?, ?, 'ADMIN')
      `).run(
        crypto.randomUUID(),
        'Administrador FITZONE',
        'admin@fitzone.com',
        hashPassword(initialPassword)
      );
      console.log('========================================================');
      console.log('  USUARIO ADMINISTRADOR INICIAL CREADO');
      console.log('  Usuario:  admin@fitzone.com');
      console.log(`  Contraseña: ${initialPassword}`);
      console.log('  Guárdala en un lugar seguro. No se volverá a mostrar.');
      if (!envPassword) {
        console.log('  Consejo: define ADMIN_INITIAL_PASSWORD en .env para');
        console.log('  fijar una contraseña propia desde el primer arranque.');
      }
      console.log('========================================================');
    } else if (!String(existing.password).startsWith('scrypt:')) {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(
        hashPassword(existing.password),
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
