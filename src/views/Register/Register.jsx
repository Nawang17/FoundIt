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
  Checkbox,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { IconBrandGoogle } from "@tabler/icons-react";
import { auth } from "../../../firebaseConfig";
import { useNavigate } from "react-router";

export default function RegisterPage({ onSuccess }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const navigate = useNavigate();
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleEmailRegister = async (e) => {
    e.preventDefault();

    if (!email || !pw || !pw2) {
      notifications.show({
        color: "red",
        title: "Missing info",
        message: "Fill all required fields.",
        position: "top-center",
      });
      return;
    }
    if (pw !== pw2) {
      notifications.show({
        color: "red",
        title: "Password mismatch",
        message: "Passwords do not match.",
        position: "top-center",
      });
      return;
    }
    if (pw.length < 6) {
      notifications.show({
        color: "red",
        title: "Weak password",
        message: "Use at least 6 characters.",
        position: "top-center",
      });
      return;
    }

    setLoadingEmail(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      if (displayName) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }

      notifications.show({
        color: "green",
        title: "Account created",
        message: "Welcome to FoundIt!",
        position: "top-center",
      });
      onSuccess?.();
      navigate("/");
    } catch (err) {
      const msg =
        err.code === "auth/email-already-in-use"
          ? "That email is already registered."
          : err.code === "auth/invalid-email"
          ? "Enter a valid email address."
          : err.code === "auth/operation-not-allowed"
          ? "Email/password sign-up is disabled in Firebase."
          : err.message;
      notifications.show({
        color: "red",
        title: "Registration failed",
        message: msg,
        position: "top-center",
      });
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider); // creates the account if new
      notifications.show({
        color: "green",
        title: "Signed in",
        message: "Google account connected.",
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
      onSubmit={handleEmailRegister}
      withBorder
      shadow="sm"
      radius="md"
      p="lg"
      miw={320}
      maw={480}
      mx="auto"
      mt={60}
    >
      <Title order={2} mb="xs" ta="center">
        Create your account
      </Title>

      <TextInput
        label="Display name (optional)"
        placeholder="e.g., Nawang"
        value={displayName}
        onChange={(e) => setDisplayName(e.currentTarget.value)}
        mb="sm"
      />

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
        placeholder="At least 6 characters"
        value={pw}
        onChange={(e) => setPw(e.currentTarget.value)}
        required
        autoComplete="new-password"
        mb="sm"
      />

      <PasswordInput
        label="Confirm password"
        placeholder="Re-enter password"
        value={pw2}
        onChange={(e) => setPw2(e.currentTarget.value)}
        required
        autoComplete="new-password"
        mb="md"
      />

      <Button type="submit" fullWidth loading={loadingEmail}>
        Create account
      </Button>

      <Divider label="or" my="md" />

      <Button
        variant="outline"
        leftSection={<IconBrandGoogle size={18} />}
        fullWidth
        onClick={handleGoogle}
        loading={loadingGoogle}
      >
        Continue with Google
      </Button>

      <Group justify="center" mt="md">
        <Anchor href="/login" size="sm">
          Already have an account? Log in
        </Anchor>
      </Group>
    </Paper>
  );
}
