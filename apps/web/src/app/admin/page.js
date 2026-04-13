"use client";

import { useEffect, useState } from "react";

import { useSession } from "@/components/app-shell";
import { EmptyState, MetricCard, StatusBadge } from "@/components/ui";
import { apiFetch, formatCurrency, formatDate, formatNumber } from "@/lib/api";

export default function AdminPage() {
  const { ready, session } = useSession();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAdmin = async () => {
    if (!session?.token) return;
    setLoading(true);
    setError("");

    try {
      const [overviewData, usersData, listingsData] = await Promise.all([
        apiFetch("/api/admin/overview", { token: session.token }),
        apiFetch("/api/admin/users", { token: session.token }),
        apiFetch("/api/admin/listings", { token: session.token })
      ]);
      setOverview(overviewData);
      setUsers(usersData.items || []);
      setListings(listingsData.items || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, [session?.token]);

  const runAction = async (key, request) => {
    if (!session?.token) return;
    setBusyAction(key);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch(request.path, {
        method: "PATCH",
        token: session.token,
        body: request.body
      });
      setMessage(response.message || "Action completed.");
      await loadAdmin();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction("");
    }
  };

  if (!ready) {
    return <div className="mx-auto h-[70vh] max-w-7xl animate-pulse px-4 py-16 sm:px-6 lg:px-8" />;
  }

  if (session?.user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          copy="This moderation surface is restricted to marketplace admins who approve listings, review seller verification, and flag suspicious activity."
          title="Admin access required"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Admin operations</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight text-ink">Moderation and marketplace control center</h1>
        <p className="mt-4 text-lg text-slate">
          Approve inventory, manage verification, watch suspicious activity, and track recurring subscription revenue potential.
        </p>
      </div>

      {message ? <div className="mt-8 rounded-3xl bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">{message}</div> : null}
      {error ? <div className="mt-4 rounded-3xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      {loading || !overview ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-40 animate-pulse rounded-4xl bg-white shadow-card" key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard hint="Verified and unverified buyers, sellers, and dealers" label="Users" value={formatNumber(overview.metrics.totalUsers)} />
            <MetricCard hint={`${overview.metrics.pendingListings} waiting approval`} label="Listings" value={formatNumber(overview.metrics.totalListings)} />
            <MetricCard hint={`${overview.metrics.flaggedListings} currently flagged`} label="Reports" value={formatNumber(overview.metrics.openReports)} />
            <MetricCard
              hint={`${overview.metrics.dealerCount} dealer accounts`}
              label="MRR potential"
              value={formatCurrency(overview.metrics.monthlyRevenueProjection)}
            />
          </div>

          <div className="mt-12 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-8">
              <div className="panel rounded-4xl p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Verification queue</p>
                    <h2 className="mt-3 text-3xl font-black text-ink">Seller and dealer reviews</h2>
                  </div>
                </div>
                <div className="mt-8 space-y-4">
                  {users.filter((user) => user.verification?.status === "pending").length > 0 ? (
                    users
                      .filter((user) => user.verification?.status === "pending")
                      .map((user) => (
                        <div className="rounded-4xl bg-cloud p-5" key={user._id}>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-black text-ink">{user.dealerProfile?.companyName || user.name}</h3>
                              <p className="mt-1 text-sm text-slate">
                                {user.role} • ID {user.verification?.idNumber} • document {user.verification?.documentName}
                              </p>
                            </div>
                            <StatusBadge value={user.verification?.status || "unsubmitted"} />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              className="button-primary px-4 py-2"
                              disabled={busyAction === `user-approve-${user._id}`}
                              onClick={() =>
                                runAction(`user-approve-${user._id}`, {
                                  path: `/api/admin/users/${user._id}/verify`,
                                  body: { status: "approved" }
                                })
                              }
                              type="button"
                            >
                              Approve
                            </button>
                            <button
                              className="button-secondary px-4 py-2"
                              disabled={busyAction === `user-reject-${user._id}`}
                              onClick={() =>
                                runAction(`user-reject-${user._id}`, {
                                  path: `/api/admin/users/${user._id}/verify`,
                                  body: { status: "rejected" }
                                })
                              }
                              type="button"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <EmptyState copy="New verification requests will queue here for moderation." title="No pending verifications" />
                  )}
                </div>
              </div>

              <div className="panel rounded-4xl p-8">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Suspicious activity</p>
                <h2 className="mt-3 text-3xl font-black text-ink">Recent listing reports</h2>
                <div className="mt-8 space-y-4">
                  {overview.recentReports.length > 0 ? (
                    overview.recentReports.map((report) => (
                      <div className="rounded-4xl bg-cloud p-5" key={report._id}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-black text-ink">{report.listing?.title || "Deleted listing"}</h3>
                            <p className="mt-1 text-sm text-slate">{report.reason}</p>
                          </div>
                          <StatusBadge value={report.status} />
                        </div>
                        <p className="mt-3 text-sm text-slate">{report.details}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState copy="Moderation reports from buyers will appear here." title="No recent reports" />
                  )}
                </div>
              </div>
            </section>

            <section className="panel rounded-4xl p-8">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Moderation queue</p>
              <h2 className="mt-3 text-3xl font-black text-ink">Listings awaiting admin action</h2>
              <div className="mt-8 space-y-5">
                {listings.filter((listing) => ["pending", "flagged"].includes(listing.status)).length > 0 ? (
                  listings
                    .filter((listing) => ["pending", "flagged"].includes(listing.status))
                    .map((listing) => (
                      <div className="rounded-4xl bg-cloud p-6" key={listing._id}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-black text-ink">{listing.title}</h3>
                            <p className="mt-1 text-sm text-slate">
                              {formatCurrency(listing.price)} • {listing.location} • submitted {formatDate(listing.createdAt)}
                            </p>
                            {listing.flags?.length > 0 ? (
                              <p className="mt-2 text-sm font-semibold text-rose-700">{listing.flags.join(", ")}</p>
                            ) : null}
                          </div>
                          <StatusBadge value={listing.status} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            className="button-primary px-4 py-2"
                            disabled={busyAction === `listing-approve-${listing._id}`}
                            onClick={() =>
                              runAction(`listing-approve-${listing._id}`, {
                                path: `/api/admin/listings/${listing._id}/review`,
                                body: { status: "approved" }
                              })
                            }
                            type="button"
                          >
                            Approve
                          </button>
                          <button
                            className="button-secondary px-4 py-2"
                            disabled={busyAction === `listing-flag-${listing._id}`}
                            onClick={() =>
                              runAction(`listing-flag-${listing._id}`, {
                                path: `/api/admin/listings/${listing._id}/review`,
                                body: { status: "flagged", flagReason: "Manual admin flag" }
                              })
                            }
                            type="button"
                          >
                            Flag
                          </button>
                          <button
                            className="button-secondary px-4 py-2"
                            disabled={busyAction === `listing-reject-${listing._id}`}
                            onClick={() =>
                              runAction(`listing-reject-${listing._id}`, {
                                path: `/api/admin/listings/${listing._id}/review`,
                                body: { status: "rejected", adminNotes: "Listing rejected after moderation review." }
                              })
                            }
                            type="button"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <EmptyState copy="Pending and flagged inventory will be listed here for review." title="Queue is clear" />
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
