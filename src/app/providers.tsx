"use client";

import { ReactNode, useEffect, useState } from "react";
import { useMachineStore } from "@/lib/store";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { MockModeBanner } from "@/components/MockModeBanner";

export function Providers({ children }: { children: ReactNode }) {
  const { sidebarWidth, isSidebarCollapsed } = useMachineStore();
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isResizingClass =
    typeof document !== "undefined" && document.body.style.userSelect === "none"
      ? ""
      : "transition-all duration-300";

  return (
    <div className="min-h-screen bg-industrial-bg text-industrial-text">
      <MockModeBanner />
      <RealtimeProvider />
      <Sidebar />
      <div
        className={`${isResizingClass} ml-0`}
        style={{
          marginLeft: isMobile ? 0 : isSidebarCollapsed ? 80 : sidebarWidth,
        }}
      >
        <Header />
        <main className="p-4 md:p-6 bg-industrial-bg">{children}</main>
      </div>
    </div>
  );
}
