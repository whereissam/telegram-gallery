import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import MTProto from '@mtproto/core';
import path from 'path';
import crypto from 'crypto';

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

const storagePath = path.resolve(import.meta.dirname, 'sessions', 'telegram.json');

const createMTProto = () => {
  return new MTProto({
    api_id: process.env.API_ID,
    api_hash: process.env.API_HASH,
    storageOptions: {
      path: storagePath
    }
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

// Helper function for modular exponentiation
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

// Helper function to transform errors
const handleMTProtoError = (error: any) => {
  console.error('MTProto error:', error);

  const errorMessages: { [key: string]: string } = {
    PHONE_NUMBER_INVALID: 'Invalid phone number format',
    PHONE_CODE_INVALID: 'Invalid verification code',
    PHONE_CODE_EXPIRED: 'Verification code expired',
    SESSION_PASSWORD_NEEDED: 'Two-step verification required',
    PASSWORD_HASH_INVALID: 'Invalid password',
    AUTH_RESTART: 'Authentication failed, please try again'
  };

  return errorMessages[error.error_message] || 'An unexpected error occurred';
};

// Helper to pad numbers to 2048 bits
const padTo2048Bits = (num: bigint): Uint8Array => {
  return new Uint8Array(Buffer.from(num.toString(16).padStart(512, '0'), 'hex'));
};

// Helper to convert Buffer to BigInt
const bufferToBigInt = (buffer: Uint8Array): bigint => {
  return BigInt('0x' + Buffer.from(buffer).toString('hex'));
};

const calculateSRP = async (password: string) => {
  try {
    const passwordData = await mtproto.call('account.getPassword');
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

    const k = bufferToBigInt(H(new Uint8Array([...p, g])));

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
    const hg = H(new Uint8Array([g]));
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

function pickPhotoSize(sizes: any[], mode: SizeMode): any {
  const fullOrder = ['y', 'x', 'w'];
  const thumbOrder = ['m', 's'];
  const order = mode === 'full' ? fullOrder : thumbOrder;
  for (const type of order) {
    const found = sizes.find((s: any) => s.type === type);
    if (found) return found;
  }
  return sizes[sizes.length - 1];
}

// --- File downloader ---
const CHUNK_SIZE = 256 * 1024; // 256 KB

async function downloadFile(location: any, _dcId?: number): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let offset = 0;

  while (true) {
    try {
      const result = await mtproto.call('upload.getFile', {
        location,
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
        await mtproto.setDefaultDc(newDc);
        continue;
      }
      throw error;
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

// --- Media cache ---
const mediaCache = new Map<string, { data: Uint8Array; mimeType: string }>();
const MAX_CACHE = 200;

function cacheSet(key: string, data: Uint8Array, mimeType: string) {
  if (mediaCache.size >= MAX_CACHE) {
    const firstKey = mediaCache.keys().next().value;
    if (firstKey) mediaCache.delete(firstKey);
  }
  mediaCache.set(key, { data, mimeType });
}

// --- Auth status endpoint ---
app.get('/api/auth/status', async (_req: Request, res: Response) => {
  try {
    const result = await mtproto.call('users.getUsers', {
      id: [{ _: 'inputUserSelf' }]
    });
    res.json({ authenticated: true, user: result[0] });
  } catch (_error: any) {
    res.json({ authenticated: false });
  }
});

// --- Auth endpoints ---
app.post('/api/sendCode', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
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
    console.error('Send code error:', error);
    res.status(500).json({ error: error.error_message });
  }
});

app.post('/api/signIn', async (req: Request, res: Response) => {
  try {
    const { phone, code, phone_code_hash } = req.body;
    const result = await mtproto.call('auth.signIn', {
      phone_number: phone,
      phone_code: code,
      phone_code_hash: phone_code_hash,
    });
    res.json(result);
  } catch (error: any) {
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

app.post('/api/verify-2fa', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
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
    console.error('2FA verification error:', error);
    res.status(500).json({
      error: error.error_message || 'Failed to verify 2FA password'
    });
  }
});

// --- Messages endpoint with pagination ---
app.get('/api/messages', async (req: Request, res: Response) => {
  try {
    const offsetId = parseInt(req.query.offset_id as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 50);

    const messages = await mtproto.call('messages.getHistory', {
      peer: { _: 'inputPeerSelf' },
      offset_id: offsetId,
      offset_date: 0,
      add_offset: 0,
      limit,
      max_id: 0,
      min_id: 0,
      hash: 0
    });

    const mediaMessages = messages.messages.filter((msg: any) => {
      if (!msg.media) return false;
      const type = msg.media._;
      return type === 'messageMediaPhoto' || type === 'messageMediaDocument';
    });

    const transformed = mediaMessages.map((msg: any) => {
      const media = msg.media;
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
        mediaUrl: `/api/media/${msg.id}`,
        thumbnailUrl: `/api/media/${msg.id}?size=thumbnail`,
      };
    });

    const hasMore = messages.messages.length === limit;

    res.json({
      messages: transformed,
      count: messages.count || messages.messages.length,
      hasMore,
    });
  } catch (error: any) {
    const errorMessage = handleMTProtoError(error);
    res.status(500).json({ error: errorMessage });
  }
});

// --- Media download endpoint ---
app.get('/api/media/:messageId', async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.messageId as string);
    const size: SizeMode = req.query.size === 'thumbnail' ? 'thumbnail' : 'full';
    const cacheKey = `${messageId}_${size}`;

    const cached = mediaCache.get(cacheKey);
    if (cached) {
      res.set('Content-Type', cached.mimeType);
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(cached.data));
      return;
    }

    // Fetch the specific message
    const result = await mtproto.call('messages.getMessages', {
      id: [{ _: 'inputMessageID', id: messageId }]
    });

    const msg = result.messages?.[0];
    if (!msg?.media) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    let fileData: Uint8Array;
    let mimeType = 'image/jpeg';

    if (msg.media._ === 'messageMediaPhoto' && msg.media.photo) {
      const photo = msg.media.photo;
      const photoSize = pickPhotoSize(photo.sizes, size);

      const location = {
        _: 'inputPhotoFileLocation',
        id: photo.id,
        access_hash: photo.access_hash,
        file_reference: photo.file_reference,
        thumb_size: photoSize.type,
      };

      fileData = await downloadFile(location, photo.dc_id);
      mimeType = 'image/jpeg';
    } else if (msg.media._ === 'messageMediaDocument' && msg.media.document) {
      const doc = msg.media.document;
      mimeType = doc.mime_type || 'application/octet-stream';

      if (size === 'thumbnail' && doc.thumbs?.length > 0) {
        const thumb = pickPhotoSize(doc.thumbs, 'thumbnail');
        const location = {
          _: 'inputDocumentFileLocation',
          id: doc.id,
          access_hash: doc.access_hash,
          file_reference: doc.file_reference,
          thumb_size: thumb.type,
        };
        fileData = await downloadFile(location, doc.dc_id);
        mimeType = 'image/jpeg';
      } else {
        const location = {
          _: 'inputDocumentFileLocation',
          id: doc.id,
          access_hash: doc.access_hash,
          file_reference: doc.file_reference,
          thumb_size: '',
        };
        fileData = await downloadFile(location, doc.dc_id);
      }
    } else {
      res.status(404).json({ error: 'Unsupported media type' });
      return;
    }

    cacheSet(cacheKey, fileData, mimeType);

    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(fileData));
  } catch (error: any) {
    console.error('Media download error:', error);
    res.status(500).json({ error: 'Failed to download media' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
