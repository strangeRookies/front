import { LoginUser } from "../../features/auth/api/authApi";

interface AuthSession {
  accessToken: string | null;
  refreshToken: string | null;
  user: LoginUser | null;
}

let session: AuthSession = {
  accessToken: null,
  refreshToken: null,
  user: null,
};

export const authStore = {
  setSession: (accessToken: string, refreshToken: string, user: LoginUser) => {
    session = { accessToken, refreshToken, user };
  },
  clearSession: () => {
    session = { accessToken: null, refreshToken: null, user: null };
  },
  getAccessToken: () => session.accessToken,
  getRefreshToken: () => session.refreshToken,
  getUser: () => session.user,
};
