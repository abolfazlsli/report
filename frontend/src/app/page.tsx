"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/ui";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(user ? HOME_BY_ROLE[user.role] : "/login");
  }, [user, loading, router]);
  return <Loading />;
}
