"use client";

import { UpdateBanner } from "@/components/update-banner";

/** Mounts the floating desktop update card once at the app shell. */
export function UpdateCardHost() {
  return <UpdateBanner />;
}
