import express from 'express';
import cors from 'cors';
import MTProto from '@mtproto/core';
import path from 'path';
import crypto from 'crypto';

const corsOptions = {
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true,  // Allow credentials
  methods: ['GET', 'POST'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization']
};

const app = express();
app.use(cors(corsOptions));app.use(express.json());
const storagePath = path.resolve(__dirname, 'sessions', 'telegram.json');

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

// Reset MTProto instance
const resetConnection = () => {
    mtproto = createMTProto();
    return mtproto.call('help.getNearestDc');
  };

// Initialize connection when server starts
const initConnection = async () => {
    try {
      await mtproto.call('help.getNearestDc');
      console.log('Initial connection established');
    } catch (error) {
      console.error('Initial connection error:', error);
    }
  };
  
initConnection();

// Set connection params
mtproto.updateInitConnectionParams({
  deviceModel: 'Server',
  systemVersion: 'Windows 10',
  appVersion: '1.0.0',
  langCode: 'en'
});

// Helper function for modular exponentiation
function powMod(base: BigInt, exponent: BigInt, modulus: BigInt): BigInt {
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

const calculateSRP = async (password: string, srpB: string, srpId: string) => {
  try {
      const passwordData = await mtproto.call('account.getPassword');
      console.log('Password data:', passwordData);

      const currentAlgo = passwordData.current_algo;
      
      // Helper functions
      const H = (data: Buffer): Buffer => {
          return crypto.createHash('sha256').update(data).digest();
      };

      const SH = (data: Buffer, salt: Buffer): Buffer => {
          return H(Buffer.concat([salt, data, salt]));
      };

      // Implement PH1 and PH2 as per documentation
      const PH1 = (password: string, salt1: Buffer, salt2: Buffer): Buffer => {
          const inner = SH(Buffer.from(password), salt1);
          return SH(inner, salt2);
      };

      const PH2 = async (password: string, salt1: Buffer, salt2: Buffer): Promise<Buffer> => {
          const ph1 = PH1(password, salt1, salt2);
          return new Promise((resolve, reject) => {
              crypto.pbkdf2(ph1, salt1, 100000, 64, 'sha512', (err, derivedKey) => {
                  if (err) reject(err);
                  else resolve(SH(derivedKey, salt2));
              });
          });
      };

      const salt1 = Buffer.from(currentAlgo.salt1);
      const salt2 = Buffer.from(currentAlgo.salt2);
      const p = Buffer.from(currentAlgo.p);
      const g = currentAlgo.g;

      // Calculate x using proper password hashing
      const x = await PH2(password, salt1, salt2);
      const xBigInt = bufferToBigInt(x);

      // Generate random 'a' (256 bytes = 2048 bits)
      const a = crypto.randomBytes(256);
      const aBigInt = bufferToBigInt(a);

      // Convert parameters
      const pBigInt = bufferToBigInt(p);
      const gBigInt = BigInt(g);
      const srpBBigInt = bufferToBigInt(passwordData.srp_B);

      // Calculate A = g^a mod p
      const A = powMod(gBigInt, aBigInt, pBigInt);

      // Calculate k = H(N, g)
      const k = bufferToBigInt(H(Buffer.concat([p, Buffer.from([g])])));

      // Calculate u = H(A, B)
      const u = bufferToBigInt(H(Buffer.concat([
          padTo2048Bits(A),
          passwordData.srp_B
      ])));

      // Calculate v = g^x mod p
      const v = powMod(gBigInt, xBigInt, pBigInt);

      // Calculate S = ((B - k * v) ^ (a + u * x)) mod p
      const S = powMod(
          (srpBBigInt - k * v % pBigInt + pBigInt) % pBigInt,
          (aBigInt + u * xBigInt) % (pBigInt - 1n),
          pBigInt
      );

      // Calculate M1 = H(H(p) xor H(g) | H(salt1) | H(salt2) | g_a | g_b | k_a)
      const hp = H(p);
      const hg = H(Buffer.from([g]));
      const xored = Buffer.alloc(hp.length);
      for (let i = 0; i < hp.length; i++) {
          xored[i] = hp[i] ^ hg[i];
      }

      const M1 = H(Buffer.concat([
          xored,
          H(salt1),
          H(salt2),
          padTo2048Bits(A),
          passwordData.srp_B,
          H(padTo2048Bits(S))
      ]));

      return {
          A: A.toString(16).padStart(512, '0'),
          M1: M1.toString('hex'),
          srpId: passwordData.srp_id
      };
  } catch (error) {
      console.error('SRP calculation error:', error);
      throw new Error('Failed to calculate SRP parameters');
  }
};

// Helper to pad numbers to 2048 bits
const padTo2048Bits = (num: bigint): Buffer => {
  return Buffer.from(num.toString(16).padStart(512, '0'), 'hex');
};

// Helper to convert Buffer to BigInt
const bufferToBigInt = (buffer: Uint8Array): bigint => {
  return BigInt('0x' + Buffer.from(buffer).toString('hex'));
};

  app.post('/api/sendCode', async (req, res) => {
    try {
      const { phone } = req.body;
      
      // Reset connection before starting new auth attempt
      await resetConnection();
      
      try {
        const result = await mtproto.call('auth.sendCode', {
          phone_number: phone,
          settings: {
            _: 'codeSettings',
          },
        });
        res.json(result);
      } catch (error) {
        if (error.error_code === 303) {
          const [type, dcId] = error.error_message.split('_MIGRATE_');
          await mtproto.setDefaultDc(+dcId);
          
          // Retry the request after DC migration
          const result = await mtproto.call('auth.sendCode', {
            phone_number: phone,
            settings: {
              _: 'codeSettings',
            },
          });
          res.json(result);
        } else if (error.error_code === 500) {
          // Handle AUTH_RESTART
          await resetConnection();
          const result = await mtproto.call('auth.sendCode', {
            phone_number: phone,
            settings: {
              _: 'codeSettings',
            },
          });
          res.json(result);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Send code error:', error);
      res.status(500).json({ error: error.error_message });
    }
  });

// Sign in with code
app.post('/api/signIn', async (req, res) => {
  try {
    const { phone, code, phone_code_hash } = req.body;
    const result = await mtproto.call('auth.signIn', {
      phone_number: phone,
      phone_code: code,
      phone_code_hash: phone_code_hash,
    });
    res.json(result);
  } catch (error) {
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

// Check if password is needed
app.get('/api/check-password-needed', async (req, res) => {
  try {
    const result = await mtproto.call('account.getPassword');
    res.json({ 
      passwordNeeded: result.has_password,
      passwordInfo: result
    });
  } catch (error) {
    const errorMessage = handleMTProtoError(error);
    res.status(500).json({ error: errorMessage });
  }
});

// Verify 2FA password
app.post('/api/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    const passwordInfo = await mtproto.call('account.getPassword');
    
    // Calculate password hash (you'll need to implement proper SRP)
    const result = await mtproto.call('auth.checkPassword', {
      password: {
        _: 'inputCheckPasswordSRP',
        // Add proper SRP parameters here
      }
    });
    
    res.json(result);
  } catch (error) {
    const errorMessage = handleMTProtoError(error);
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/verify-2fa', async (req, res) => {
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
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({
            error: error.error_message || 'Failed to verify 2FA password'
        });
    }
});

// Get saved messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await mtproto.call('messages.getHistory', {
      peer: {
        _: 'inputPeerSelf'
      },
      offset_id: 0,
      offset_date: 0,
      add_offset: 0,
      limit: 50,
      max_id: 0,
      min_id: 0,
      hash: 0
    });
    
    // Transform messages to include only necessary data
    const transformedMessages = messages.messages.map(msg => ({
      id: msg.id,
      date: msg.date,
      message: msg.message,
      media: msg.media,
      // Add other necessary fields
    }));
    
    res.json(transformedMessages);
  } catch (error) {
    const errorMessage = handleMTProtoError(error);
    res.status(500).json({ error: errorMessage });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});