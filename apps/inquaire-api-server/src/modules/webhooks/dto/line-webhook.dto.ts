export interface LineMessage {
  id: string;
  type: string;
  text?: string;
  timestamp: number;
}

export interface LineSource {
  type: string;
  userId: string;
  groupId?: string;
  roomId?: string;
}

export interface LineEvent {
  type: string;
  message?: LineMessage;
  timestamp: number;
  source: LineSource;
  replyToken: string;
  mode: string;
}

export class LineWebhookDto {
  destination!: string;
  events!: LineEvent[];
}

export interface LineReplyMessage {
  type: string;
  text: string;
}
