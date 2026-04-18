"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useSession } from "@/components/app-shell";
import { EmptyState, ListingCard, MetricCard, PlanCard, SectionHeading, StatusBadge } from "@/components/ui";
import { apiFetch, formatNumber } from "@/lib/api";

export default function DashboardPage() {
  const { ready, refreshSession, session } = useSession();
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [verificationForm, setVerificationForm] = useState({
    idNumber: "",
    documentName: "",
    companyName: "",
    companyLocation: "",
    yearsInBusiness: ""
  });

  const loadDashboard = async () => {
    if (!session?.token) return;
    setLoading(true);
    try {
      const data = await apiFetch("/api/users/me/dashboard", { token: session.token });
      setDashboard(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [session?.token]);

  useEffect(() => {
    if (session?.user?.phone && !mpesaPhone) {
      setMpesaPhone(session.user.phone);
    }
    setVerificationForm((current) => ({
      ...current,
      companyName: session?.user?.dealerProfile?.companyName || current.companyName,
      companyLocation: session?.user?.dealerProfile?.companyLocation || current.companyLocation,
      yearsInBusiness: session?.user?.dealerProfile?.yearsInBusiness || current.yearsInBusiness
    }));
  }, [session?.user]);

  const runAction = async (key, request) => {
    if (!session?.token) return;
    setBusyAction(key);
    setMessage("");
    setError("");

    try {
      const response = await apiFetch(request.path, {
        method: request.method || "POST",
        token: session.token,
        body: request.body
      });
      await loadDashboard();
      await refreshSession();
      setMessage(response.message || "Action completed.");
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction("");
    }
  };

  if (!ready) {
    return <div className="mx-auto h-[70vh] max-w-7xl animate-pulse px-4 py-16 sm:px-6 lg:px-8" />;
  }

  if (!session?.token) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          action={
            <Link className="button-primary inline-flex px-6 py-3" href="/auth">
              Sign in to open your dashboard
            </Link>
          }
          copy="Dealer and seller dashboards include verification, lead tracking, inventory actions, and subscription upgrades."
          title="Your dashboard starts after sign-in"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Dealer dashboard"
        title="Manage trust, inventory, leads, and plan upgrades from one place"
        description="This dashboard is optimized for Kenyan dealer operations: featured placement, moderation workflow, verification, and WhatsApp-driven leads."
        action={
          <Link className="button-primary px-6 py-3" href="/sell">
            Add a new car
          </Link>
        }
      />

      {message ? <div className="mt-8 rounded-3xl bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">{message}</div> : null}
      {error ? <div className="mt-4 rounded-3xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      {loading || !dashboard ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-40 animate-pulse rounded-4xl bg-white shadow-card" key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard hint="Total marketplace attention across your stock" label="Views" value={formatNumber(dashboard.totals.views)} />
            <MetricCard hint="WhatsApp and form conversions recorded" label="Leads" value={formatNumber(dashboard.totals.leads)} />
            <MetricCard hint="Saved cars help indicate buyer intent" label="Saves" value={formatNumber(dashboard.totals.saves)} />
            <MetricCard
              hint={`${dashboard.totals.pending} pending • ${dashboard.totals.sold} sold`}
              label="Active listings"
              value={formatNumber(dashboard.totals.active)}
            />
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            {/* LEFT SECTION */}
            <section className="space-y-8">
              {/* Inventory */}
              <div className="panel rounded-4xl p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Inventory</p>
                    <h2 className="mt-3 text-3xl font-black text-ink">Manage your live and pending cars</h2>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm font-semibold">
                    <span className="rounded-full bg-sand px-3 py-1">Plan: {dashboard.user.subscription?.planId || "starter"}</span>
                    <span className="rounded-full bg-sand px-3 py-1">Feature credits: {dashboard.user.subscription?.featuredCredits || 0}</span>
                  </div>
                </div>
                <div className="mt-8 grid gap-6 xl:grid-cols-2">
                  {dashboard.listings.length > 0 ? (
                    dashboard.listings.map((listing) => (
                      <div className="space-y-4" key={listing._id}>
                        <ListingCard listing={listing} />
                        <div className="flex flex-wrap gap-3">
                          <button
                            className="button-secondary px-4 py-2"
                            disabled={busyAction === `feature-${listing._id}`}
                            onClick={() =>
                              runAction(`feature-${listing._id}`, {
                                path: `/api/payments/mpesa/feature/${listing._id}`,
                                method: "POST",
                                body: { phone: mpesaPhone }
                              })
                            }
                            type="button"
                          >
                            Feature Listing (KES 500)
                          </button>
                          <button
                            className="button-secondary px-4 py-2"
                            disabled={busyAction === `sold-${listing._id}` || listing.status === "sold"}
                            onClick={() =>
                              runAction(`sold-${listing._id}`, {
                                path: `/api/listings/${listing._id}/sold`,
                                method: "PATCH"
                              })
                            }
                            type="button"
                          >
                            Mark Sold
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="xl:col-span-2">
                      <EmptyState
                        action={
                          <Link className="button-primary inline-flex px-6 py-3" href="/sell">
                            Add your first listing
                          </Link>
                        }
                        copy="Once you post inventory, this area becomes your control center for views, leads, and featured placement."
                        title="No listings yet"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Saved cars */}
              <div className="panel rounded-4xl p-8">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Saved cars</p>
                <h2 className="mt-3 text-3xl font-black text-ink">Favorites and buyer-side trust loop</h2>
                <div className="mt-8 grid gap-6 xl:grid-cols-2">
                  {dashboard.favorites.length > 0 ? (
                    dashboard.favorites.map((listing) => <ListingCard key={listing._id} listing={listing} />)
                  ) : (
                    <div className="xl:col-span-2">
                      <EmptyState copy="Saved cars will appear here as you favorite listings while browsing the marketplace." title="No favorites yet" />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* RIGHT SIDEBAR */}
            <aside className="space-y-8">
              {/* Verification */}
              <div className="panel rounded-4xl p-8">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Verification</p>
                <h2 className="mt-3 text-3xl font-black text-ink">Earn the badge buyers trust</h2>
                <div className="mt-5 flex flex-wrap gap-3">
                  <StatusBadge value={dashboard.user.verification?.status || "unsubmitted"} />
                  {dashboard.user.isVerified ? (
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">Verified account</span>
                  ) : null}
                </div>
                <div className="mt-6 space-y-4">
                  <input
                    className="field"
                    onChange={(event) => setVerificationForm((current) => ({ ...current, idNumber: event.target.value }))}
                    placeholder="National ID number"
                    value={verificationForm.idNumber}
                  />
                  <input
                    className="field"
                    onChange={(event) => setVerificationForm((current) => ({ ...current, documentName: event.target.value }))}
                    placeholder="Simulated ID upload file name"
                    value={verificationForm.documentName}
                  />
                  {["dealer", "admin"].includes(dashboard.user.role) ? (
                    <>
                      <input
                        className="field"
                        onChange={(event) => setVerificationForm((current) => ({ ...current, companyName: event.target.value }))}
                        placeholder="Dealer company name"
                        value={verificationForm.companyName}
                      />
                      <input
                        className="field"
                        onChange={(event) => setVerificationForm((current) => ({ ...current, companyLocation: event.target.value }))}
                        placeholder="Dealer company location"
                        value={verificationForm.companyLocation}
                      />
                    </>
                  ) : null}
                  <button
                    className="button-primary w-full px-4 py-3"
                    disabled={busyAction === "verify"}
                    onClick={() =>
                      runAction("verify", {
                        path: "/api/users/me/verify",
                        method: "PATCH",
                        body: verificationForm
                      })
                    }
                    type="button"
                  >
                    Submit Verification
                  </button>
                </div>
              </div>

              {/* Monetization */}
              <div className="panel rounded-4xl p-8">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Monetization</p>
                <h2 className="mt-3 text-3xl font-black text-ink">Upgrade subscription</h2>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate">M-Pesa Phone Number</label>
                    <input
                      style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "8px", fontSize: "14px" }}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="e.g. 0712345678"
                      value={mpesaPhone}
                      type="tel"
                    />
                  </div>
                  <div className="space-y-4">
                    {dashboard.subscriptionPlans.map((plan) => (
                      <PlanCard
                        active={dashboard.user.subscription?.planId === plan.id && dashboard.user.subscription?.status === "active"}
                        disabled={busyAction === `plan-${plan.id}`}
                        key={plan.id}
                        onSelect={(planId) =>
                          runAction(`plan-${planId}`, {
                            path: "/api/payments/mpesa/subscribe",
                            method: "POST",
                            body: { planId, phone: mpesaPhone }
                          })
                        }
                        plan={plan}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Lead inbox */}
              <div className="panel rounded-4xl p-8">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Lead inbox</p>
                <h2 className="mt-3 text-3xl font-black text-ink">Recent buyer intent</h2>
                <div className="mt-6 space-y-4">
                  {dashboard.leadFeed.length > 0 ? (
                    dashboard.leadFeed.slice(0, 6).map((lead) => (
                      <div className="rounded-3xl bg-cloud p-4" key={lead._id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-ink">{lead.buyerName || "Interested buyer"}</p>
                          <StatusBadge value={lead.source} />
                        </div>
                        <p className="mt-2 text-sm text-slate">{lead.message}</p>
                        <p className="mt-2 text-sm font-semibold text-ink">{lead.buyerPhone || "Phone not shared"}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState copy="When buyers click WhatsApp or submit interest, those leads will appear here." title="No leads yet" />
                  )}
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}