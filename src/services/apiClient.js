/**
 * API Client Service — Reusable HTTP client for backend communication.
 *
 * Centralizes all API calls and handles:
 * - Base URL configuration (from appSettings)
 * - Authorization header injection
 * - Error response normalization
 */
import config from "../config/appSettings";

const { API_BASE_URL, STORAGE_KEYS } = config;

/**
 * Make an authenticated API request.
 *
 * @param {string} endpoint - API endpoint (e.g., "/login")
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<object>} Parsed JSON response
 * @throws {object} Error with status and detail fields
 */
const apiClient = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  const headers = {
    "Content-Type": "application/json",
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        detail: data.detail || "An error occurred",
      };
    }

    return data;
  } catch (error) {
    if (error.status) {
      throw error; // Already formatted error
    }
    throw {
      status: 0,
      detail: "Network error — cannot reach the server",
    };
  }
};

/**
 * Convenience methods for common HTTP verbs.
 */
export const api = {
  post: (endpoint, body) =>
    apiClient(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  get: (endpoint) =>
    apiClient(endpoint, {
      method: "GET",
    }),
};

export default apiClient;
