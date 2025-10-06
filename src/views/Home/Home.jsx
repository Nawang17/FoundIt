// src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  TextInput,
  Select,
  SimpleGrid,
  Card,
  Group,
  Badge,
  Avatar,
  ActionIcon,
  Tooltip,
  Stack,
  SegmentedControl,
  rem,
  Skeleton,
  Loader,
  Flex,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconSearch,
  IconMapPin,
  IconTrash,
  IconMessage,
  IconCircleCheck,
} from "@tabler/icons-react";
import { useNavigate } from "react-router";

import {
  collection,
  onSnapshot,
  orderBy,
  query as fsQuery,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { db } from "../../../firebaseConfig";

function initials(name = "") {
  const parts = name.trim().split(" ");
  if (!parts[0]) return "?";
  return (parts[0][0] + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

// Simple "time ago" helper for Firestore Timestamps / Dates / numbers
function timeAgo(createdAt) {
  if (!createdAt) return "";
  const ms =
    typeof createdAt === "number"
      ? createdAt
      : createdAt?.toMillis
        ? createdAt.toMillis()
        : createdAt?.seconds
          ? createdAt.seconds * 1000
          : +createdAt || Date.now();
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("all"); // all | lost | found
  const [sortBy, setSortBy] = useState("latest"); // latest | alpha
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [me, setMe] = useState(null); // current user
  const [deletingId, setDeletingId] = useState(null);
  const isMobile = useMediaQuery("(max-width: 48em)");
  const nav = useNavigate();

  // auth subscribe
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => setMe(u || null));
    return () => unsub();
  }, []);

  // Subscribe to Firestore posts ordered by createdAt desc for "Latest"
  useEffect(() => {
    const q = fsQuery(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => {
          const v = d.data() || {};
          return {
            id: d.id,
            type: v.type || "lost",
            title: v.title || "",
            description: v.description || "",
            user: v.userName || "Unknown",
            userId: v.userId || null,
            location: v.location || "",
            createdAt: v.createdAt || null,
          };
        });
        setPosts(data);
        setLoading(false);
      },
      (err) => {
        console.error("posts/onSnapshot", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const counts = useMemo(() => {
    const lost = posts.filter((p) => p.type === "lost").length;
    const found = posts.filter((p) => p.type === "found").length;
    return { lost, found, all: posts.length };
  }, [posts]);

  const filtered = useMemo(() => {
    const bySeg =
      segment === "all" ? posts : posts.filter((p) => p.type === segment);

    const q = query.trim().toLowerCase();
    const byQuery = q
      ? bySeg.filter((p) => {
        const t = p.title?.toLowerCase() || "";
        const d = p.description?.toLowerCase() || "";
        const l = p.location?.toLowerCase() || "";
        const u = p.user?.toLowerCase() || "";
        return (
          t.includes(q) || d.includes(q) || l.includes(q) || u.includes(q)
        );
      })
      : bySeg;

    const bySort = [...byQuery].sort((a, b) => {
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      // latest (createdAt desc)
      const aMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bMs = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bMs - aMs;
    });

    return bySort;
  }, [posts, segment, query, sortBy]);

  const typeColor = (t) =>
    t === "lost" ? "red" : t === "found" ? "green" : "gray";

  // Confirm + delete flow using Mantine modals
  const confirmDelete = (postId) => {
    modals.openConfirmModal({
      title: "Delete this post?",
      children: (
        <Text size="sm">
          This action is permanent. The post will be removed for everyone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      centered: true,
      onConfirm: async () => {
        try {
          setDeletingId(postId);
          await deleteDoc(doc(db, "posts", postId));
          notifications.show({
            title: "Deleted",
            message: "Your post was deleted.",
            color: "green",
            position: "top-center",
          });
        } catch (e) {
          console.error("delete post", e);
          notifications.show({
            title: "Delete failed",
            message: "Could not delete the post. Try again.",
            color: "red",
            position: "top-center",
          });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <Box style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {/* Heading */}
      <Box mb="xs">
        <Text fw={700} size="28px" style={{ letterSpacing: "-0.3px" }}>
          Feed
        </Text>
        <Text c="dimmed" size="sm">
          Search the latest lost and found posts.
        </Text>
      </Box>

      {/* Filter bar */}
      <Box
        style={{
          position: "sticky",
          top: rem(64),
          zIndex: 5,
          background: "white",
          padding: "12px 0",
          borderBottom: "1px solid #edf2f7",
          marginBottom: "16px",
        }}
      >
        <Stack gap="xs">
          <TextInput
            placeholder="Search by item, location, or user"
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            radius="md"
            size={isMobile ? "sm" : "md"}
          />
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 220px",
              gap: "8px",
              alignItems: "stretch",
            }}
          >
            <SegmentedControl
              fullWidth
              radius="xl"
              size={isMobile ? "sm" : "md"}
              value={segment}
              onChange={setSegment}
              data={[
                { label: `All (${counts.all})`, value: "all" },
                { label: `Lost (${counts.lost})`, value: "lost" },
                { label: `Found (${counts.found})`, value: "found" },
              ]}
            />
            <Select
              radius="xl"
              size={isMobile ? "sm" : "md"}
              placeholder="Sort"
              data={[
                { value: "latest", label: "Latest" },
                { value: "alpha", label: "A to Z" },
              ]}
              value={sortBy}
              onChange={setSortBy}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
            />
          </Box>
        </Stack>
      </Box>

      {/* Grid */}
      {loading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} withBorder radius="lg" padding="md">
              <Skeleton height={18} mb="sm" />
              <Skeleton height={12} width="60%" mb={12} />
              <Skeleton height={12} mb={6} />
              <Skeleton height={12} width="90%" mb="md" />
              <Group justify="space-between" align="center">
                <Group>
                  <Skeleton height={28} circle />
                  <Skeleton height={12} width={120} />
                </Group>
                <Skeleton height={28} width={68} radius="xl" />
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {filtered.map((post) => {
            const isOwner = me && post.userId && me.uid === post.userId;
            const isDeleting = deletingId === post.id;

            return (
              <Card key={post.id} withBorder radius="lg" padding="md">
                {/* Title + Type + (owner delete) */}
                <Group justify="space-between" align="flex-start" mb={6}>
                  <Text fw={700} size="lg" style={{ letterSpacing: "-0.2px" }}>
                    {post.title}
                  </Text>
                  <Group gap="xs">
                    <Badge color={typeColor(post.type)}>{post.type}</Badge>
                    {isOwner && (
                      <Tooltip label="Delete post">
                        <ActionIcon
                          variant="subtle"
                          radius="xl"
                          size="lg"
                          aria-label="Delete"
                          onClick={() => confirmDelete(post.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader size="xs" />
                          ) : (
                            <IconTrash size={18} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>

                {post.location && (
                  <Flex align="center" gap={4} mb={6}>
                    <IconMapPin size={14} />
                    <Text size="xs" c="dimmed">
                      {post.location}
                    </Text>
                  </Flex>
                )}

                <Text size="sm" lineClamp={3} mt="sm" mb="md">
                  {post.description}
                </Text>

                {/* Footer */}
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="sm" align="center" wrap="nowrap">
                    <Avatar radius="xl" size={28}>
                      {initials(post.user)}
                    </Avatar>
                    <Box style={{ minWidth: 0 }}>
                      <Text size="sm" fw={600} style={{ lineHeight: 1 }}>
                        {post.user}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
                        {timeAgo(post.createdAt)}
                      </Text>
                    </Box>
                  </Group>
                  <Group gap={6}>
                    {isOwner && (
                      <Tooltip label="Mark as resolved">
                        <ActionIcon
                          variant="subtle"
                          radius="xl"
                          size="lg"
                          aria-label="Mark as resolved"
                        >
                          <IconCircleCheck size={18} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Message user">
                      <ActionIcon
                        variant="subtle"
                        radius="xl"
                        size="lg"
                        aria-label="Message user"
                      >
                        <IconMessage size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Box>
  );
}
