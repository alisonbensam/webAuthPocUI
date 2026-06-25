/**
 * WebAuthn Service — Handles all WebAuthn (Passkey) browser operations.
 *
 * This service wraps the Web Authentication API (navigator.credentials)
 * and communicates with the backend for registration and authentication.
 *
 * KEY SECURITY CONCEPTS:
 *
 * 1. navigator.credentials.create() — REGISTRATION
 *    - The browser creates a NEW asymmetric keypair
 *    - Private key → stored in Secure Enclave / Android Keystore / TPM
 *    - Public key → sent to the server for storage
 *    - The private key is NEVER accessible to JavaScript or any app
 *    - It's protected by the device's hardware security module
 *
 * 2. navigator.credentials.get() — AUTHENTICATION
 *    - The browser retrieves the private key from Secure Enclave
 *    - Signs a challenge with the private key (after biometric verification)
 *    - Sends the SIGNATURE (not the private key) to the server
 *    - Server verifies the signature using the stored PUBLIC key
 *
 * 3. WHY ONLY PUBLIC KEY IS STORED ON SERVER:
 *    - Public key can ONLY verify signatures — it cannot create them
 *    - Even if the server is hacked, the attacker cannot impersonate the device
 *    - Only the physical device with the private key in its Secure Enclave can authenticate
 *
 * 4. WHY PRIVATE KEY NEVER LEAVES SECURE ENCLAVE:
 *    - Hardware-backed key storage (Apple Secure Enclave, Android Keystore, TPM)
 *    - The operating system cannot extract it
 *    - JavaScript cannot access it
 *    - Not even a rooted/jailbroken device can easily extract it
 *    - Biometric/PIN verification happens at the hardware level
 */
import { api } from "./apiClient";
import { storeTokens } from "./authService";

/**
 * Convert a base64url string to an ArrayBuffer.
 * WebAuthn APIs require ArrayBuffer inputs for challenges and credential IDs.
 *
 * @param {string} base64url - Base64url encoded string
 * @returns {ArrayBuffer} Decoded binary data
 */
const base64urlToBuffer = (base64url) => {
  // Add padding if needed
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Convert an ArrayBuffer to a base64url string.
 * WebAuthn responses contain ArrayBuffers that need to be sent to the server.
 *
 * @param {ArrayBuffer} buffer - Binary data
 * @returns {string} Base64url encoded string
 */
const bufferToBase64url = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/**
 * Register a new passkey (WebAuthn credential) for this device.
 *
 * STEP-BY-STEP:
 *
 * 1. REQUEST REGISTRATION OPTIONS FROM SERVER
 *    → Server generates a random challenge (prevents replay attacks)
 *    → Server specifies RP (Relying Party) identity
 *    → Server specifies user identity
 *    → Server specifies acceptable credential types
 *
 * 2. BROWSER CREATES CREDENTIAL (navigator.credentials.create)
 *    → Browser shows platform authenticator UI (Face ID / Touch ID / Windows Hello)
 *    → User verifies with biometric or PIN
 *    → Authenticator generates a NEW keypair:
 *      * Private key → Secure Enclave / Android Keystore (NEVER leaves device)
 *      * Public key → included in the response
 *    → Authenticator signs the challenge with the new private key
 *    → Browser returns the credential with attestation
 *
 * 3. SEND REGISTRATION RESPONSE TO SERVER
 *    → Server verifies the attestation
 *    → Server extracts and stores credential_id + public_key
 *    → Server issues access token + refresh token
 *    → If another device was registered before, its credential is REPLACED
 *
 * @param {object} formData - Onboarding form data
 * @param {string} formData.employee_id - The employee identifier (e.g., "EMP001")
 * @param {string} formData.location - The clinic / site (e.g., "Clinic 1")
 * @param {string} formData.company_email - The employee's company email
 * @param {string} formData.invitation_token - The admin-issued invitation token
 * @returns {object} Token data from successful registration
 * @throws {Error} If registration fails at any step
 */
export const registerPasskey = async (formData) => {
  // Step 1: Validate the invitation token and get registration options.
  // The server confirms the employee + invitation token BEFORE returning
  // options. If the token is invalid/expired, this throws a 400 error.
  const options = await api.post("/register/options", {
    employee_id: formData.employee_id,
    location: formData.location,
    company_email: formData.company_email,
    invitation_token: formData.invitation_token,
  });

  // Step 2: Convert server options to the format navigator.credentials.create() expects
  // The Web Authentication API requires ArrayBuffer for binary fields
  const publicKeyOptions = {
    challenge: base64urlToBuffer(options.challenge),
    rp: options.rp,
    user: {
      ...options.user,
      id: base64urlToBuffer(options.user.id),
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    attestation: options.attestation,
    authenticatorSelection: options.authenticatorSelection,
  };

  // Step 3: Call the Web Authentication API
  // This triggers the platform authenticator:
  // - iOS: Face ID or Touch ID prompt
  // - Android: Fingerprint or PIN prompt
  // - Windows: Windows Hello prompt
  // - macOS: Touch ID prompt
  //
  // The authenticator:
  // 1. Verifies the user (biometric/PIN)
  // 2. Generates a new asymmetric keypair
  // 3. Stores the PRIVATE KEY in hardware-backed secure storage
  // 4. Returns the PUBLIC KEY + signed attestation
  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions,
  });

  // Step 4: Serialize the credential response for transmission to the server
  // We convert ArrayBuffer fields to base64url strings for JSON transport
  const credentialData = {
    id: credential.id, // Base64url credential ID (assigned by authenticator)
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      // Contains the attestation (proves the credential was created legitimately)
      attestationObject: bufferToBase64url(credential.response.attestationObject),
      // Contains client data including the challenge (proves freshness)
      clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
    },
  };

  // Step 5: Send to server for verification
  // Server will:
  // - Verify the challenge matches what it sent
  // - Decode the attestation object
  // - Extract the public key
  // - REPLACE any existing credential for this employee
  // - Consume the one-time invitation token
  // - Issue tokens
  const tokenResponse = await api.post("/register/verify", {
    employee_id: formData.employee_id,
    credential: credentialData,
  });

  // Step 6: Store the session tokens (NOT the credential)
  // We ONLY store: access_token, refresh_token, expiry
  // We do NOT store: credential_id, public_key — those live on the server
  // The private key is ONLY in the device's Secure Enclave
  storeTokens(tokenResponse);

  return tokenResponse;
};

