import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import MTProto from '@mtproto/core';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { z } from 'zod/v4';
import rateLimit from 'express-rate-limit';

// --- Config ---
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// --- Rate limiting ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
});

// --- MTProto setup ---
const sessionsDir = path.resolve(import.meta.dirname, 'sessions');
fs.mkdirSync(sessionsDir, { recursive: true });
const storagePath = path.resolve(sessionsDir, 'telegram.json');

const createMTProto = () => {
  return new MTProto({
    api_id: process.env.API_ID,
    api_hash: process.env.API_HASH,
    storageOptions: { path: storagePath }
  });
};

let mtproto = createMTProto();

const resetConnection = () => {
  mtproto = createMTProto();
  return mtproto.call('help.getNearestDc');
};

const initConnection = async () => {
  try {
    await mtproto.call('help.getNearestDc');
    console.log('Initial connection established');
  } catch (error) {
    console.error('Initial connection error:', error);
  }
};

initConnection();

mtproto.updateInitConnectionParams({
  deviceModel: 'Server',
  systemVersion: 'Windows 10',
  appVersion: '1.0.0',
  langCode: 'en'
});

// --- Auth middleware ---
async function requireAuth(_req: Request, res: Response, next: Function) {
  try {
    await mtproto.call('users.getUsers', { id: [{ _: 'inputUserSelf' }] });
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// --- Validation ---
class ValidationError extends Error {
  constructor(public issues: z.core.$ZodIssue[]) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }
  return result.data;
}

const sendCodeSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
});

const signInSchema = z.object({
  phone: z.string().min(1),
  code: z.string().min(1, 'Verification code is required'),
  phone_code_hash: z.string().min(1),
});

const verify2faSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const messagesQuerySchema = z.object({
  offset_id: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

const mediaParamsSchema = z.object({
  messageId: z.coerce.number().int().positive(),
});

const mediaSizeQuerySchema = z.object({
  size: z.enum(['thumbnail', 'full']).default('full'),
});

function handleValidationError(error: unknown, res: Response): boolean {
  if (error instanceof ValidationError) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.issues.map(i => ({ path: i.path, message: i.message })),
    });
    return true;
  }
  return false;
}

// --- Crypto helpers ---
function powMod(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  base = base % modulus;
  while (exponent > 0n) {
    if (exponent & 1n) {
      result = (result * base) % modulus;
    }
    base = (base * base) % modulus;
    exponent = exponent >> 1n;
  }
  return result;
}

const handleMTProtoError = (error: any) => {
  console.error('MTProto error:', error);
  const errorMessages: Record<string, string> = {
    PHONE_NUMBER_INVALID: 'Invalid phone number format',
    PHONE_CODE_INVALID: 'Invalid verification code',
    PHONE_CODE_EXPIRED: 'Verification code expired',
    SESSION_PASSWORD_NEEDED: 'Two-step verification required',
    PASSWORD_HASH_INVALID: 'Invalid password',
    AUTH_RESTART: 'Authentication failed, please try again'
  };
  return errorMessages[error.error_message] || 'An unexpected error occurred';
};

const padTo2048Bits = (num: bigint): Uint8Array => {
  return new Uint8Array(Buffer.from(num.toString(16).padStart(512, '0'), 'hex'));
};

const bufferToBigInt = (buffer: Uint8Array): bigint => {
  return BigInt('0x' + Buffer.from(buffer).toString('hex'));
};

