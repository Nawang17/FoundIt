import { useState } from "react";
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Divider,
  Group,
  Anchor,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandGoogle } from "@tabler/icons-react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../../firebaseConfig";
import { useNavigate } from "react-router";

export default function LoginPage({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const navigate = useNavigate();
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      notifications.show({
        color: "red",
        title: "Missing info",
        message: "Enter email and password.",
        position: "top-center",
      });
      return;
    }
    setLoadingEmail(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      notifications.show({
        color: "green",
        title: "Welcome back",
        message: "Signed in successfully.",
        position: "top-center",
      });
      onSuccess?.();
      navigate("/");
    } catch (err) {
      const msg =
        err.code === "auth/invalid-credential"
          ? "Invalid email or password."
          : err.code === "auth/user-not-found"
          ? "No account found with that email."
          : err.code === "auth/too-many-requests"
          ? "Too many attempts. Try again later."
          : err.message;
      notifications.show({
        color: "red",
        title: "Sign-in failed",
        message: msg,
        position: "top-center",
      });
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      notifications.show({
        color: "green",
        title: "Signed in",
        message: "Google sign-in successful.",
        position: "top-center",
      });
      onSuccess?.();
      navigate("/");
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Google sign-in failed",
        message: err.message,
        position: "top-center",
      });
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleEmailLogin}
      withBorder
      shadow="sm"
      radius="md"
      p="lg"
      miw={320}
      maw={420}
      mx="auto"
      mt={60}
    >
      <Title order={2} mb="xs" ta="center">
        Log in
      </Title>

      <TextInput
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
        autoComplete="email"
        mb="sm"
      />

      <PasswordInput
        label="Password"
        placeholder="Your password"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        required
        autoComplete="current-password"
        mb="md"
      />

      <Button type="submit" fullWidth loading={loadingEmail}>
        Sign in
      </Button>

      <Divider label="or" my="md" />

      <Button
        variant="outline"
        leftSection={<IconBrandGoogle size={18} />}
        fullWidth
        onClick={handleGoogleLogin}
        loading={loadingGoogle}
      >
        Continue with Google
      </Button>

      <Group justify="center" mt="md">
        <Anchor href="/register" size="sm">
          Create an account
        </Anchor>
        {/* <Anchor href="/reset-password" size="sm">
          Forgot password?
        </Anchor> */}
      </Group>
    </Paper>
  );
}
