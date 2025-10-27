import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  TextInput,
  Select,
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

import {
  collection,
  onSnapshot,
  orderBy,
  query as fsQuery,
  deleteDoc,
  doc,
  updateDoc,
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

// "time ago" helper
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
  const [includeResolved, setIncludeResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [me, setMe] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const isMobile = useMediaQuery("(max-width: 48em)");
  const columns = isMobile ? 1 : 2; // Masonry columns

  // auth subscribe
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => setMe(u || null));
    return () => unsub();
  }, []);

  // Firestore subscribe (latest first)
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
            resolved: !!v.resolved,
            imageUrl: v.imageUrl || null, // Cloudinary secure_url from create page
          };
        });
        setPosts(data.filter((p) => !p.resolved)); // hide resolved by default
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

    const qtext = query.trim().toLowerCase();
    const byQuery = qtext
      ? bySeg.filter((p) => {
          const t = p.title?.toLowerCase() || "";
          const d = p.description?.toLowerCase() || "";
          const l = p.location?.toLowerCase() || "";
          return t.includes(qtext) || d.includes(qtext) || l.includes(qtext);
        })
      : bySeg;

    const byStatus = includeResolved
      ? byQuery
      : byQuery.filter((p) => !p.resolved);

    const bySort = [...byStatus].sort((a, b) => {
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      const aMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bMs = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bMs - aMs;
    });

    return bySort;
  }, [posts, segment, query, sortBy, includeResolved]);

  const typeColor = (t) =>
    t === "lost" ? "red" : t === "found" ? "green" : "gray";

  // Confirm + delete
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

  // Confirm + toggle resolved
  const confirmToggleResolved = (post) => {
    const willResolve = !post.resolved;
    modals.openConfirmModal({
      title: willResolve ? "Mark as resolved?" : "Unresolve this post?",
      children: (
        <Text size="sm">
          {willResolve
            ? "This will mark the item as resolved and hide it from the feed by default."
            : "This will mark the item as not resolved so it appears in the active feed again."}
        </Text>
      ),
      labels: {
        confirm: willResolve ? "Mark resolved" : "Unresolve",
        cancel: "Cancel",
      },
      confirmProps: { color: willResolve ? "green" : "gray" },
      centered: true,
      onConfirm: async () => {
        try {
          setResolvingId(post.id);
          await updateDoc(doc(db, "posts", post.id), { resolved: willResolve });
          notifications.show({
            title: willResolve ? "Marked as resolved" : "Marked as unresolved",
            message: willResolve
              ? "The post is now hidden from the default feed."
              : "The post is active again.",
            color: willResolve ? "green" : "blue",
            position: "top-center",
          });
        } catch (e) {
          console.error("toggle resolved", e);
          notifications.show({
            title: "Update failed",
            message: "Could not update the post. Try again.",
            color: "red",
            position: "top-center",
          });
        } finally {
          setResolvingId(null);
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
            placeholder="Search by item or location"
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

      {/* LOADING: skeletons in two masonry columns */}
      {loading ? (
        <Box
          style={{
            columnCount: columns,
            columnGap: "24px",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              withBorder
              radius="lg"
              padding="md"
              style={{
                breakInside: "avoid",
                WebkitColumnBreakInside: "avoid",
                marginBottom: 24,
                display: "inline-block",
                width: "100%",
              }}
            >
              <Skeleton height={220} mb="md" />
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
        </Box>
      ) : (
        // LOADED: Masonry container (no row-height lock)
        <Box
          style={{
            columnCount: columns,
            columnGap: "24px",
          }}
        >
          {filtered.map((post) => {
            const isOwner = me && post.userId && me.uid === post.userId;
            const isDeleting = deletingId === post.id;
            const isResolving = resolvingId === post.id;

            return (
              <Card
                key={post.id}
                withBorder
                radius="lg"
                padding="md"
                style={{
                  breakInside: "avoid",
                  WebkitColumnBreakInside: "avoid",
                  marginBottom: 24,
                  display: "inline-block",
                  width: "100%",
                  opacity: includeResolved && post.resolved ? 0.6 : 1,
                }}
              >
                {/* MEDIA (Cloudinary URL via plain <img>) */}
                {post.imageUrl && (
                  <div
                    style={{
                      width: "100%",
                      overflow: "hidden",
                      borderRadius: 12,
                      marginBottom: 12,
                      background: "#f6f7f8",
                    }}
                  >
                    <img
                      src={
                        post.imageUrl.includes("/upload/")
                          ? post.imageUrl.replace(
                              "/upload/",
                              "/upload/f_auto,q_auto,c_fill,w_900,h_500/"
                            )
                          : post.imageUrl
                      }
                      alt={post.title || "Post image"}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "auto",
                        aspectRatio: "16 / 9", // consistent crop, but masonry tolerates variable heights
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                )}

                {/* Title + Type + actions */}
                <Group justify="space-between" align="flex-start" mb={6}>
                  <Text fw={700} size="md" style={{ letterSpacing: "-0.2px" }}>
                    {post.title}
                  </Text>
                  <Group gap="xs" align="center">
                    <Badge color={typeColor(post.type)}>{post.type}</Badge>
                    {post.resolved && includeResolved && (
                      <Badge color="gray" variant="light">
                        Resolved
                      </Badge>
                    )}
                    {isOwner && (
                      <Tooltip label="Delete post">
                        <ActionIcon
                          variant="subtle"
                          radius="xl"
                          size="lg"
                          aria-label="Delete"
                          onClick={() => confirmDelete(post.id)}
                          disabled={isDeleting || isResolving}
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

                <Text size="sm" lineClamp={2} mt="sm" mb="md">
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
                      <Tooltip
                        label={post.resolved ? "Unresolve" : "Mark as resolved"}
                      >
                        <ActionIcon
                          variant={post.resolved ? "light" : "subtle"}
                          radius="xl"
                          size="lg"
                          aria-label="Toggle resolved"
                          onClick={() => confirmToggleResolved(post)}
                          disabled={isResolving || isDeleting}
                        >
                          {isResolving ? (
                            <Loader size="xs" />
                          ) : (
                            <IconCircleCheck size={18} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {!isOwner && (
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
                    )}
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
