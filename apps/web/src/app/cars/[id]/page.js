"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useSession } from "@/components/app-shell";
import { EmptyState, InsightBadge, ListingCard, SectionHeading, StatusBadge, VerifiedBadge } from "@/components/ui";
import { apiFetch, formatCurrency, formatNumber } from "@/lib/api";

const toWhatsAppNumber = (rawValue = "") => {
  const digits = rawValue.replace(/[^\d]/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return digits;
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useSession();
  const [listing, setListing] = useState(null);
  const [similarCars, setSimilarCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [rating, setRating] = useState({ rating: 5, comment: "" });
  const [report, setReport] = useState({ reason: "Suspicious price", details: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    apiFetch(`/api/listings/${params.id}`, {
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined
    })
      .then((data) => {
        setListing(data.item);
        setSimilarCars(data.similarCars || []);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [params?.id, session?.token]);

  const images = useMemo(() => listing?.images?.length ? listing.images : [], [listing?.images]);

  const toggleFavorite = async () => {
    if (!session?.token) {
      router.push("/auth");
      return;
    }

    setBusyAction("favorite");
    try {
      const response = await apiFetch(`/api/listings/${listing._id}/favorite`, {
        method: "POST",
        token: session.token
      });
      setListing((current) => ({ ...current, isFavorited: response.isFavorited }));
      setMessage(response.message);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction("");
    }
  };

  const handleWhatsAppLead = async () => {
    if (!listing) return;

    setBusyAction("lead");
    try {
      await apiFetch(`/api/listings/${listing._id}/lead`, {
        method: "POST",
        token: session?.token,
        body: {
          source: "whatsapp"
        }
      });
      const phone = toWhatsAppNumber(listing.seller?.whatsappNumber || listing.sellerSnapshot?.whatsappNumber || "");
      const text = encodeURIComponent(`Hello, I am interested in your ${listing.title} on Soko Motors Kenya.`);
      window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
      setMessage("Lead captured. Opening WhatsApp now.");
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction("");
    }
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setBusyAction("report");
    setError("");
    try {
      const response = await apiFetch(`/api/listings/${listing._id}/report`, {
        method: "POST",
        token: session?.token,
        body: report
      });
      setMessage(response.message);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction("");
    }
  };

  const submitRating = async (event) => {
    event.preventDefault();

    if (!session?.token) {
      router.push("/auth");
      return;
    }

    setBusyAction("rating");
    setError("");
    try {
      const response = await apiFetch(`/api/listings/${listing._id}/rate`, {
        method: "POST",
        token: session.token,
        body: rating
      });
      setListing((current) => ({
        ...current,
        seller: response.seller
      }));
      setMessage("Seller rating submitted.");
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction("");
    }
  };

  if (loading) {
    return <div className="mx-auto h-[70vh] max-w-7xl animate-pulse px-4 py-16 sm:px-6 lg:px-8" />;
  }

  if (error && !listing) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState copy={error} title="Listing not available" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link className="button-secondary px-4 py-2" href="/cars">
          Back to inventory
        </Link>
        <StatusBadge value={listing.status} />
        <InsightBadge insight={listing.pricingInsight} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-card">
            <img
              alt={listing.title}
              className="h-[26rem] w-full object-cover sm:h-[34rem]"
              src={images[selectedImage] || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {images.map((image, index) => (
              <button
                className={`overflow-hidden rounded-3xl border-2 ${selectedImage === index ? "border-moss" : "border-transparent"}`}
                key={image}
                onClick={() => setSelectedImage(index)}
                type="button"
              >
                <img alt={`${listing.title} ${index + 1}`} className="h-24 w-full object-cover" src={image} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel rounded-4xl p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">{listing.location}</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-ink">{listing.title}</h1>
              </div>
              {listing.featured?.enabled ? (
                <span className="rounded-full bg-ember px-4 py-2 text-sm font-bold text-white">Featured</span>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold text-slate">
              <span className="rounded-full bg-sand px-3 py-1">{listing.year}</span>
              <span className="rounded-full bg-sand px-3 py-1">{formatNumber(listing.mileage)} km</span>
              <span className="rounded-full bg-sand px-3 py-1">{listing.transmission}</span>
              <span className="rounded-full bg-sand px-3 py-1">{listing.fuelType}</span>
              <span className="rounded-full bg-sand px-3 py-1">{listing.condition}</span>
              <span className="rounded-full bg-sand px-3 py-1">{listing.importStatus}</span>
              {listing.hirePurchaseAvailable ? <span className="rounded-full bg-moss/10 px-3 py-1 text-moss">Hire purchase available</span> : null}
            </div>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-black text-ink">{formatCurrency(listing.price)}</p>
                {listing.pricingInsight?.benchmark ? (
                  <p className="mt-2 text-sm text-slate">
                    Market benchmark {formatCurrency(listing.pricingInsight.benchmark)} • {listing.pricingInsight.deltaPercentage}% vs average
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="button-secondary px-5 py-3" onClick={toggleFavorite} type="button">
                  {busyAction === "favorite" ? "Saving..." : listing.isFavorited ? "Saved" : "Save car"}
                </button>
                <button className="button-primary px-5 py-3" onClick={handleWhatsAppLead} type="button">
                  {busyAction === "lead" ? "Connecting..." : "Contact on WhatsApp"}
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-4xl bg-sand p-6">
              <h2 className="text-xl font-black text-ink">Description</h2>
              <p className="mt-3 leading-7 text-slate">{listing.description}</p>
            </div>

            {message ? <div className="mt-6 rounded-3xl bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">{message}</div> : null}
            {error ? <div className="mt-4 rounded-3xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
          </div>

          <div className="panel rounded-4xl p-8">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Seller profile</p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-ink">
                  {listing.seller?.dealerProfile?.companyName || listing.seller?.name || listing.sellerSnapshot?.name}
                </h2>
                <p className="mt-1 text-slate">
                  {listing.seller?.dealerProfile?.companyLocation || listing.location} • {listing.seller?.role || listing.sellerSnapshot?.role}
                </p>
              </div>
              <VerifiedBadge seller={listing.seller || listing.sellerSnapshot} />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-cloud p-4">
                <p className="text-sm text-slate">Rating</p>
                <p className="mt-2 text-2xl font-black text-ink">{listing.seller?.rating?.average || listing.sellerSnapshot?.ratingAverage || 0}/5</p>
              </div>
              <div className="rounded-3xl bg-cloud p-4">
                <p className="text-sm text-slate">Reviews</p>
                <p className="mt-2 text-2xl font-black text-ink">{listing.seller?.rating?.count || listing.sellerSnapshot?.ratingCount || 0}</p>
              </div>
              <div className="rounded-3xl bg-cloud p-4">
                <p className="text-sm text-slate">Views</p>
                <p className="mt-2 text-2xl font-black text-ink">{formatNumber(listing.stats?.views)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <form className="panel rounded-4xl p-6" onSubmit={submitRating}>
              <h3 className="text-xl font-black text-ink">Rate this seller</h3>
              <div className="mt-4 space-y-4">
                <select
                  className="field"
                  onChange={(event) => setRating((current) => ({ ...current, rating: Number(event.target.value) }))}
                  value={rating.rating}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} stars
                    </option>
                  ))}
                </select>
                <textarea
                  className="field min-h-28"
                  onChange={(event) => setRating((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="Share your buying experience"
                  value={rating.comment}
                />
                <button className="button-primary w-full px-4 py-3" disabled={busyAction === "rating"} type="submit">
                  {busyAction === "rating" ? "Submitting..." : "Submit rating"}
                </button>
              </div>
            </form>

            <form className="panel rounded-4xl p-6" onSubmit={submitReport}>
              <h3 className="text-xl font-black text-ink">Report this listing</h3>
              <div className="mt-4 space-y-4">
                <select
                  className="field"
                  onChange={(event) => setReport((current) => ({ ...current, reason: event.target.value }))}
                  value={report.reason}
                >
                  <option>Suspicious price</option>
                  <option>Scam risk</option>
                  <option>Mileage inconsistency</option>
                  <option>Stolen photos</option>
                </select>
                <textarea
                  className="field min-h-28"
                  onChange={(event) => setReport((current) => ({ ...current, details: event.target.value }))}
                  placeholder="What looks suspicious?"
                  value={report.details}
                />
                <button className="button-secondary w-full px-4 py-3" disabled={busyAction === "report"} type="submit">
                  {busyAction === "report" ? "Sending..." : "Send report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Similar cars"
          title="More inventory buyers typically compare next"
          description="Listings in the same make, model, or market area help shoppers benchmark value without leaving the marketplace."
        />
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {similarCars.length > 0 ? (
            similarCars.map((item) => <ListingCard key={item._id} listing={item} />)
          ) : (
            <div className="md:col-span-2 xl:col-span-4">
              <EmptyState copy="We will surface similar listings as more inventory is added." title="No similar cars yet" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