const calculateSRP = async (password: string) => {
  try {
    const passwordData: AccountPassword = await mtproto.call('account.getPassword');
    console.log('Password data received');

    const currentAlgo = passwordData.current_algo;

    const H = (data: Uint8Array): Uint8Array => {
      return new Uint8Array(crypto.createHash('sha256').update(data).digest());
    };

    const SH = (data: Uint8Array, salt: Uint8Array): Uint8Array => {
      return H(new Uint8Array([...salt, ...data, ...salt]));
    };

    const PH1 = (password: string, salt1: Uint8Array, salt2: Uint8Array): Uint8Array => {
      const inner = SH(new Uint8Array(Buffer.from(password)), salt1);
      return SH(inner, salt2);
    };

    const PH2 = async (password: string, salt1: Uint8Array, salt2: Uint8Array): Promise<Uint8Array> => {
      const ph1 = PH1(password, salt1, salt2);
      return new Promise((resolve, reject) => {
        crypto.pbkdf2(ph1, salt1, 100000, 64, 'sha512', (err, derivedKey) => {
          if (err) reject(err);
          else resolve(SH(new Uint8Array(derivedKey), salt2));
        });
      });
    };

    const salt1 = new Uint8Array(Buffer.from(currentAlgo.salt1));
    const salt2 = new Uint8Array(Buffer.from(currentAlgo.salt2));
    const p = new Uint8Array(Buffer.from(currentAlgo.p));
    const g = currentAlgo.g;

    const x = await PH2(password, salt1, salt2);
    const xBigInt = bufferToBigInt(x);

    const a = new Uint8Array(crypto.randomBytes(256));
    const aBigInt = bufferToBigInt(a);

    const pBigInt = bufferToBigInt(p);
    const gBigInt = BigInt(g);
    const srpBBigInt = bufferToBigInt(new Uint8Array(passwordData.srp_B));

    const A = powMod(gBigInt, aBigInt, pBigInt);

    const gBytes = padTo2048Bits(gBigInt);
    const k = bufferToBigInt(H(new Uint8Array([...p, ...gBytes])));

    const u = bufferToBigInt(H(new Uint8Array([
      ...padTo2048Bits(A),
      ...new Uint8Array(passwordData.srp_B)
    ])));

    const v = powMod(gBigInt, xBigInt, pBigInt);

    const S = powMod(
      (srpBBigInt - k * v % pBigInt + pBigInt) % pBigInt,
      (aBigInt + u * xBigInt) % (pBigInt - 1n),
      pBigInt
    );

    const hp = H(p);
    const hg = H(gBytes);
    const xored = new Uint8Array(hp.length);
    for (let i = 0; i < hp.length; i++) {
      xored[i] = hp[i] ^ hg[i];
    }

    const M1 = H(new Uint8Array([
      ...xored,
      ...H(salt1),
      ...H(salt2),
      ...padTo2048Bits(A),
      ...new Uint8Array(passwordData.srp_B),
      ...H(padTo2048Bits(S))
    ]));

    return {
      A: A.toString(16).padStart(512, '0'),
      M1: Buffer.from(M1).toString('hex'),
      srp_id: passwordData.srp_id
    };
  } catch (error) {
    console.error('SRP calculation error:', error);
    throw new Error('Failed to calculate SRP parameters');
  }
};

// --- Photo size picker ---
type SizeMode = 'thumbnail' | 'full';

function pickPhotoSize(sizes: PhotoSize[], mode: SizeMode): PhotoSize {
  const fullOrder = ['y', 'x', 'w'];
  const thumbOrder = ['m', 's'];
  const order = mode === 'full' ? fullOrder : thumbOrder;
  for (const type of order) {
    const found = sizes.find((s) => s.type === type);
    if (found) return found;
  }
  return sizes[sizes.length - 1];
}

// --- File downloader ---
const CHUNK_SIZE = 256 * 1024;

