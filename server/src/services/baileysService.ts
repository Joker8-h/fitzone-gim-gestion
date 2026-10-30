import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

export type WhatsAppConnectionStatus = 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTED';

class BaileysManager {
  private sock: WASocket | null = null;
  private status: WhatsAppConnectionStatus = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private userPhone: string | null = null;
  private isInitializing = false;
  private authDir: string;

  constructor() {
    this.authDir = path.join(process.cwd(), 'whatsapp_auth');
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  public getStatus() {
    return {
      status: this.status,
      qrCodeDataUrl: this.qrCodeDataUrl,
      qrDataUrl: this.qrCodeDataUrl,
      userPhone: this.userPhone,
      connectedPhone: this.userPhone,
    };
  }

  public async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version } = await fetchLatestBaileysVersion();

      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ['GIM Sistema Gimnasio', 'Chrome', '1.0.0'],
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.status = 'SCAN_QR';
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr);
            console.log('[WHATSAPP] Nuevo código QR generado para escaneo.');
          } catch (err) {
            console.error('[WHATSAPP] Error generando data URL del QR:', err);
          }
        }

        if (connection === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log('[WHATSAPP] Conexión cerrada. Reconectar:', shouldReconnect);
          this.status = 'DISCONNECTED';
          this.qrCodeDataUrl = null;
          this.userPhone = null;

          if (shouldReconnect) {
            setTimeout(() => this.init(), 5000);
          }
        } else if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          this.userPhone = this.sock?.user?.id?.split(':')[0] || 'Conectado';
          console.log('[WHATSAPP] Sesión vinculada exitosamente:', this.userPhone);
        }
      });
    } catch (err) {
      console.error('[WHATSAPP] Error inicializando Baileys:', err);
      this.status = 'DISCONNECTED';
    } finally {
      this.isInitializing = false;
    }
  }

  public async disconnect() {
    try {
      if (this.sock) {
        await this.sock.logout();
        this.sock = null;
      }
      this.status = 'DISCONNECTED';
      this.qrCodeDataUrl = null;
      this.userPhone = null;

      // Limpiar credenciales
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        fs.mkdirSync(this.authDir, { recursive: true });
      }
      console.log('[WHATSAPP] Sesión cerrada y credenciales eliminadas.');
    } catch (err) {
      console.error('[WHATSAPP] Error desconectando:', err);
    }
  }

  public async sendMessage(rawPhone: string, text: string): Promise<boolean> {
    if (this.status !== 'CONNECTED' || !this.sock) {
      throw new Error('WhatsApp no se encuentra conectado. Escanea el código QR primero.');
    }

    // Normalizar teléfono a formato internacional de WhatsApp (ej: Colombia +57)
    let cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '57' + cleaned; // Prefijo Colombia
    }
    const jid = `${cleaned}@s.whatsapp.net`;

    try {
      await this.sock.sendMessage(jid, { text });
      console.log(`[WHATSAPP] Mensaje enviado a ${jid}`);
      return true;
    } catch (err) {
      console.error(`[WHATSAPP] Error enviando mensaje a ${jid}:`, err);
      throw err;
    }
  }
}

export const baileysManager = new BaileysManager();
