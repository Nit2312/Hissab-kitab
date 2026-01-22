import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";

export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login?error=unauthorized");
      }
    });
    return () => unsubscribe();
  }, [router]);
}
