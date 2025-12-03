import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  SegmentedControl,
  Loader,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  collection,
  onSnapshot,
  query as fsQuery,
  where,
  orderBy,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ChatPopup from "./ChatPopUp";
import { db } from "../../../firebaseConfig";

function timeAgoTs(ts) {
  if (!ts) return "";
  const ms = ts.toMillis ? ts.toMillis() : 0;
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

export default function MessagesPage() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [filter, setFilter] = useState("all"); // all | open | resolved
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatPost, setActiveChatPost] = useState(null); // you can fetch post if needed
  const [chatOpen, setChatOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 48em)");

  // auth
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setMe(u || null);
    });
    return () => unsub();
  }, []);

  // chats subscribe
  useEffect(() => {
    if (!me) {
      setChats([]);
      setLoading(false);
      return;
    }

    const chatsRef = collection(db, "chats");
    const q = fsQuery(
      chatsRef,
      where("userIds", "array-contains", me.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setChats(data);
        setLoading(false);
      },
      (err) => {
        console.error("chats/onSnapshot", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [me]);

  const filtered = useMemo(() => {
    if (filter === "open") {
      return chats.filter((c) => !c.resolved);
    }
    if (filter === "resolved") {
      return chats.filter((c) => c.resolved);
    }
    return chats;
  }, [chats, filter]);

  const handleOpenChat = (chat) => {
    setActiveChatId(chat.id);
    // you can pass postTitle only, or fetch full post if you want
    setActiveChatPost({ id: chat.postId, title: chat.postTitle });
    setChatOpen(true);
  };

  if (!me) {
    return (
      <Box p="lg">
        <Text fw={600} size="lg">
          Messages
        </Text>
        <Text size="sm" c="dimmed" mt="xs">
          Please sign in to view your messages.
        </Text>
      </Box>
    );
  }

  return (
    <Box p="lg" style={{ maxWidth: "1170px", margin: "0 auto" }}>
      <Group justify="space-between" mb="md">
        <Box>
          <Text fw={700} size={isMobile ? "xl" : "28px"}>
            Messages
          </Text>
          <Text size="sm" c="dimmed">
            View your conversations about lost and found posts.
          </Text>
        </Box>
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          data={[
            { label: "All", value: "all" },
            { label: "Unresolved", value: "open" },
            { label: "Resolved", value: "resolved" },
          ]}
          size={isMobile ? "xs" : "sm"}
          radius="xl"
        />
      </Group>

      {loading ? (
        <Group justify="center" mt="lg">
          <Loader />
        </Group>
      ) : filtered.length === 0 ? (
        <Text size="sm" c="dimmed">
          No chats yet.
        </Text>
      ) : (
        <Box>
          {filtered.map((chat) => (
            <Card
              key={chat.id}
              withBorder
              radius="md"
              mb="sm"
              style={{
                cursor: "pointer",
                opacity: chat.resolved ? 0.7 : 1,
              }}
              onClick={() => handleOpenChat(chat)}
            >
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Group gap="xs" mb={4}>
                    <Text fw={600} size="sm">
                      {chat.postTitle || "Untitled post"}
                    </Text>
                    {chat.resolved && (
                      <Badge size="xs" color="gray" variant="light">
                        Resolved
                      </Badge>
                    )}
                  </Group>
                  {chat.lastMessage && (
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {chat.lastMessage}
                    </Text>
                  )}
                </Box>
                <Text size="xs" c="dimmed">
                  {timeAgoTs(chat.updatedAt)}
                </Text>
              </Group>
            </Card>
          ))}
        </Box>
      )}

      {activeChatId && (
        <ChatPopup
          opened={chatOpen}
          onClose={() => setChatOpen(false)}
          chatId={activeChatId}
          post={activeChatPost}
          me={me}
        />
      )}
    </Box>
  );
}
