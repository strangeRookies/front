import { LoginUser } from "../../features/auth/api/authApi";

interface AuthSession {
  accessToken: string | null;
  user: LoginUser | null;
}

let session: AuthSession = {
  accessToken: null,
  user: null,
};

export const authStore = {
  setSession: (accessToken: string, user: LoginUser) => {
    session = { accessToken, user };
  },
  clearSession: () => {
    session = { accessToken: null, user: null };
  },
  getAccessToken: () => session.accessToken,
  getUser: () => session.user,
};
