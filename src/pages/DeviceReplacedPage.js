/**
 * Device Replaced Page — Shown when authentication fails due to device replacement.
 *
 * This page appears when:
 * - The user's refresh token is invalid/expired
 * - Passkey authentication is attempted but FAILS
 * - The failure reason is "device_replaced"
 *
 * Why this happens:
 * - Another device registered for the same employee (using a valid invitation token)
 * - The backend replaced the stored credential_id + public_key
 * - This device still has the OLD private key in its Secure Enclave
 * - When this device signs with the old private key, the server
 *   tries to verify with the NEW public key → mismatch → rejected
 *
 * The user must onboard this device again with a new invitation token.
 */
import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Container,
  Alert,
} from "@mui/material";
import PhonelinkEraseIcon from "@mui/icons-material/PhonelinkErase";
import FingerprintIcon from "@mui/icons-material/Fingerprint";

const DeviceReplacedPage = ({ onGoToLogin }) => {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card sx={{ width: "100%", maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <PhonelinkEraseIcon
                sx={{ fontSize: 64, color: "error.main", mb: 1 }}
              />
              <Typography variant="h5" component="h1" gutterBottom color="error">
                Device Replaced
              </Typography>
            </Box>

            <Alert severity="warning" sx={{ mb: 3 }}>
              This device has been replaced by another device. Please register
              again.
            </Alert>

            <Typography variant="body2" color="text.secondary" paragraph>
              Another device has registered for your employee account. This
              device's passkey is no longer valid.
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              To use this device again, please contact your administrator for a
              new invitation token and re-register this device.
            </Typography>

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<FingerprintIcon />}
              onClick={onGoToLogin}
              sx={{ mt: 2 }}
            >
              Register This Device
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default DeviceReplacedPage;
