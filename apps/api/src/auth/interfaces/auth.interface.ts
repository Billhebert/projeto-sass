export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  organizationId?: string;
}

export interface TokenResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
    mlUserId?: number;
    mlNickname?: string;
    createdAt: Date;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  accessToken: string;
  refreshToken: string;
}
