import { createFileRoute } from "@tanstack/react-router";
import { JackieHome } from "@/components/jackie-home";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "AutoJackie — Car trouble, translated" },
    { name: "description", content: "Ask Jackie about noises, warning lights and parts. Plain-English car answers for drivers in Sweden, with sources linked." },
    { property: "og:title", content: "AutoJackie — Car trouble, translated" },
    { property: "og:description", content: "Plain-English car answers with linked sources. Private by default; sign in only if you want to save your car and chats." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <JackieHome/>,
});
