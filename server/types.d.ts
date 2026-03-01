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

// --- MTProto response types ---

interface PhotoSize {
  _: string;
  type: string;
  w?: number;
  h?: number;
  size?: number;
  bytes?: Uint8Array;
}

interface Photo {
  _: 'photo';
  id: string;
  access_hash: string;
  file_reference: Uint8Array;
  date: number;
  sizes: PhotoSize[];
  dc_id: number;
}

interface Document {
  _: 'document';
  id: string;
  access_hash: string;
  file_reference: Uint8Array;
  date: number;
  mime_type: string;
  size: number;
  thumbs?: PhotoSize[];
  dc_id: number;
}

interface MessageMediaPhoto {
  _: 'messageMediaPhoto';
  photo?: Photo;
}

interface MessageMediaDocument {
  _: 'messageMediaDocument';
  document?: Document;
}

type MessageMedia = MessageMediaPhoto | MessageMediaDocument;

interface Message {
  _: 'message';
  id: number;
  date: number;
  message: string;
  media?: MessageMedia;
}

interface MessagesResponse {
  messages: Message[];
  count?: number;
}

interface UploadFile {
  bytes: Uint8Array;
}

interface InputPhotoFileLocation {
  _: 'inputPhotoFileLocation';
  id: string;
  access_hash: string;
  file_reference: Uint8Array;
  thumb_size: string;
}

interface InputDocumentFileLocation {
  _: 'inputDocumentFileLocation';
  id: string;
  access_hash: string;
  file_reference: Uint8Array;
  thumb_size: string;
}

type InputFileLocation = InputPhotoFileLocation | InputDocumentFileLocation;

interface PasswordAlgo {
  salt1: Uint8Array;
  salt2: Uint8Array;
  p: Uint8Array;
  g: number;
}

interface AccountPassword {
  current_algo: PasswordAlgo;
  srp_B: Uint8Array;
  srp_id: string;
}
