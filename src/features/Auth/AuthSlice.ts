import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  role: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  role: null,
};

// Accepts the flat login response body, or one nested under `user`.
type LoginPayload = {
  digitalId?: number;
  orgId?: number;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
  message?: string;
  user?: LoginPayload;
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginPayload>) => {
      const p = action.payload?.user ?? action.payload ?? {};

      state.user = {
        digitalId: p.digitalId,
        orgId: p.orgId,
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        profileImageUrl: p.profileImageUrl,
        message: p.message,
      };
      state.role = action.payload?.role ?? p.role ?? null;
      state.isAuthenticated = true;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
    },
    updateUserData: (state, action: PayloadAction<Record<string, any>>) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
});

export const { setCredentials, clearCredentials, updateUserData } = authSlice.actions;
export default authSlice.reducer;