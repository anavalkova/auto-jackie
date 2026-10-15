import { createFileRoute } from "@tanstack/react-router";
import { JackieHome } from "@/components/jackie-home";

export const Route = createFileRoute("/c/$chatId")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Your chat with Jackie — AutoJackie" },
    { name: "description", content: "A saved conversation with Jackie, visible only to you." },
    { property: "og:title", content: "Your chat with Jackie — AutoJackie" },
    { property: "og:description", content: "A saved AutoJackie conversation, visible only to its owner." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ChatPage,
});

function ChatPage() {
  const { chatId } = Route.useParams();
  return <JackieHome key={chatId} chatId={chatId}/>;
}