async function downloadFile(
  location: InputFileLocation,
  _dcId?: number,
  onExpired?: () => Promise<InputFileLocation>,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  let originalDc: number | null = null;
  let currentLocation = location;

  try {
    while (true) {
      try {
        const result: UploadFile = await mtproto.call('upload.getFile', {
          location: currentLocation,
          offset,
          limit: CHUNK_SIZE,
        });

        const bytes = new Uint8Array(result.bytes);
        if (bytes.length === 0) break;
        chunks.push(bytes);
        offset += bytes.length;
        if (bytes.length < CHUNK_SIZE) break;
      } catch (error: any) {
        if (error.error_message?.startsWith('FILE_MIGRATE_')) {
          const newDc = parseInt(error.error_message.split('FILE_MIGRATE_')[1]);
          if (originalDc === null) {
            const dcInfo = await mtproto.call('help.getNearestDc');
            originalDc = dcInfo.this_dc;
          }
          await mtproto.setDefaultDc(newDc);
          continue;
        }
        if (error.error_message === 'FILE_REFERENCE_EXPIRED' && onExpired) {
          currentLocation = await onExpired();
          chunks.length = 0;
          offset = 0;
          continue;
        }
        throw error;
      }
    }
  } finally {
    if (originalDc !== null) {
      await mtproto.setDefaultDc(originalDc);
    }
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

// --- Two-tier media cache (memory + disk) ---
const memoryCache = new Map<string, { data: Uint8Array; mimeType: string; timestamp: number; size: number }>();
const MAX_CACHE_ENTRIES = 200;
const MAX_CACHE_BYTES = 100 * 1024 * 1024;
const CACHE_TTL = 30 * 60 * 1000;
let totalCacheBytes = 0;
const CACHE_DIR = path.resolve(import.meta.dirname, 'cache');

fs.mkdirSync(CACHE_DIR, { recursive: true });

function safeCacheKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function cacheGet(key: string) {
  key = safeCacheKey(key);
  // Check memory first
  const entry = memoryCache.get(key);
  if (entry) {
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      totalCacheBytes -= entry.size;
      memoryCache.delete(key);
    } else {
      return entry;
    }
  }

  // Check disk
  const binPath = path.join(CACHE_DIR, `${key}.bin`);
  const metaPath = path.join(CACHE_DIR, `${key}.meta`);
  try {
    const data = new Uint8Array(fs.readFileSync(binPath));
    const mimeType = fs.readFileSync(metaPath, 'utf-8');
    memoryCacheSet(key, data, mimeType);
    return { data, mimeType };
  } catch {
    return null;
  }
}

function memoryCacheSet(key: string, data: Uint8Array, mimeType: string) {
  const now = Date.now();
  // Evict expired entries
  for (const [k, v] of memoryCache) {
    if (now - v.timestamp > CACHE_TTL) {
      totalCacheBytes -= v.size;
      memoryCache.delete(k);
    }
  }
  // Evict oldest if over size or entry limit
  while (totalCacheBytes + data.length > MAX_CACHE_BYTES || memoryCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = memoryCache.keys().next().value;
    if (!firstKey) break;
    const entry = memoryCache.get(firstKey)!;
    totalCacheBytes -= entry.size;
    memoryCache.delete(firstKey);
  }
  memoryCache.set(key, { data, mimeType, timestamp: now, size: data.length });
  totalCacheBytes += data.length;
}

function cacheSet(key: string, data: Uint8Array, mimeType: string) {
  key = safeCacheKey(key);
  memoryCacheSet(key, data, mimeType);
  const binPath = path.join(CACHE_DIR, `${key}.bin`);
  const metaPath = path.join(CACHE_DIR, `${key}.meta`);
  fs.promises.writeFile(binPath, data).catch(() => {});
  fs.promises.writeFile(metaPath, mimeType).catch(() => {});
}

function clearCache() {
  memoryCache.clear();
  totalCacheBytes = 0;
  try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {
    // ignore
  }
}

// --- Helper to build location + mime from a message ---
function fetchLocationAndMime(
  msg: Message,
  size: SizeMode,
): { location: InputFileLocation; mimeType: string; dcId?: number } | null {
  if (!msg.media) return null;

  if (msg.media._ === 'messageMediaPhoto' && msg.media.photo) {
    const photo = msg.media.photo;
    const photoSize = pickPhotoSize(photo.sizes, size);
    return {
      location: {
        _: 'inputPhotoFileLocation',
        id: photo.id,
        access_hash: photo.access_hash,
        file_reference: photo.file_reference,
        thumb_size: photoSize.type,
      },
      mimeType: 'image/jpeg',
      dcId: photo.dc_id,
    };
  }

  if (msg.media._ === 'messageMediaDocument' && msg.media.document) {
    const doc = msg.media.document;

    if (size === 'thumbnail' && doc.thumbs && doc.thumbs.length > 0) {
      const thumb = pickPhotoSize(doc.thumbs, 'thumbnail');
      return {
        location: {
          _: 'inputDocumentFileLocation',
          id: doc.id,
          access_hash: doc.access_hash,
          file_reference: doc.file_reference,
          thumb_size: thumb.type,
        },
        mimeType: 'image/jpeg',
        dcId: doc.dc_id,
      };
    }

    return {
      location: {
        _: 'inputDocumentFileLocation',
        id: doc.id,
        access_hash: doc.access_hash,
        file_reference: doc.file_reference,
        thumb_size: '',
      },
      mimeType: doc.mime_type || 'application/octet-stream',
      dcId: doc.dc_id,
    };
  }

  return null;
}

// --- Auth status endpoint ---
app.get('/api/auth/status', async (_req: Request, res: Response) => {
  try {
    const result = await mtproto.call('users.getUsers', {
      id: [{ _: 'inputUserSelf' }]
    });
    const user = result[0];
    res.json({
      authenticated: true,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name },
    });
  } catch (_error: any) {
    res.json({ authenticated: false });
  }
});

// --- Auth endpoints (rate-limited) ---
app.post('/api/sendCode', authLimiter, async (req: Request, res: Response) => {
  try {
    const { phone } = validate(sendCodeSchema, req.body);
    await resetConnection();

    try {
      const result = await mtproto.call('auth.sendCode', {
        phone_number: phone,
        settings: { _: 'codeSettings' },
      });
      res.json(result);
    } catch (error: any) {
      if (error.error_code === 303) {
        const [, dcId] = error.error_message.split('_MIGRATE_');
        await mtproto.setDefaultDc(+dcId);

        const result = await mtproto.call('auth.sendCode', {
          phone_number: phone,
          settings: { _: 'codeSettings' },
        });
        res.json(result);
      } else if (error.error_code === 500) {
        await resetConnection();
        const result = await mtproto.call('auth.sendCode', {
          phone_number: phone,
          settings: { _: 'codeSettings' },
        });
        res.json(result);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    if (handleValidationError(error, res)) return;
    console.error('Send code error:', error);
    res.status(500).json({ error: error.error_message });
  }
});

app.post('/api/signIn', authLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, code, phone_code_hash } = validate(signInSchema, req.body);
    const result = await mtproto.call('auth.signIn', {
      phone_number: phone,
      phone_code: code,
      phone_code_hash: phone_code_hash,
    });
    res.json(result);
  } catch (error: any) {
    if (handleValidationError(error, res)) return;
    if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
      res.json({
        requiresPassword: true,
        message: 'Two-step verification required'
      });
    } else {
      const errorMessage = handleMTProtoError(error);
      res.status(500).json({ error: errorMessage });
    }
  }
});

