/**
 * Home Page — Main authenticated view.
 *
 * Displays the employee's device registration information and session details:
 * - Location
 * - Employee ID
 * - Company Email
 * - Current Credential ID (truncated for display)
 * - Registration timestamp
 * - Last login timestamp
 * - Refresh token expiry
 * - Current browser and platform info
 * - Authentication method used
 *
 * Actions:
 * - Logout: Invalidates refresh token, clears session, returns to onboarding
 * - Clear Session: Removes localStorage only (simulates token loss)
 */
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Chip,
  Stack,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { logout, getDeviceInfo, clearSession } from "../services/authService";
import config from "../config/appSettings";

const HomePage = ({ onLogout, authMethod }) => {
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [error, setError] = useState("");

  // Detect browser and platform information
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    return browser;
  };

  const getPlatformInfo = () => {
    const ua = navigator.userAgent;
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    return "Unknown";
  };

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const info = await getDeviceInfo();
        setDeviceInfo(info);
      } catch (err) {
        setError("Failed to load device information");
      }
    };
    fetchDeviceInfo();
  }, []);

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const handleClearSession = () => {
    clearSession();
    onLogout();
  };

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString();
  };

  const truncateCredentialId = (credId) => {
    if (!credId) return "N/A";
    if (credId.length <= 20) return credId;
    return `${credId.substring(0, 10)}...${credId.substring(credId.length - 10)}`;
  };

  const employeeId =
    deviceInfo?.employee_id ||
    localStorage.getItem(config.STORAGE_KEYS.EMPLOYEE_ID) ||
    "Unknown";

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: "success.main", mb: 1 }} />
              <Typography variant="h5" component="h1" gutterBottom>
                Device Registered
              </Typography>
              <Chip
                label={`Authenticated via ${authMethod || "token"}`}
                color="success"
                size="small"
              />
            </Box>

            {error && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <List dense>
              <ListItem>
                <ListItemText
                  primary="Location"
                  secondary={deviceInfo?.location || "N/A"}
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="Employee ID" secondary={employeeId} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Company Email"
                  secondary={deviceInfo?.company_email || "N/A"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Current Credential ID"
                  secondary={truncateCredentialId(deviceInfo?.credential_id)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Registration Date"
                  secondary={formatDate(deviceInfo?.registered_at)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Last Login"
                  secondary={formatDate(deviceInfo?.last_login)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Refresh Token Expiry"
                  secondary={formatDate(deviceInfo?.refresh_token_expiry)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Current Browser"
                  secondary={getBrowserInfo()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Current Platform"
                  secondary={getPlatformInfo()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Authentication Method"
                  secondary={authMethod || "Refresh Token"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Status"
                  secondary={
                    <Chip
                      label={deviceInfo?.status || "active"}
                      color="success"
                      size="small"
                    />
                  }
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
              >
                Logout
              </Button>
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                startIcon={<DeleteIcon />}
                onClick={handleClearSession}
              >
                Clear Session
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default HomePage;
