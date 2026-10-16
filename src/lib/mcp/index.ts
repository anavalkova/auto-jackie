import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyChats from "./tools/list-my-chats";
import getMyCar from "./tools/get-my-car";
import listMyVisitRequests from "./tools/list-my-visit-requests";
import listWorkshopRequests from "./tools/list-workshop-requests";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "autojackie",
  title: "AutoJackie",
  version: "0.1.0",
  instructions: "AutoJackie helps drivers in Sweden understand car problems and book workshops. Drivers can read their saved chats, saved car and visit requests. Workshop staff can read their workshop's incoming requests.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated" }),
  tools: [listMyChats, getMyCar, listMyVisitRequests, listWorkshopRequests],
});
