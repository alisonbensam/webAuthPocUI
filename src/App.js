/**
 * App.js — Main application component with authentication routing.
 *
 * There is NO username/password login. Devices onboard with an admin-issued
 * Invitation Token via the Register page.
 *
 * Authentication Flow (on app start):
 *
 * 1. LOADING state — Check if refresh token exists
 *    └─ YES: Try /token/refresh
 *       └─ SUCCESS → HOME (no biometric needed!)
 *       └─ FAIL → Step 2
 *    └─ NO → Step 2
 *
 * 2. Try passkey authentication (navigator.credentials.get)
 *    └─ SUCCESS (passkey exists & signature valid) → HOME
 *    └─ FAIL with "device_replaced" → DEVICE_REPLACED page
 *    └─ FAIL (no passkey on device) → Step 3
 *
 * 3. Show REGISTER page (invitation-token onboarding)
 *    └─ User enters Location, Employee ID, Company Email, Invitation Token
 *    └─ User completes biometric (navigator.credentials.create) → HOME
 *    └─ OR uses "Sign in with Passkey" (existing passkey) → HOME
 *
 * State Machine:
 *   LOADING → HOME | DEVICE_REPLACED | REGISTER
 *   REGISTER → HOME
 *   HOME → REGISTER (logout)
 *   DEVICE_REPLACED → REGISTER
 */
import React, { useState, useEffect, useCallback } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import DeviceReplacedPage from "./pages/DeviceReplacedPage";
import LoadingPage from "./pages/LoadingPage";

import { refreshAccessToken, getRefreshToken, getEmployeeId, clearSession } from "./services/authService";
import { authenticatePasskey, isWebAuthnSupported } from "./services/webAuthnService";

// Material UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#9c27b0",
    },
  },
});

// Application states
const APP_STATE = {
  LOADING: "loading",
  REGISTER: "register",
  HOME: "home",
  DEVICE_REPLACED: "device_replaced",
};

const App = () => {
  const [appState, setAppState] = useState(APP_STATE.LOADING);
  const [employeeId, setEmployeeId] = useState("");
  const [authMethod, setAuthMethod] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Checking authentication...");

  /**
   * Initial authentication check — runs on app startup.
   *
   * Flow:
   * 1. Check for existing refresh token → try to refresh
   * 2. If refresh fails → try passkey authentication
   * 3. If passkey fails → show the Register (onboarding) page
   */
  const checkAuthentication = useCallback(async () => {
    setAppState(APP_STATE.LOADING);
    setLoadingMessage("Checking authentication...");

    // Step 1: Try refresh token
    // This is the fastest path — no biometric needed
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      setLoadingMessage("Validating session...");
      const result = await refreshAccessToken();
      if (result) {
        // Refresh token is valid — go directly to Home
        setAuthMethod("Refresh Token");
        setEmployeeId(result.employee_id);
        setAppState(APP_STATE.HOME);
        return;
      }
      // Refresh token is invalid — it was likely revoked (device replacement)
    }

    // Step 2: Try passkey authentication
    // The device might have a valid passkey even if the refresh token is gone
    if (isWebAuthnSupported()) {
      const storedEmployeeId = getEmployeeId();
      if (storedEmployeeId) {
        setLoadingMessage("Attempting passkey authentication...");
        try {
          const result = await authenticatePasskey(storedEmployeeId);
          if (result) {
            setAuthMethod("Passkey");
            setEmployeeId(result.employee_id);
            setAppState(APP_STATE.HOME);
            return;
          }
        } catch (err) {
          // Check if this is a device replacement scenario
          if (err.detail === "device_replaced" || err.status === 401) {
            clearSession();
            setAppState(APP_STATE.DEVICE_REPLACED);
            return;
          }
          // Passkey not found on this device or user cancelled — fall through to register
        }
      }
    }

    // Step 3: No valid authentication method — show the onboarding/register page
    setAppState(APP_STATE.REGISTER);
  }, []);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  /**
   * Handle successful passkey sign-in from the Register page.
   *
   * Triggered by the "Sign in with Passkey" button, which authenticates an
   * EXISTING passkey via navigator.credentials.get() (no credential creation).
   */
  const handlePasskeySuccess = (tokenData) => {
    setAuthMethod("Passkey");
    setEmployeeId(tokenData?.employee_id || "");
    setAppState(APP_STATE.HOME);
  };

  /**
   * Handle a passkey that the backend no longer recognizes (replaced device).
   */
  const handleDeviceReplaced = () => {
    clearSession();
    setAppState(APP_STATE.DEVICE_REPLACED);
  };

  /**
   * Handle successful device registration — move to home.
   */
  const handleRegistrationSuccess = (tokenData) => {
    setAuthMethod("New Registration");
    setEmployeeId(tokenData?.employee_id || "");
    setAppState(APP_STATE.HOME);
  };

  /**
   * Handle logout — clear session and return to the onboarding/register page.
   */
  const handleLogout = () => {
    setAuthMethod("");
    setEmployeeId("");
    setAppState(APP_STATE.REGISTER);
  };

  /**
   * Navigate back to the onboarding/register page from any error state.
   */
  const handleGoToRegister = () => {
    clearSession();
    setAppState(APP_STATE.REGISTER);
  };

  // Render the appropriate page based on app state
  const renderPage = () => {
    switch (appState) {
      case APP_STATE.LOADING:
        return <LoadingPage message={loadingMessage} />;

      case APP_STATE.REGISTER:
        return (
          <RegisterPage
            onRegistrationSuccess={handleRegistrationSuccess}
            onPasskeySuccess={handlePasskeySuccess}
            onDeviceReplaced={handleDeviceReplaced}
          />
        );

      case APP_STATE.HOME:
        return <HomePage onLogout={handleLogout} authMethod={authMethod} />;

      case APP_STATE.DEVICE_REPLACED:
        return <DeviceReplacedPage onGoToLogin={handleGoToRegister} />;

      default:
        return <LoadingPage message="Unknown state..." />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {renderPage()}
    </ThemeProvider>
  );
};

export default App;
