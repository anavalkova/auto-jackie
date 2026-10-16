import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { JackieHome, type WorkshopBrand } from "@/components/jackie-home";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/w/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase.rpc("workshop_public_profile", { _slug: params.slug });
    if (!data) throw notFound();
    return { shop: data as unknown as WorkshopBrand };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.shop.name ?? "Workshop";
    const title = `${name} · Ask Jackie about your car`;
    const desc = `Tell Jackie what your car is doing. Plain-language help and an easy booking with ${name}.`;
    return { meta: [
      { title }, { name: "description", content: desc },
      { property: "og:title", content: title }, { property: "og:description", content: desc },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ] };
  },
  notFoundComponent: () => <div className="chat-empty"><h1>Workshop not found</h1><p>This link may be outdated.</p><Link to="/">Talk to Jackie</Link></div>,
  component: WorkshopPage,
});

function WorkshopPage() {
  const { shop } = Route.useLoaderData();
  return <JackieHome workshop={shop}/>;
}
