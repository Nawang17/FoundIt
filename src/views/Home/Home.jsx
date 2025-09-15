import { useMemo, useState } from "react";
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
  Image,
  Stack,
  SegmentedControl,
  rem,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconSearch, IconBookmark, IconShare2 } from "@tabler/icons-react";

function initials(name = "") {
  const parts = name.trim().split(" ");
  if (!parts[0]) return "?";
  return (parts[0][0] + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("all"); // all | lost | found
  const [sortBy, setSortBy] = useState("latest"); // latest | alpha | withImage
  const isMobile = useMediaQuery("(max-width: 48em)");

  // Demo posts
  const posts = [
    {
      id: 1,
      type: "lost",
      title: "Black North Face Backpack",
      description:
        "Left near Hunter College library silent floor. Has physics notes inside.",
      user: "Alice Johnson",
      time: "2h ago",
      location: "Hunter College Library",
    },
    {
      id: 2,
      type: "found",
      title: "Black iPhone 13",
      description:
        "Found at Starbucks on 68th St. Lock screen shows a golden retriever.",
      user: "Bob Lee",
      time: "5h ago",
      image:
        "https://cdn.arstechnica.net/wp-content/uploads/2021/09/iPhone-13-mini-scaled.jpeg",
      location: "Starbucks 68th St",
    },
    {
      id: 3,
      type: "lost",
      title: "Keys with Red Keychain",
      description: "Fell near subway entrance. Keychain says CUNY.",
      user: "Charlie Kim",
      time: "1d ago",
      location: "68 St–Hunter College",
    },
    {
      id: 4,
      type: "found",
      title: "Blue Hydro Flask Bottle",
      description:
        "32oz with stickers on it. Picked up near the campus gym entrance.",
      user: "Dana Ortiz",
      time: "1d ago",
      image:
        "https://i.redd.it/how-to-make-stickers-stick-on-my-hydro-flask-ive-tried-v0-cdzzzut1wqf81.jpg?width=3000&format=pjpg&auto=webp&s=cdbb3337a6db30d9afa7682326d67f94ee3ee140",
      location: "Campus Gym",
    },
    {
      id: 5,
      type: "lost",
      title: "MacBook Pro 14-inch",
      description:
        "Laptop in a gray sleeve, last seen in the cafeteria. Very important files inside.",
      user: "Ethan Park",
      time: "2d ago",
      image:
        "https://www.cnet.com/a/img/resize/744ffe800ebfcf37a46faba935674ae68403efa0/hub/2021/10/23/80425069-0d3e-4c67-9085-a66e6177fc60/macbook-pro-2021-cnet-review-12.jpg?auto=webp&width=1200",
      location: "Hunter College Cafeteria",
    },
    {
      id: 6,
      type: "found",
      title: "Set of Earbuds",
      description:
        "White AirPods Pro in a small case found near the library entrance.",
      user: "Fiona Lee",
      time: "3d ago",
      location: "Library Entrance",
    },
    {
      id: 7,
      type: "lost",
      title: "Green Jacket",
      description:
        "Patagonia jacket left in a lecture hall after evening class.",
      user: "George Smith",
      time: "4d ago",
      image: "https://i.ebayimg.com/images/g/-dAAAOSwk8hmh7ow/s-l400.jpg",
      location: "Lecture Hall B",
    },
    {
      id: 8,
      type: "found",
      title: "Wallet with Hunter ID",
      description:
        "Brown leather wallet with student ID inside. Turned in to security desk.",
      user: "Helen Chen",
      time: "5d ago",
      location: "Security Desk",
    },
  ];

  const counts = useMemo(() => {
    const lost = posts.filter((p) => p.type === "lost").length;
    const found = posts.filter((p) => p.type === "found").length;
    return { lost, found, all: posts.length };
  }, [posts]);

  const filtered = useMemo(() => {
    const bySeg = posts.filter((p) =>
      segment === "all" ? true : p.type === segment
    );
    const q = query.trim().toLowerCase();
    const byQuery = q
      ? bySeg.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            (p.location ?? "").toLowerCase().includes(q) ||
            (p.user ?? "").toLowerCase().includes(q)
        )
      : bySeg;

    const bySort = [...byQuery].sort((a, b) => {
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      if (sortBy === "withImage") return (b.image ? 1 : 0) - (a.image ? 1 : 0);
      return 0; // latest
    });

    return bySort;
  }, [posts, segment, query, sortBy]);

  const typeColor = (t) =>
    t === "lost" ? "red" : t === "found" ? "green" : "gray";

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
                { value: "withImage", label: "Photos first" },
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
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {filtered.map((post) => {
          const hasImage = Boolean(post.image);
          return (
            <Card key={post.id} withBorder radius="lg" padding="md">
              {/* Media */}
              {hasImage ? (
                <Image
                  src={post.image}
                  alt={post.title}
                  height={180}
                  radius="md"
                  fit="cover"
                  withPlaceholder
                  mb="sm"
                />
              ) : (
                <Box
                  style={{
                    height: 180,
                    borderRadius: 8,
                    background: "#f5f7fa",
                    display: "grid",
                    placeItems: "center",
                    color: "#94a3b8",
                    fontSize: 13,
                    marginBottom: "12px",
                  }}
                >
                  No image
                </Box>
              )}

              {/* Content */}
              <Group justify="space-between" mb={6}>
                <Text fw={700} size="lg" style={{ letterSpacing: "-0.2px" }}>
                  {post.title}
                </Text>
                <Badge color={typeColor(post.type)}>{post.type}</Badge>
              </Group>
              {post.location && (
                <Text size="xs" c="dimmed" mb={8}>
                  {post.location}
                </Text>
              )}
              <Text size="sm" c="dimmed" lineClamp={3} mb="md">
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
                      {post.time}
                    </Text>
                  </Box>
                </Group>
                <Group gap={6}>
                  <Tooltip label="Save">
                    <ActionIcon variant="subtle" radius="xl" size="lg">
                      <IconBookmark size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Share">
                    <ActionIcon variant="subtle" radius="xl" size="lg">
                      <IconShare2 size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
