# Frontend — WebAuthn Device Registration POC

React 18 application with Material UI for WebAuthn device registration and authentication.

## Setup

```bash
npm install
npm start
```

Runs on http://localhost:3000

## Configuration

The backend API URL is configured in `src/config/appSettings.js`.
Change `API_BASE_URL` to point to a different backend if needed.

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── config/
│   │   └── appSettings.js       API URL and storage keys
│   ├── pages/
│   │   ├── RegisterPage.js      Invitation-token onboarding + passkey creation
│   │   ├── HomePage.js          Authenticated home view
│   │   ├── DeviceReplacedPage.js  Error state for replaced devices
│   │   ├── AdminPage.js         Admin device & invitation-token management
│   │   └── LoadingPage.js       Loading spinner during auth checks
│   ├── services/
│   │   ├── apiClient.js         Reusable HTTP client
│   │   ├── authService.js       Token and session management
│   │   ├── webAuthnService.js   WebAuthn browser API wrapper
│   │   └── adminService.js      Admin endpoint wrappers
│   ├── App.js                   Main component with state machine
│   └── index.js                 Entry point
└── package.json
```

## App Flow

There is **no username/password login**. The app entry point is the **Register
Device** page, where an employee onboards using an admin-issued Invitation Token
(Location, Employee ID, Company Email, Invitation Token). Returning devices are
authenticated automatically via refresh token or the **Sign in with Passkey**
button (discoverable credential).

## LocalStorage Rules

**Allowed:**
- Refresh Token
- Access Token
- Token Expiry
- Employee ID

**NOT Allowed (never stored):**
- Credential ID
- Public Key
- Private Key
- Invitation Token

The private key is managed entirely by the browser's platform authenticator
(Secure Enclave / Android Keystore / TPM).
