"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

import { apiFetch, clearStoredSession, getStoredSession, persistSession } from "@/lib/api";

const SessionContext = createContext(null);

export function AppShell({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const storedSession = getStoredSession();

    if (!storedSession?.token) {
      setReady(true);
      return;
    }

    setSession(storedSession);

    apiFetch("/api/auth/me", { token: storedSession.token })
      .then((data) => {
        const nextSession = {
          ...storedSession,
          user: data.user
        };
        persistSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        clearStoredSession();
        setSession(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = (authPayload) => {
    const nextSession = {
      token: authPayload.token,
      user: authPayload.user
    };
    persistSession(nextSession);
    setSession(nextSession);
  };

  const logout = () => {
    clearStoredSession();
    setSession(null);

    if (pathname.startsWith("/dashboard") || pathname.startsWith("/sell") || pathname.startsWith("/admin")) {
      router.push("/auth");
    }
  };

  const refreshSession = async () => {
    if (!session?.token) return null;
    const data = await apiFetch("/api/auth/me", { token: session.token });
    const nextSession = { ...session, user: data.user };
    persistSession(nextSession);
    setSession(nextSession);
    return nextSession;
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/cars", label: "Browse Cars" },
    { href: "/sell", label: "Sell" },
    ...(session ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(session?.user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [])
  ];

  return (
    <SessionContext.Provider value={{ login, logout, ready, refreshSession, session }}>
      <div className="min-h-screen bg-cloud text-ink">
        <header className="sticky top-0 z-40 border-b border-white/60 bg-cloud/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link className="flex items-center gap-3" href="/">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-ink via-moss to-ember text-sm font-black text-white shadow-soft">
                SM
              </div>
              <div>
                <p className="text-lg font-black tracking-tight">Soko Motors Kenya</p>
                <p className="text-sm text-slate">Trusted cars. Verified dealers. Revenue-ready tools.</p>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center gap-2">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? "bg-ink text-white" : "bg-white text-slate shadow-card hover:-translate-y-0.5"
                    }`}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {session ? (
                <button
                  className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-0.5"
                  onClick={logout}
                  type="button"
                >
                  Logout
                </button>
              ) : (
                <Link
                  className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
                  href="/auth"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>

          <div className="border-t border-white/70 bg-white/70">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-moss/10 px-3 py-1 font-semibold text-moss">Verified sellers</span>
                <span className="rounded-full bg-ember/10 px-3 py-1 font-semibold text-ember">KES pricing intelligence</span>
                <span className="rounded-full bg-ink/10 px-3 py-1 font-semibold text-ink">Dealer subscriptions</span>
              </div>
              <p className="text-slate">
                {session?.user
                  ? `Signed in as ${session.user.name}${session.user.isVerified ? " • Verified" : ""}`
                  : "Built for Nairobi, Mombasa, Kisumu, Nakuru, and beyond"}
              </p>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-ink/10 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 text-sm text-slate sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold text-ink">Soko Motors Kenya</p>
              <p>Trust-first marketplace tooling for Kenyan car buyers, sellers, and dealers.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/cars">Inventory</Link>
              <Link href="/sell">Post a Car</Link>
              <Link href="/dashboard">Dealer Dashboard</Link>
              <Link href="/admin">Admin</Link>
            </div>
          </div>
        </footer>
      </div>
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within AppShell.");
  }

  return context;
}
