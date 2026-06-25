/**
 * Loading Page — Shown during initial app startup authentication checks.
 *
 * The app performs these checks in order:
 * 1. Try to refresh the access token (if refresh token exists)
 * 2. If that fails, try passkey authentication
 * 3. If that fails, show login page
 *
 * This loading screen is displayed while those checks are in progress.
 */
import React from "react";
import {
  Box,
  CircularProgress,
  Typography,
  Container,
} from "@mui/material";

const LoadingPage = ({ message }) => {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={48} sx={{ mb: 3 }} />
        <Typography variant="h6" color="text.secondary">
          {message || "Checking authentication..."}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please wait
        </Typography>
      </Box>
    </Container>
  );
};

export default LoadingPage;
