/**
 * Application Configuration — Mobile PWA
 *
 * Store the backend API URL here so it can be easily changed
 * for different environments (development, staging, production).
 */
const config = {
  // Backend API base URL — reads from .env (REACT_APP_API_BASE_URL)
   //API_BASE_URL: process.env.REACT_APP_API_BASE_URL || "https://web-auth-poc-api.onrender.com",
  API_BASE_URL: "https://appsvc-tarzana-dev.azurewebsites.net",

  // Token storage keys (localStorage)
  STORAGE_KEYS: {
    REFRESH_TOKEN: "webauthn_refresh_token",
    ACCESS_TOKEN: "webauthn_access_token",
    TOKEN_EXPIRY: "webauthn_token_expiry",
    DEVICE_ID: "webauthn_device_id",
  },

  // Refresh token validity (for display purposes)
  REFRESH_TOKEN_DAYS: 365,
};

export default config;
