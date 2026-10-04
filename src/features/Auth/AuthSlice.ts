import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
    user: any | null;
    isAuthenticated: boolean;
    role: string | null;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    role: null
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state, 
            action: PayloadAction<{
                digitalId: number;
                orgId: number;
                email: string;
                role: string;
                firstName: string;
                lastName?: string;
                profileImageUrl?: string | null;
                message: string;
            }>
        ) => {
            state.user = {
                digitalId: action.payload.digitalId,
                orgId: action.payload.orgId,
                email: action.payload.email,
                firstName: action.payload.firstName,
                lastName: action.payload.lastName,
                profileImageUrl: action.payload.profileImageUrl,
                message: action.payload.message
            };
            state.role = action.payload.role;
            state.isAuthenticated = true;
        },
        clearCredentials: (state) => {
            state.user = null;
            state.role = null;
            state.isAuthenticated = false;
        },
        updateUserData: (state, action) => {
            state.user = { ...state.user, ...action.payload };
        },
    }
});

export const { setCredentials, clearCredentials, updateUserData } = authSlice.actions;
export default authSlice.reducer;