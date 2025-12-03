import { useEffect, useState } from "react";
import {
  Box,
  Group,
  Button,
  Text,
  ActionIcon,
  Avatar,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconPlus,
  IconLogout,
  IconLogin,
  IconUser,
  IconUserPlus,
  IconHome,
  IconMessage,
} from "@tabler/icons-react";
import { useNavigate } from "react-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { notifications } from "@mantine/notifications";

export default function AppHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Compact mode when space is small (≤ 640px)
  const compact = useMediaQuery("(max-width: 40em)");

  useEffect(() => {
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
        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Inner container keeps your current max width */}
      <Box
        style={{
          width: "100%",
          maxWidth: "1150px",

          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Home + Brand */}
        <Group gap="xs">
          {/* Show brand text only when not compact */}

          <Text
            fw={800}
            size="xl"
            onClick={() => navigate("/")}
            style={{
              cursor: "pointer",
              letterSpacing: "-0.5px",
              color: "#1c7ed6",
              fontFamily: "Inter, sans-serif",
            }}
          >
            FoundIt
          </Text>
        </Group>

        {/* Right: Auth actions — icons-only when compact; icons+text when roomy */}
        {user ? (
          compact ? (
            // Compact: icons only
            <Group gap="xs">
              <Tooltip label="Create post">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="lg"
                  radius="xl"
                  onClick={() => navigate("/create-post")}
                  aria-label="Create post"
                >
                  <IconPlus size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Chats">
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="lg"
                  radius="xl"
                  onClick={() => navigate("/Chats")}
                  aria-label="Chats"
                >
                  <IconMessage size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Profile">
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="lg"
                  radius="xl"
                  onClick={() => navigate("/profile")}
                  aria-label="Profile"
                >
                  {user.photoURL ? (
                    <Avatar src={user.photoURL} size={22} radius="xl" />
                  ) : (
                    <IconUser size={18} />
                  )}
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Logout">
                <ActionIcon
                  variant="light"
                  color="red"
                  size="lg"
                  radius="xl"
                  onClick={handleLogout}
                  aria-label="Logout"
                >
                  <IconLogout size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ) : (
            // Roomy: icons + text
            <Group gap="xs">
              <Button
                leftSection={<IconPlus size={16} />}
                color="blue"
                onClick={() => navigate("/create-post")}
              >
                Create Post
              </Button>
              <Button
                leftSection={<IconMessage size={16} />}
                variant="subtle"
                color="blue"
                onClick={() => navigate("/Chats")}
              >
                Chats
              </Button>

              <Button
                leftSection={<IconUser size={16} />}
                variant="subtle"
                color="blue"
                onClick={() => navigate("/profile")}
              >
                Profile
              </Button>

              <Button
                leftSection={<IconLogout size={16} />}
                color="red"
                variant="light"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Group>
          )
        ) : (
          // Logged out, roomy: icons + text
          <Group gap="xs">
            <Button
              leftSection={<IconLogin size={16} />}
              variant="subtle"
              color="blue"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
            <Button
              leftSection={<IconUserPlus size={16} />}
              color="blue"
              onClick={() => navigate("/register")}
            >
              Register
            </Button>
          </Group>
        )}
      </Box>
    </Box>
  );
}
