import { redirect } from "next/navigation";

export default function BugzillaIndexPage() {
  redirect("/project-management/bugzilla/overview");
}
