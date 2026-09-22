"use client";

import dynamic from "next/dynamic";

const LumenClient = dynamic(() => import("@/components/LumenClient"), {
  ssr: false,
  loading: () => <div className="signin" />,
});

export default function Page() {
  return <LumenClient />;
}
