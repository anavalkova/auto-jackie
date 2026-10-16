import { createFileRoute } from "@tanstack/react-router";
import { WorkshopDashboard } from "@/components/workshop-dashboard";

export const Route = createFileRoute("/workshop")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Workshop dashboard — AutoJackie" },
    { name: "description", content: "See driver requests from Jackie, rough estimates and your open pipeline in one place." },
    { property: "og:title", content: "Workshop dashboard — AutoJackie" },
    { property: "og:description", content: "Driver requests summarised by Jackie, ready for your workshop to call back." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: WorkshopDashboard,
});
