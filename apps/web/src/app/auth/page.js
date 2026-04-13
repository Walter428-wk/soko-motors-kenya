"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSession } from "@/components/app-shell";
import { apiFetch } from "@/lib/api";

const initialRegister = {
  name: "",
  email: "",
  password: "",
  phone: "",
  whatsappNumber: "",
  role: "buyer",
  companyName: "",
  companyLocation: ""
};

export default function AuthPage() {
  const router = useRouter();
  const { login, session } = useSession();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response =
        mode === "login"
          ? await apiFetch("/api/auth/login", { method: "POST", body: loginForm })
          : await apiFetch("/api/auth/register", { method: "POST", body: registerForm });

      login(response);
      setMessage(mode === "login" ? "Welcome back." : "Account created successfully.");
      router.push(response.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-4xl bg-ink p-8 text-white shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/70">Trust + monetization</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Accounts built for serious buyers and dealers</h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            Register as a buyer, private seller, or dealer. Dealers can activate subscriptions, request verification, and manage featured stock from one dashboard.
          </p>
          <div className="mt-10 space-y-4 text-sm text-white/75">
            <p>Demo admin: `admin@sokomotors.co.ke / Pass1234!`</p>
            <p>Demo dealer: `dealer@sokomotors.co.ke / Pass1234!`</p>
            <p>Demo buyer: `buyer@sokomotors.co.ke / Pass1234!`</p>
          </div>
        </div>

        <div className="panel rounded-4xl p-8">
          <div className="flex flex-wrap gap-3">
            {["login", "register"].map((entry) => (
              <button
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  mode === entry ? "bg-ink text-white" : "bg-sand text-ink"
                }`}
                key={entry}
                onClick={() => setMode(entry)}
                type="button"
              >
                {entry === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {session?.user ? (
            <div className="mt-8 rounded-4xl bg-moss/10 p-6 text-moss">
              You are already signed in as {session.user.name}. Visit your dashboard to manage inventory and verification.
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {mode === "login" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate">Email</label>
                  <input
                    className="field"
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    required
                    type="email"
                    value={loginForm.email}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate">Password</label>
                  <input
                    className="field"
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    required
                    type="password"
                    value={loginForm.password}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate">Full name</label>
                    <input
                      className="field"
                      onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                      required
                      value={registerForm.name}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate">Phone</label>
                    <input
                      className="field"
                      onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                      required
                      value={registerForm.phone}
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate">WhatsApp number</label>
                    <input
                      className="field"
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, whatsappNumber: event.target.value }))
                      }
                      value={registerForm.whatsappNumber}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate">Role</label>
                    <select
                      className="field"
                      onChange={(event) => setRegisterForm((current) => ({ ...current, role: event.target.value }))}
                      value={registerForm.role}
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Private seller</option>
                      <option value="dealer">Dealer</option>
                    </select>
                  </div>
                </div>

                {registerForm.role === "dealer" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate">Company name</label>
                      <input
                        className="field"
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, companyName: event.target.value }))
                        }
                        required
                        value={registerForm.companyName}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate">Company location</label>
                      <input
                        className="field"
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, companyLocation: event.target.value }))
                        }
                        value={registerForm.companyLocation}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate">Email</label>
                    <input
                      className="field"
                      onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                      required
                      type="email"
                      value={registerForm.email}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate">Password</label>
                    <input
                      className="field"
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, password: event.target.value }))
                      }
                      required
                      type="password"
                      value={registerForm.password}
                    />
                  </div>
                </div>
              </>
            )}

            {error ? <div className="rounded-3xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
            {message ? <div className="rounded-3xl bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">{message}</div> : null}

            <button className="button-primary w-full px-6 py-3" disabled={loading} type="submit">
              {loading ? "Working..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
