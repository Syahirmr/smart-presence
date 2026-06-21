import { create } from 'zustand';

type AdminAuthState = {
  token: string | null;
  adminName: string | null;
  setAuth: (token: string, adminName: string) => void;
  logout: () => void;
};

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_NAME_KEY = 'admin_name';

export const useAdminAuth = create<AdminAuthState>((set) => ({
  token: localStorage.getItem(ADMIN_TOKEN_KEY),
  adminName: localStorage.getItem(ADMIN_NAME_KEY),

  setAuth: (token, adminName) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_NAME_KEY, adminName);

    set({
      token,
      adminName,
    });
  },

  logout: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_NAME_KEY);

    set({
      token: null,
      adminName: null,
    });
  },
}));