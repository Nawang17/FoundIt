import { Modal, TextInput, Button, Stack } from "@mantine/core";
import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../../firebaseConfig";

export default function ChatPopUp({ opened, onClose, receiverUid, receiverName }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const messagesRef = collection(db, "messages");

  // Get current user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const uid = currentUser?.uid;
  const displayName = currentUser?.displayName || "Unknown";

  // Listen for messages between current user and receiver
  useEffect(() => {
    if (!uid || !receiverUid) return;

    //subcollection that shows which two users are chatting
    const chatId = [uid, receiverUid].sort().join("_");

    const q = query(
      messagesRef,
      where("participants", "array-contains", uid),
      where("chatId", "==", chatId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = all.filter(m => m.participants.includes(receiverUid));
      setMessages(filtered);
    }, error => {
      console.error("Failed to fetch messages:", error);
    });

    return () => unsubscribe();
  }, [uid, receiverUid]);

  // Send message
  const sendMessage = async () => {

    if (!text.trim()) return;
    if (!uid) {
      console.warn("User not logged in yet!");
      return;
    }
    if (!receiverUid) {
      console.warn("Receiver UID is missing!");
      return;
    }
    if (!currentUser) return null;

    console.log("currentUser.uid:", currentUser?.uid); //test which users are chatting
    console.log("participants array:", [uid, receiverUid]);
    try {
      await addDoc(messagesRef, {
        text: text.trim(),
        createdAt: serverTimestamp(),
        senderId: uid,
        receiverId: receiverUid,
        participants: Array.from(new Set([uid, receiverUid])),
        displayName,
        chatId: [uid, receiverUid].sort().join("_")
      });
      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };


  return (
    <Modal opened={opened} onClose={onClose} title={`Chat with ${receiverName}`} centered>
      <Stack>
        <TextInput
          placeholder="Say something..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={() => {sendMessage(); setText("");}}>Send</Button>
      </Stack>
    </Modal>
  );
}
