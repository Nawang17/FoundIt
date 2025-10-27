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
  Stack,
  Alert,
  Switch,
  FileInput,
  Image,
} from "@mantine/core";
import { IconAlertCircle, IconPhoto, IconX } from "@tabler/icons-react";
import { useNavigate } from "react-router";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { notifications } from "@mantine/notifications";

const CLOUD_NAME = "dwzjfylgh";
const UPLOAD_PRESET = "eoynoewz"; // import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

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

  // image state
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

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

  // 5 MB client cap (Cloudinary can take more, but keep UX snappy)
  const MAX_BYTES = 5 * 1024 * 1024;

  const handleImageChange = (file) => {
    setError("");
    setImageFile(null);
    setPreviewUrl("");

    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  };

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!description.trim()) return "Description is required";
    return "";
  };

  async function uploadToCloudinary(file) {
    // Uses unsigned preset. Secure production setups should use **signed** uploads via your backend.
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    // Optional: eager transformations, folder, tags, etc.
    // form.append("folder", "lostfound");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      {
        method: "POST",
        body: form,
      }
    );

    const data = await res.json();
    if (!res.ok || !data.secure_url) {
      const msg = data?.error?.message || "Cloudinary upload failed";
      throw new Error(msg);
    }
    // Return key bits
    return {
      imageUrl: data.secure_url,
      imagePublicId: data.public_id,
      // you can also store width/height if you want: data.width, data.height
    };
  }

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
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError(
        "Cloudinary is not configured. Set your cloud name and upload preset."
      );
      return;
    }

    setSubmitting(true);
    try {
      let uploadResult = null;
      if (imageFile) {
        uploadResult = await uploadToCloudinary(imageFile);
      }

      const post = {
        type,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        userId: user.uid,
        userName: anonymous
          ? "Anonymous"
          : user.displayName || user.email?.split("@")[0] || "Unknown",
        anonymous,
        createdAt: serverTimestamp(),
        resolved: false,
        ...(uploadResult || {}), // adds imageUrl, imagePublicId if present
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
      setError(e.message || "Failed to create post. Please try again.");
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
        Add a clear title, location, and details. Optional: add one photo (≤ 5
        MB).
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

          <FileInput
            label="Photo (optional)"
            placeholder="Select an image (≤ 5 MB)"
            accept="image/*"
            radius="md"
            leftSection={<IconPhoto size={16} />}
            value={imageFile}
            onChange={handleImageChange}
            clearable
            description="JPEG/PNG/WebP recommended. Uploaded to Cloudinary; URL stored in the post."
          />

          {previewUrl && (
            <Card withBorder radius="md" p="sm">
              <Group justify="space-between" align="center" mb="sm">
                <Text size="sm" fw={600}>
                  Preview
                </Text>
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<IconX size={14} />}
                  onClick={clearImage}
                >
                  Remove
                </Button>
              </Group>
              <Image
                src={previewUrl}
                alt="Selected image preview"
                radius="md"
                maw={280}
                mah={280}
                fit="contain"
              />
              <Text size="xs" c="dimmed" mt="xs">
                This is a local preview. The image will be uploaded when you
                submit the post.
              </Text>
            </Card>
          )}

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
