/**
 * Authentication Service — Manages tokens and session state.
 *
 * Handles:
 * - Storing/retrieving tokens from localStorage
 * - Login, logout, and token refresh operations
 * - Session validation
 *
 * LocalStorage Rules:
 * ✅ ALLOWED: refresh_token, access_token, token_expiry
 * ❌ NOT ALLOWED: credential_id, public_key, private_key
 *
 * The private key NEVER leaves the device's Secure Enclave / Android Keystore.
 * We only store session tokens (refresh + access) which can be revoked server-side.
 */
import { api } from "./apiClient";
import config from "../config/appSettings";

const { STORAGE_KEYS } = config;

/**
 * Store authentication tokens in localStorage.
 * Only stores session tokens — NEVER WebAuthn credentials.
 */
export const storeTokens = (tokenData) => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, tokenData.refresh_token_expiry);
  localStorage.setItem(STORAGE_KEYS.EMPLOYEE_ID, tokenData.employee_id);
};

/**
 * Clear all session data from localStorage.
 * Called on logout or when device is replaced.
 */
export const clearSession = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.EMPLOYEE_ID);
};

/**
 * Get the stored refresh token.
 */
export const getRefreshToken = () => {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
};

/**
 * Get the stored employee identifier.
 */
export const getEmployeeId = () => {
  return localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID);
};

/**
 * Get the stored access token.
 */
export const getAccessToken = () => {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};

/**
 * Attempt to refresh the access token using the stored refresh token.
 *
 * This is the FIRST thing the app tries on startup:
 * 1. Check if refresh token exists in localStorage
 * 2. Send it to the backend for validation
 * 3. If valid → get new access token → go to Home
 * 4. If invalid → fall through to passkey authentication
 *
 * @returns {object|null} Token data if successful, null if failed
 */
export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await api.post("/token/refresh", {
      refresh_token: refreshToken,
    });
    storeTokens(response);
    return response;
  } catch (error) {
    // Token is invalid or revoked — clear session
    clearSession();
    return null;
  }
};

/**
 * Logout the current device — invalidate refresh token server-side.
 */
export const logout = async () => {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await api.post("/logout", { refresh_token: refreshToken });
    } catch (error) {
      // Ignore logout errors — we clear locally regardless
    }
  }
  clearSession();
};

/**
 * Get device information from the backend.
 */
export const getDeviceInfo = async () => {
  return await api.get("/device");
};
