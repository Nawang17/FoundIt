import { useEffect, useState, useRef } from "react";
import {
  Modal,
  Box,
  Text,
  Group,
  ScrollArea,
  TextInput,
  ActionIcon,
  Loader,
  Badge,
} from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import {
  doc,
  onSnapshot,
  collection,
  orderBy,
  query as fsQuery,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";

export default function ChatPopup({ opened, onClose, chatId, post, me }) {
  const [chatMeta, setChatMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const viewportRef = useRef(null);

  // Subscribe to chat metadata
  useEffect(() => {
    if (!chatId) return;

    const ref = doc(db, "chats", chatId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      setChatMeta({ id: snap.id, ...snap.data() });
    });

    return () => unsub();
  }, [chatId]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;

    const msgsRef = collection(db, "chats", chatId, "messages");
    const q = fsQuery(msgsRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(data);

      // scroll to bottom
      if (viewportRef.current) {
        const el = viewportRef.current;
        requestAnimationFrame(() => {
          el.scrollTo({ top: el.scrollHeight });
        });
      }
    });

    return () => unsub();
  }, [chatId]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !me || !chatId) return;
    if (chatMeta?.resolved) return;

    try {
      setSending(true);
      const msgsRef = collection(db, "chats", chatId, "messages");
      await addDoc(msgsRef, {
        text,
        senderId: me.uid,
        senderName: me.displayName || "User",
        createdAt: serverTimestamp(),
      });

      // update chat meta
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        lastMessage: text,
        lastSenderId: me.uid,
        updatedAt: serverTimestamp(),
      });

      setInput("");
    } catch (err) {
      console.error("send message", err);
    } finally {
      setSending(false);
    }
  };

  const title = post?.title || chatMeta?.postTitle || "Chat";

  const isClosed = !!chatMeta?.resolved;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" align="center">
          <Box>
            <Text fw={600} size="sm">
              {title}
            </Text>
            <Text size="xs" c="dimmed">
              Private chat about this post
            </Text>
          </Box>
          {isClosed && (
            <Badge color="gray" variant="light">
              Resolved
            </Badge>
          )}
        </Group>
      }
      size="md"
      radius="lg"
      centered
    >
      {!chatMeta ? (
        <Group justify="center" py="md">
          <Loader />
        </Group>
      ) : (
        <Box style={{ display: "flex", flexDirection: "column", height: 400 }}>
          <ScrollArea
            style={{ flex: 1, borderRadius: 8, border: "1px solid #eee" }}
            viewportRef={viewportRef}
          >
            <Box p="sm">
              {messages.length === 0 && (
                <Text size="xs" c="dimmed">
                  Start the conversation.
                </Text>
              )}
              {messages.map((m) => {
                const isMine = m.senderId === me?.uid;
                return (
                  <Group
                    key={m.id}
                    justify={isMine ? "flex-end" : "flex-start"}
                    mb={6}
                  >
                    <Box
                      px="sm"
                      py={6}
                      style={{
                        maxWidth: "75%",
                        borderRadius: 16,
                        backgroundColor: isMine ? "#228be6" : "#f1f3f5",
                        color: isMine ? "white" : "black",
                      }}
                    >
                      <Text size="xs" fw={500}>
                        {isMine ? "You" : m.senderName || "User"}
                      </Text>
                      <Text size="sm">{m.text}</Text>
                    </Box>
                  </Group>
                );
              })}
            </Box>
          </ScrollArea>

          <Box mt="sm">
            {isClosed && (
              <Text size="xs" c="dimmed" mb={4}>
                This post has been resolved. Chat is closed.
              </Text>
            )}
            <form onSubmit={handleSend}>
              <Group gap="xs" align="center">
                <TextInput
                  style={{ flex: 1 }}
                  placeholder={
                    isClosed ? "Chat is closed" : "Type your message..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.currentTarget.value)}
                  disabled={sending || isClosed}
                />
                <ActionIcon
                  type="submit"
                  radius="xl"
                  size="lg"
                  disabled={!input.trim() || sending || isClosed}
                >
                  {sending ? <Loader size="xs" /> : <IconSend size={18} />}
                </ActionIcon>
              </Group>
            </form>
          </Box>
        </Box>
      )}
    </Modal>
  );
}
