/**
 * Register Device Page — Invitation-token onboarding + WebAuthn passkey creation.
 *
 * This is the primary entry point of the app (there is NO username/password
 * login). A device onboards using an admin-issued Invitation Token.
 *
 * Onboarding flow:
 * 1. User enters Device ID and Invitation Token
 * 2. User clicks "Register Device"
 * 3. Backend validates the device + invitation token (rejects if invalid/expired)
 * 4. Browser calls navigator.credentials.create()
 * 5. Platform authenticator prompts for biometric/PIN
 * 6. NEW keypair is generated:
 *    - Private key → Secure Enclave (NEVER leaves device)
 *    - Public key → sent to server
 * 7. Server stores credential_id + public_key (REPLACING any old one),
 *    consumes the invitation token, and issues tokens → user is logged in
 *
 * Device replacement:
 * If this device already had a registered passkey and completes registration
 * again with a valid Invitation Token, the backend replaces the Credential ID +
 * Public Key and revokes the previous Refresh Token — the old device is signed
 * out automatically on its next app open.
 *
 * Secondary action — "Sign in with Passkey":
 * An already-registered device can authenticate an EXISTING passkey via
 * navigator.credentials.get() (discoverable credential). This path NEVER calls
 * navigator.credentials.create().
 */
import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Divider,
} from "@mui/material";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import KeyIcon from "@mui/icons-material/Key";
import {
  registerPasskey,
  authenticatePasskey,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
} from "../services/webAuthnService";

const RegisterPage = ({
  onRegistrationSuccess,
  onPasskeySuccess,
  onDeviceReplaced,
}) => {
  // Onboarding form fields
  const [deviceId, setDeviceId] = useState("");
  const [invitationToken, setInvitationToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [webAuthnSupported] = useState(isWebAuthnSupported());

  const formComplete =
    deviceId.trim() &&
    invitationToken.trim();

  /**
   * Register this device using the invitation token.
   * Validates the token server-side, then creates a new passkey.
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      // Ensure the device has a platform authenticator (Touch ID / Face ID / Hello)
      const platformAvailable = await isPlatformAuthenticatorAvailable();
      if (!platformAvailable) {
        setError(
          "No platform authenticator available. This device may not support passkeys."
        );
        setLoading(false);
        return;
      }

      // Backend validates the invitation token BEFORE returning registration
      // options. An invalid/expired token throws a 400 with a friendly message.
      const tokenData = await registerPasskey({
        device_id: deviceId.trim(),
        invitation_token: invitationToken.trim(),
      });
      onRegistrationSuccess(tokenData);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("Registration was cancelled or timed out. Please try again.");
      } else if (err.name === "InvalidStateError") {
        setError("A credential already exists for this authenticator.");
      } else {
        // Backend returns the invitation-token error message in err.detail
        setError(
          err.detail ||
            err.message ||
            "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * "Sign in with Passkey" — authenticate an EXISTING passkey (discoverable mode).
   * Uses navigator.credentials.get() ONLY — never creates a new credential.
   */
  const handlePasskeySignIn = async () => {
    setError("");
    setInfo("");

    if (!isWebAuthnSupported()) {
      setError("This browser does not support passkeys.");
      return;
    }

    setPasskeyLoading(true);
    try {
      // null → discoverable credential mode. Browser finds an existing passkey
      // for this RP. We do NOT create a new credential here.
      const tokenData = await authenticatePasskey(null);
      onPasskeySuccess(tokenData);
    } catch (err) {
      // Backend rejected a credential it once knew → credential was replaced.
      if (err && err.detail === "device_replaced") {
        if (onDeviceReplaced) {
          onDeviceReplaced();
          return;
        }
      }

      // No passkey on this device, or the user dismissed the prompt.
      if (
        (err && (err.name === "NotAllowedError" || err.name === "AbortError")) ||
        (err && err.status === 401)
      ) {
        setInfo(
          "No registered passkey was found on this device. Please register using your invitation token."
        );
      } else {
        setError(
          (err && (err.detail || err.message)) ||
            "Passkey sign-in failed. Please try again."
        );
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const busy = loading || passkeyLoading;

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
        }}
      >
        <Card sx={{ width: "100%", maxWidth: 440 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <FingerprintIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
              <Typography variant="h5" component="h1" gutterBottom>
                Register Device
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your device ID and invitation token to onboard this device
              </Typography>
            </Box>

            {!webAuthnSupported && (
              <Alert severity="error" sx={{ mb: 2 }}>
                WebAuthn is not supported in this browser. Please use a modern
                browser with passkey support.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {info && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {info}
              </Alert>
            )}

            <form onSubmit={handleRegister}>
              <TextField
                label="Device ID"
                placeholder="e.g., DEVICE001"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                fullWidth
                required
                margin="normal"
                disabled={busy}
              />
              <TextField
                label="Invitation Token"
                placeholder="e.g., INV-XXXX-XXXX-XXXX"
                value={invitationToken}
                onChange={(e) => setInvitationToken(e.target.value)}
                fullWidth
                required
                margin="normal"
                disabled={busy}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={busy || !webAuthnSupported || !formComplete}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <FingerprintIcon />
                }
                sx={{ mt: 2 }}
              >
                {loading ? "Registering..." : "Register Device"}
              </Button>
            </form>

            {/*
              Secondary action — authenticate an EXISTING passkey.
              Calls navigator.credentials.get() (discoverable credential) only.
            */}
            <Divider sx={{ my: 3 }}>or</Divider>

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Device already registered?
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={
                  passkeyLoading ? <CircularProgress size={20} /> : <KeyIcon />
                }
                onClick={handlePasskeySignIn}
                disabled={busy}
              >
                {passkeyLoading ? "Authenticating..." : "Sign in with Passkey"}
              </Button>
            </Box>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                WebAuthn Device Registration POC
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default RegisterPage;
