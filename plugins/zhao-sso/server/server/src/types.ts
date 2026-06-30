export interface SsoUser {
  id: number;
  uuid: string;
  username?: string;
  mobile?: string;
  email?: string;
  password_hash?: string;
  avatar_url?: string;
  nickname?: string;
  status: "active" | "blocked" | "inactive";
  register_channel?: string;
  last_login_channel?: string;
  invite_code_used?: string;
  invited_by?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  last_login_at?: Date;
  login_count: number;
  password_changed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SsoJwtPayload {
  sub: string;
  jti: string;
  app_code: string;
  roles?: string[];
  channel?: string;
  type?: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export interface SsoTokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "Bearer";
}
