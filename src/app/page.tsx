'use client';

import ReportCanvas from "@/components/canvas/ReportCanvas";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";

export default function Home() {
  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-gray-50 font-sans">
      <Topbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <ReportCanvas />
      </div>
    </main>
  );
}