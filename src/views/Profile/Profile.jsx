import { useEffect, useState } from "react";
import {
    Box,
    Text,
    Card,
    Group,
    Avatar,
    Center,
    Button,
} from "@mantine/core";
import { useNavigate } from "react-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";

function initials(name = "") {
    const parts = name.trim().split(" ");
    if (!parts[0]) return "?";
    return (parts[0][0] + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const nav = useNavigate();

    // Auth subscribe
    useEffect(() => {
        const auth = getAuth();
        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) {
                setUser(u);
            } else {
                // Redirect to login if not authenticated
                nav("/login");
            }
        });
        return () => unsub();
    }, [nav]);

    return (
        <Box style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
            <Card withBorder radius="lg" padding="xl">
                <Center mb="xl">
                    <Avatar size={120} radius={120}>
                        {user?.displayName ? initials(user.displayName) : user?.email?.[0]?.toUpperCase() || "?"}
                    </Avatar>
                </Center>

                <Center>
                    <Box ta="center">
                        <Text fw={700} size="28px" style={{ letterSpacing: "-0.3px" }}>
                            {user?.displayName || "Welcome!"}
                        </Text>
                        <Text c="dimmed" size="md" mb="lg">
                            {user?.email || ""}
                        </Text>

                        <Button onClick={() => nav("/")} color="blue">
                            Back to Home
                        </Button>
                    </Box>
                </Center>
            </Card>
        </Box>
    );
}
