import Link from "next/link";

import { formatCurrency, formatDate, formatNumber } from "@/lib/api";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl space-y-2">
        {eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">{eyebrow}</p> : null}
        <h2 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">{title}</h2>
        {description ? <p className="text-base text-slate sm:text-lg">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ value }) {
  const tone =
    value === "approved" || value === "active" || value === "sold"
      ? "bg-moss/10 text-moss"
      : value === "pending"
        ? "bg-amber-100 text-amber-700"
        : value === "flagged" || value === "rejected"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-100 text-slate";

  return (
    <span className={classNames("inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase", tone)}>
      {value}
    </span>
  );
}

export function InsightBadge({ insight }) {
  const label = insight?.label || "No Data";
  const tone =
    label === "Good Deal"
      ? "bg-moss/10 text-moss"
      : label === "Fair Price"
        ? "bg-amber-100 text-amber-700"
        : label === "Overpriced"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-100 text-slate";

  return (
    <div className={classNames("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold", tone)}>
      <span>{label}</span>
      {insight?.deltaPercentage || insight?.deltaPercentage === 0 ? <span>{insight.deltaPercentage}%</span> : null}
    </div>
  );
}

export function VerifiedBadge({ seller, compact = false }) {
  if (!seller?.isVerified && !seller?.sellerSnapshot?.isVerified) {
    return null;
  }

  const name =
    seller?.dealerProfile?.badgeLabel ||
    (seller?.role === "dealer" || seller?.sellerSnapshot?.role === "dealer"
      ? "Verified Dealer"
      : "Verified Seller");

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full bg-ink px-3 py-1 text-xs font-bold text-white",
        compact ? "px-2 py-0.5 text-[11px]" : ""
      )}
    >
      {name}
    </span>
  );
}

export function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-4xl border border-white/60 bg-white p-6 shadow-card">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate">{hint}</p> : null}
    </div>
  );
}

export function PlanCard({ plan, active, onSelect, disabled }) {
  return (
    <div
      className={classNames(
        "rounded-4xl border p-6 shadow-card transition",
        active ? "border-moss bg-moss/5" : "border-white bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">{plan.id}</p>
          <h3 className="mt-2 text-2xl font-black text-ink">{plan.name}</h3>
        </div>
        {active ? <span className="rounded-full bg-moss px-3 py-1 text-xs font-bold text-white">Active</span> : null}
      </div>

      <p className="mt-4 text-4xl font-black text-ink">{formatCurrency(plan.priceMonthly)}</p>
      <p className="mt-1 text-sm text-slate">per month</p>

      <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold text-slate">
        <span className="rounded-full bg-sand px-3 py-1">{plan.listingLimit} live listings</span>
        <span className="rounded-full bg-sand px-3 py-1">{plan.featuredCredits} feature credits</span>
      </div>

      <div className="mt-6 space-y-2 text-sm text-slate">
        {plan.perks?.map((perk) => (
          <p key={perk}>{perk}</p>
        ))}
      </div>

      {onSelect ? (
        <button
          className="mt-6 w-full rounded-full bg-ink px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => onSelect(plan.id)}
          type="button"
        >
          {active ? "Current Plan" : "Upgrade Plan"}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, copy, action }) {
  return (
    <div className="rounded-4xl border border-dashed border-ink/10 bg-white p-10 text-center shadow-card">
      <h3 className="text-2xl font-black text-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-slate">{copy}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ListingCard({ listing, onFavorite, favoriteBusy = false }) {
  const seller = listing.sellerSnapshot || listing.seller || {};
  const image = listing.images?.[0] || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80";

  return (
    <article className="overflow-hidden rounded-4xl border border-white/70 bg-white shadow-card transition hover:-translate-y-1">
      <Link className="block" href={`/cars/${listing._id}`}>
        <div className="relative h-56 overflow-hidden bg-sand">
          <img
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
            loading="lazy"
            src={image}
          />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <InsightBadge insight={listing.pricingInsight} />
            {listing.featured?.enabled ? (
              <span className="rounded-full bg-ember px-3 py-1 text-xs font-bold text-white">Featured</span>
            ) : null}
            <StatusBadge value={listing.status} />
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link className="block" href={`/cars/${listing._id}`}>
              <h3 className="text-2xl font-black tracking-tight text-ink">{listing.title}</h3>
            </Link>
            <p className="mt-1 text-sm text-slate">
              {listing.location} • {formatDate(listing.createdAt)}
            </p>
          </div>
          {onFavorite ? (
            <button
              className="rounded-full border border-ink/10 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-sand disabled:opacity-50"
              disabled={favoriteBusy}
              onClick={() => onFavorite?.(listing)}
              type="button"
            >
              {listing.isFavorited ? "Saved" : "Save"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-sm font-semibold text-slate">
          <span className="rounded-full bg-sand px-3 py-1">{listing.year}</span>
          <span className="rounded-full bg-sand px-3 py-1">{formatNumber(listing.mileage)} km</span>
          <span className="rounded-full bg-sand px-3 py-1">{listing.transmission}</span>
          <span className="rounded-full bg-sand px-3 py-1">{listing.fuelType}</span>
          <span className="rounded-full bg-sand px-3 py-1">{listing.importStatus}</span>
          {listing.hirePurchaseAvailable ? <span className="rounded-full bg-moss/10 px-3 py-1 text-moss">Hire Purchase</span> : null}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-black tracking-tight text-ink">{formatCurrency(listing.price)}</p>
            {listing.pricingInsight?.benchmark ? (
              <p className="text-sm text-slate">Market average {formatCurrency(listing.pricingInsight.benchmark)}</p>
            ) : (
              <p className="text-sm text-slate">Benchmark updates as more Kenyan pricing data comes in.</p>
            )}
          </div>
          <div className="text-right text-sm text-slate">
            <p className="font-semibold text-ink">{seller.companyName || seller.dealerProfile?.companyName || seller.name}</p>
            <VerifiedBadge compact seller={seller} />
          </div>
        </div>
      </div>
    </article>
  );
}
