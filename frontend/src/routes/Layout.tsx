import { Outlet } from "react-router-dom";
import { Nav } from "@/components/Nav";

export function Layout() {
  return (
    <div className="min-h-full">
      <div className="app-background" />
      <Nav />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
