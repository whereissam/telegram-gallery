/** A media message returned by GET /api/messages */
export interface MediaMessage {
  id: number;
  date: number;
  message: string;
  mediaType: 'photo' | 'document';
  mimeType: string;
}

/** Response from GET /api/messages */
export interface MessagesApiResponse {
  messages: MediaMessage[];
  count: number;
  hasMore: boolean;
  lastOffsetId: number;
}

/** Response from GET /api/auth/status */
export interface AuthStatusResponse {
  authenticated: boolean;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
  };
}