app.post('/api/verify-2fa', authLimiter, async (req: Request, res: Response) => {
  try {
    const { password } = validate(verify2faSchema, req.body);
    await initConnection();

    const srpParams = await calculateSRP(password);

    const result = await mtproto.call('auth.checkPassword', {
      password: {
        _: 'inputCheckPasswordSRP',
        srp_id: srpParams.srp_id,
        A: srpParams.A,
        M1: srpParams.M1
      }
    });

    res.json(result);
  } catch (error: any) {
    if (handleValidationError(error, res)) return;
    console.error('2FA verification error:', error);
    res.status(500).json({
      error: error.error_message || 'Failed to verify 2FA password'
    });
  }
});

// --- Logout endpoint (auth-guarded) ---
app.post('/api/logout', requireAuth, async (_req: Request, res: Response) => {
  try {
    await mtproto.call('auth.logOut');
  } catch {
    // Ignore errors — always clear local state
  }
  clearCache();
  res.json({ success: true });
});

// --- Messages endpoint with pagination (auth-guarded) ---
app.get('/api/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const { offset_id: offsetId, limit } = validate(messagesQuerySchema, req.query);

    const messages: MessagesResponse = await mtproto.call('messages.getHistory', {
      peer: { _: 'inputPeerSelf' },
      offset_id: offsetId,
      offset_date: 0,
      add_offset: 0,
      limit,
      max_id: 0,
      min_id: 0,
      hash: 0
    });

    const mediaMessages = messages.messages.filter((msg) => {
      if (!msg.media) return false;
      const type = msg.media._;
      return type === 'messageMediaPhoto' || type === 'messageMediaDocument';
    });

    const transformed = mediaMessages.map((msg) => {
      const media = msg.media!;
      let mediaType = 'photo';
      let mimeType = 'image/jpeg';

      if (media._ === 'messageMediaDocument' && media.document) {
        mediaType = 'document';
        mimeType = media.document.mime_type || 'application/octet-stream';
      }

      return {
        id: msg.id,
        date: msg.date,
        message: msg.message || '',
        mediaType,
        mimeType,
      };
    });

    const rawMessages = messages.messages;
    const hasMore = rawMessages.length === limit;
    const lastOffsetId = rawMessages.length > 0 ? rawMessages[rawMessages.length - 1].id : 0;

    res.json({
      messages: transformed,
      count: messages.count || rawMessages.length,
      hasMore,
      lastOffsetId,
    });
  } catch (error: any) {
    if (handleValidationError(error, res)) return;
    const errorMessage = handleMTProtoError(error);
    res.status(500).json({ error: errorMessage });
  }
});

// --- Media download endpoint (auth-guarded) ---
app.get('/api/media/:messageId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { messageId } = validate(mediaParamsSchema, req.params);
    const { size } = validate(mediaSizeQuerySchema, req.query);
    const cacheKey = `${messageId}_${size}`;

    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set('Content-Type', cached.mimeType);
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(cached.data));
      return;
    }

    const result: MessagesResponse = await mtproto.call('messages.getMessages', {
      id: [{ _: 'inputMessageID', id: messageId }]
    });

    const msg = result.messages?.[0];
    if (!msg?.media) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    const locInfo = fetchLocationAndMime(msg, size);
    if (!locInfo) {
      res.status(404).json({ error: 'Unsupported media type' });
      return;
    }

    const onExpired = async (): Promise<InputFileLocation> => {
      const fresh: MessagesResponse = await mtproto.call('messages.getMessages', {
        id: [{ _: 'inputMessageID', id: messageId }]
      });
      const freshMsg = fresh.messages?.[0];
      if (!freshMsg?.media) throw new Error('Media not found on refresh');
      const freshLoc = fetchLocationAndMime(freshMsg, size);
      if (!freshLoc) throw new Error('Unsupported media type on refresh');
      return freshLoc.location;
    };

    const fileData = await downloadFile(locInfo.location, locInfo.dcId, onExpired);

    cacheSet(cacheKey, fileData, locInfo.mimeType);

    res.set('Content-Type', locInfo.mimeType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(fileData));
  } catch (error: any) {
    if (handleValidationError(error, res)) return;
    console.error('Media download error:', error);
    res.status(500).json({ error: 'Failed to download media' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
