declare module '@mtproto/core' {
  export default class MTProto {
    constructor(options: {
      api_id: string | undefined;
      api_hash: string | undefined;
      storageOptions?: { path: string };
    });
    call(method: string, params?: Record<string, any>): Promise<any>;
    setDefaultDc(dcId: number): Promise<void>;
    updateInitConnectionParams(params: Record<string, string>): void;
  }
}
