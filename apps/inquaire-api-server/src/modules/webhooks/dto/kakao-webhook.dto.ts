export interface KakaoUser {
  id: string;
  type: string;
  properties: {
    nickname?: string;
    profile_image?: string;
    plusfriend_user_key?: string;
  };
}

export interface KakaoMessage {
  text: string;
  photo?: {
    url: string;
  };
}

export class KakaoWebhookDto {
  user!: KakaoUser;
  type!: string;
  content!: KakaoMessage;
  user_key?: string;
}

export class KakaoWebhookRequestDto {
  user_key!: string;
  type!: string;
  content!: string;
}
