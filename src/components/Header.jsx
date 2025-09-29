// src/components/AppHeader.jsx
import { useEffect, useState } from "react";
import { Box, Group, Button, Text } from "@mantine/core";
import { useNavigate } from "react-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { notifications } from "@mantine/notifications";

export default function AppHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      notifications.show({
        title: "Logged out",
        message: "You have been logged out successfully.",
        color: "green",
        position: "top-center",
      });
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <Box
      component="header"
      style={{
        height: 64,
        borderBottom: "1px solid #e9ecef",
        backgroundColor: "white",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Logo / App Name */}
      <Text
        fw={700}
        size="xl"
        style={{
          cursor: "pointer",
          letterSpacing: "-0.5px",
          color: "#1c7ed6",
        }}
        onClick={() => navigate("/")}
      >
        FoundIt
      </Text>

      {/* Auth Buttons */}
      <Group gap="sm">
        {user ? (
          <>
            <Button onClick={() => navigate("/create-post")} color="blue">
              Create Post
            </Button>

            <Button onClick={() => navigate("/profile")} variant="subtle" color="blue">
              My Profile
            </Button>

            <Button onClick={handleLogout} color="red" variant="light">
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => navigate("/login")}
              variant="subtle"
              color="blue"
            >
              Login
            </Button>
            <Button onClick={() => navigate("/register")} color="blue">
              Register
            </Button>
          </>
        )}
      </Group>
    </Box>
  );
}
