import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Avatar,
  ActionIcon,
  Tooltip,
  Flex,
  Button,
  Skeleton,
  Stack,
  SegmentedControl,
  rem,
  Loader,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconMapPin, IconTrash, IconCircleCheck } from "@tabler/icons-react";
import { useNavigate } from "react-router";

import {
  collection,
  query as fsQuery,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  serverTimestamp,
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

export default function ProfilePage() {
  const [segment, setSegment] = useState("all"); // all | active | resolved
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const isMobile = useMediaQuery("(max-width: 48em)");
  const columns = isMobile ? 1 : 2; // Masonry columns
  const nav = useNavigate();

  // Auth subscribe
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        nav("/login");
      }
    });
    return () => unsub();
  }, [nav]);

  // Subscribe to user's posts from Firestore
  useEffect(() => {
    if (!user) return;

    const q = fsQuery(
      collection(db, "posts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

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
            imageUrl: v.imageUrl || null, // ⬅️ Cloudinary secure_url if present
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
  }, [user]);

  const counts = useMemo(() => {
    const active = posts.filter((p) => !p.resolved).length;
    const resolved = posts.filter((p) => p.resolved).length;
    return { active, resolved, all: posts.length };
  }, [posts]);

  const filtered = useMemo(() => {
    if (segment === "all") return posts;
    if (segment === "active") return posts.filter((p) => !p.resolved);
    if (segment === "resolved") return posts.filter((p) => p.resolved);
    return posts;
  }, [posts, segment]);

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

          try {
            const chatsRef = collection(db, "chats");
            const q = fsQuery(chatsRef, where("postId", "==", post.id));
            const snap = await getDocs(q);

            const updates = snap.docs.map((d) =>
              updateDoc(d.ref, {
                resolved: willResolve,
                updatedAt: serverTimestamp(),
              })
            );

            await Promise.all(updates);
          } catch (err) {
            console.error("update chats for resolved post", err);
          }

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
      {/* Profile Header */}
      <Box mb="lg">
        <Group align="center" mb="md">
          <Avatar size="xl" radius="xl">
            {user?.displayName
              ? initials(user.displayName)
              : user?.email?.[0]?.toUpperCase() || "?"}
          </Avatar>
          <Box>
            <Text fw={700} size="28px" style={{ letterSpacing: "-0.3px" }}>
              {user?.displayName || user?.email || "Profile"}
            </Text>
            <Text c="dimmed" size="sm">
              {user?.email}
            </Text>
          </Box>
        </Group>
      </Box>

      {/* My Posts Section */}
      <Box mb="xs">
        <Text fw={700} size="24px" style={{ letterSpacing: "-0.3px" }}>
          My Posts
        </Text>
        <Text c="dimmed" size="sm">
          Manage your lost and found posts.
        </Text>
      </Box>

      {/* Filter bar */}
      <Box mb="lg">
        <Stack gap="xs">
          <SegmentedControl
            fullWidth
            radius="xl"
            size={isMobile ? "sm" : "md"}
            value={segment}
            onChange={setSegment}
            data={[
              { label: `All (${counts.all})`, value: "all" },
              { label: `Active (${counts.active})`, value: "active" },
              { label: `Resolved (${counts.resolved})`, value: "resolved" },
            ]}
          />
        </Stack>
      </Box>

      {/* Loading: show skeleton cards inside masonry columns */}
      {loading ? (
        <Box style={{ columnCount: isMobile ? 1 : 2, columnGap: "24px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
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
              <Skeleton height={180} mb="md" />
              <Skeleton height={18} mb="sm" />
              <Skeleton height={12} width="60%" mb={12} />
              <Skeleton height={12} mb={6} />
              <Skeleton height={12} width="90%" mb="md" />
              <Group justify="space-between" align="center">
                <Skeleton height={12} width={120} />
                <Skeleton height={28} width={68} radius="xl" />
              </Group>
            </Card>
          ))}
        </Box>
      ) : filtered.length === 0 ? (
        <Card withBorder radius="lg" padding="xl">
          <Text ta="center">
            {segment === "all"
              ? "You haven't created any posts yet."
              : segment === "active"
              ? "You don't have any active posts."
              : "You don't have any resolved posts."}
          </Text>
          {segment === "all" && (
            <Group justify="center" mt="md">
              <Button onClick={() => nav("/create-post")} color="blue">
                {posts.length === 0 ? "Create your first post" : "Create post"}
              </Button>
            </Group>
          )}
        </Card>
      ) : (
        // Loaded: Masonry container fixes row-height locking (no blank space)
        <Box style={{ columnCount: columns, columnGap: "24px" }}>
          {filtered.map((post) => {
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
                  opacity: post.resolved ? 0.6 : 1,
                }}
              >
                {/* MEDIA (Cloudinary URL via plain <img>, optional + compact) */}
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
                        height: 200, // compact hero
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                )}

                {/* Title + Type + Actions */}
                <Group justify="space-between" align="flex-start" mb={6}>
                  <Text fw={700} size="md" style={{ letterSpacing: "-0.2px" }}>
                    {post.title}
                  </Text>
                  <Group gap="xs" align="center">
                    <Badge color={typeColor(post.type)}>{post.type}</Badge>
                    {post.resolved && (
                      <Badge color="gray" variant="light">
                        Resolved
                      </Badge>
                    )}
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
                  <Text size="xs" c="dimmed">
                    {timeAgo(post.createdAt)}
                  </Text>
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
                </Group>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
