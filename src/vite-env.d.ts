/// <reference types="vite/client" />

declare module '@mtproto/core' {
  export class MTProto {
    constructor(options: { api_id: string; api_hash: string });
    call(method: string, params: Record<string, unknown>): Promise<unknown>;
  }
}
