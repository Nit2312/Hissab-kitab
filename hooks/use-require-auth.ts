import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";

export function useRequireAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from your API
        fetch("/api/auth/user", { credentials: "include" })
          .then(res => {
            if (res.ok) return res.json();
            throw new Error("Failed to get user data");
          })
          .then(userData => {
            setUser(userData);
            setLoading(false);
          })
          .catch(err => {
            console.error("Error fetching user data:", err);
            router.replace("/login?error=unauthorized");
          });
      } else {
        setUser(null);
        setLoading(false);
        router.replace("/login?error=unauthorized");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return { user, loading };
}
