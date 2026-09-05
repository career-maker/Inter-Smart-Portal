import { Metadata } from "next";
import { NotFoundPage } from "@/components/ui/404-page-not-found";

export const metadata: Metadata = {
  title: "404 - Page Not Found | Inter Smart Portal",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return <NotFoundPage />;
}
