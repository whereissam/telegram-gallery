import { MTProto } from '@mtproto/core';

interface MTProtoConfig {
  api_id: string;
  api_hash: string;
}

class TelegramClient {
  private mt: MTProto;
  
  constructor(config: MTProtoConfig) {
    this.mt = new MTProto({
      api_id: config.api_id,
      api_hash: config.api_hash,
    });
  }

  async sendCode(phone: string) {
    try {
      const result = await this.mt.call('auth.sendCode', {
        phone_number: phone,
        settings: {
          _: 'codeSettings',
        },
      });
      return result;
    } catch (error) {
      console.error('sendCode error:', error);
      throw error;
    }
  }

  async signIn(phone: string, code: string, phone_code_hash: string) {
    try {
      const result = await this.mt.call('auth.signIn', {
        phone_number: phone,
        phone_code: code,
        phone_code_hash: phone_code_hash,
      });
      return result;
    } catch (error) {
      console.error('signIn error:', error);
      throw error;
    }
  }

  async getSavedMessages() {
    try {
      const result = await this.mt.call('messages.getSavedHistory', {
        peer: {
          _: 'inputPeerSelf',
        },
        offset_id: 0,
        add_offset: 0,
        limit: 100,
        max_id: 0,
        min_id: 0,
        hash: 0,
      });
      return result;
    } catch (error) {
      console.error('getSavedMessages error:', error);
      throw error;
    }
  }
}

export default TelegramClient;