/**
 * Authenticate using an existing passkey.
 *
 * STEP-BY-STEP:
 *
 * 1. REQUEST AUTHENTICATION OPTIONS FROM SERVER
 *    → Server generates a fresh challenge
 *    → Server specifies which credential(s) are acceptable
 *
 * 2. BROWSER GETS CREDENTIAL (navigator.credentials.get)
 *    → Browser checks if this device has a matching passkey
 *    → If passkey exists: shows biometric prompt
 *    → User verifies with biometric or PIN
 *    → Authenticator retrieves private key from Secure Enclave
 *    → Signs the challenge with the private key
 *    → Returns the SIGNATURE (not the key itself!)
 *
 * 3. SEND AUTHENTICATION RESPONSE TO SERVER
 *    → Server verifies the signature using the stored PUBLIC key
 *    → If signature matches → SAME device that registered → success
 *    → If signature doesn't match → DIFFERENT device → reject
 *
 * WHY THIS ENABLES DEVICE REPLACEMENT:
 *    → Phone A registers: server stores public_key_A
 *    → Phone B registers same employee: server REPLACES with public_key_B
 *    → Phone A authenticates: signs with private_key_A
 *    → Server verifies with public_key_B: SIGNATURE MISMATCH → rejected!
 *    → Phone A is automatically locked out without any manual action
 *
 * @param {string|null} employeeId - Optional employee id (for directed auth)
 * @returns {object} Token data from successful authentication
 * @throws {Error} If authentication fails
 */
export const authenticatePasskey = async (employeeId = null) => {
  // Step 1: Get authentication options from the server
  const options = await api.post("/auth/options", {
    employee_id: employeeId,
  });

  // Step 2: Convert to the format navigator.credentials.get() expects
  const publicKeyOptions = {
    challenge: base64urlToBuffer(options.challenge),
    timeout: options.timeout,
    rpId: options.rpId,
    userVerification: options.userVerification,
  };

  // If server specified allowed credentials, include them
  // This tells the browser exactly which passkey to use
  if (options.allowCredentials && options.allowCredentials.length > 0) {
    publicKeyOptions.allowCredentials = options.allowCredentials.map((cred) => ({
      type: cred.type,
      id: base64urlToBuffer(cred.id),
      transports: cred.transports,
    }));
  }

  // Step 3: Call the Web Authentication API
  // This triggers the platform authenticator:
  // - Browser checks if a matching passkey exists for this RP (Relying Party)
  // - If YES: prompts user for biometric/PIN verification
  //   → Authenticator retrieves the PRIVATE KEY from Secure Enclave
  //   → Signs the challenge using the private key
  //   → Returns the signature + authenticator data
  // - If NO: throws an error (no matching credential found)
  //
  // IMPORTANT: The private key NEVER leaves the Secure Enclave!
  // Only the SIGNATURE is returned — not the key itself.
  const credential = await navigator.credentials.get({
    publicKey: publicKeyOptions,
  });

  // Step 4: Serialize the authentication response
  const credentialData = {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      // Authenticator data: includes flags (user present, user verified)
      authenticatorData: bufferToBase64url(credential.response.authenticatorData),
      // Client data: includes the challenge and origin
      clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
      // THE SIGNATURE: proves possession of the private key
      // Server will verify this with the stored public key
      signature: bufferToBase64url(credential.response.signature),
      // User handle: identifies which user this credential belongs to
      userHandle: credential.response.userHandle
        ? bufferToBase64url(credential.response.userHandle)
        : null,
    },
  };

  // Step 5: Send to server for verification
  // Server will:
  // - Reconstruct the signed data (authData + hash(clientDataJSON))
  // - Verify the signature using the STORED public key
  // - If valid: same device → issue tokens
  // - If invalid: credential replaced → return "device_replaced" error
  const tokenResponse = await api.post("/auth/verify", {
    credential: credentialData,
  });

  // Step 6: Store session tokens
  storeTokens(tokenResponse);

  return tokenResponse;
};

/**
 * Check if WebAuthn is supported in the current browser/platform.
 *
 * @returns {boolean} True if WebAuthn is available
 */
export const isWebAuthnSupported = () => {
  return (
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === "function"
  );
};

/**
 * Check if a platform authenticator is available (Touch ID, Face ID, etc.).
 *
 * @returns {Promise<boolean>} True if platform authenticator is available
 */
export const isPlatformAuthenticatorAvailable = async () => {
  if (!isWebAuthnSupported()) {
    return false;
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};
