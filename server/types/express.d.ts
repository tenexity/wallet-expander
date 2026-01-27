import type { TenantContext } from "../middleware/tenantContext";

export interface UserClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  exp?: number;
}

export interface AuthenticatedUser {
  claims?: UserClaims;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
    
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}
