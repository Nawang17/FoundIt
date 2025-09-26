import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Text,
  TextInput,
  Textarea,
  SegmentedControl,
  Group,
  Button,
  Select,
  Stack,
  Alert,
  Switch,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useNavigate } from "react-router";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { notifications } from "@mantine/notifications";

export default function CreatePostPage() {
  const nav = useNavigate();
  const auth = useMemo(() => getAuth(), []);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // form state
  const [type, setType] = useState("lost");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, [auth]);

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!description.trim()) return "Description is required";
    return "";
  };

  const handleSubmit = async () => {
    setError("");
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    if (!user) {
      setError("You must be signed in to create a post");
      return;
    }

    setSubmitting(true);
    try {
      const post = {
        type,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        userId: user.uid,
        userName: anonymous
          ? "Anonymous"
          : user.displayName || user.email?.split("@")[0] || "Unknown",
        anonymous, // store this flag
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "posts"), post);
      notifications.show({
        title: "Post created",
        message: "Your post has been created successfully.",
        color: "green",
        position: "top-center",
      });
      nav("/"); // back to feed
    } catch (e) {
      console.error(e);
      setError("Failed to create post. Please try again.");
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <Box p="lg">
        <Text size="sm" c="dimmed">
          Checking sign in status...
        </Text>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
        <Card withBorder radius="lg" p="xl">
          <Stack gap="md">
            <Text fw={700} size="xl">
              Sign in required
            </Text>
            <Text c="dimmed" size="sm">
              You need to be signed in to create a post.
            </Text>
            <Group>
              <Button onClick={() => nav("/login")} radius="md">
                Go to Sign In
              </Button>
              <Button variant="light" onClick={() => nav("/")} radius="md">
                Back to Feed
              </Button>
            </Group>
          </Stack>
        </Card>
      </Box>
    );
  }

  return (
    <Box style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      <Text fw={700} size="28px" mb="xs" style={{ letterSpacing: "-0.3px" }}>
        Create a Post
      </Text>
      <Text c="dimmed" size="sm" mb="md">
        Add a clear title, location, and details.
      </Text>

      {error && (
        <Alert
          mb="md"
          icon={<IconAlertCircle size={16} />}
          color="red"
          radius="md"
        >
          {error}
        </Alert>
      )}

      <Card withBorder radius="lg" p="xl">
        <Stack gap="md">
          <SegmentedControl
            value={type}
            onChange={setType}
            data={[
              { label: "Lost", value: "lost" },
              { label: "Found", value: "found" },
            ]}
            radius="xl"
            size="md"
          />

          <TextInput
            label="Title"
            placeholder="Black North Face backpack"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
            radius="md"
          />

          <TextInput
            label="Location"
            placeholder="Hunter College Library, 3rd floor"
            value={location}
            onChange={(e) => setLocation(e.currentTarget.value)}
            radius="md"
          />

          <Textarea
            label="Description"
            placeholder="Include color, brand, stickers, where you last saw it, and any helpful details"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={4}
            autosize
            required
            radius="md"
          />

          <Switch
            label="Post anonymously"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.currentTarget.checked)}
          />

          <Group justify="flex-end" mt="xs">
            <Button
              variant="light"
              onClick={() => nav("/")}
              radius="md"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting} radius="md">
              Post
            </Button>
          </Group>
        </Stack>
      </Card>
    </Box>
  );
}
