/**
 * Application Configuration — Mobile PWA
 *
 * Store the backend API URL here so it can be easily changed
 * for different environments (development, staging, production).
 */
const config = {
  // Backend API base URL — change this when deploying to a different environment
  API_BASE_URL: "https://web-auth-poc-api.onrender.com",

  // Token storage keys (localStorage)
  STORAGE_KEYS: {
    REFRESH_TOKEN: "webauthn_refresh_token",
    ACCESS_TOKEN: "webauthn_access_token",
    TOKEN_EXPIRY: "webauthn_token_expiry",
    EMPLOYEE_ID: "webauthn_employee_id",
  },

  // Refresh token validity (for display purposes)
  REFRESH_TOKEN_DAYS: 365,
};

export default config;
