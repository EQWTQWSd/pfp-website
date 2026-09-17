import { cookies } from "next/headers";
import ClientShell from "./components/ClientShell";

export default function Home() {
  const hasViewedIntro = cookies().get("viewedIntro")?.value === "1";
  return <ClientShell hasViewedIntro={hasViewedIntro} />;
}
