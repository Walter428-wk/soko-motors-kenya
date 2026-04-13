"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSession } from "@/components/app-shell";
import { EmptyState, ListingCard, SectionHeading } from "@/components/ui";
import { apiFetch, createQueryString, formatCurrency, marketplaceDefaults } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const { session } = useSession();
  const [featuredCars, setFeaturedCars] = useState([]);
  const [latestCars, setLatestCars] = useState([]);
  const [favoriteBusyId, setFavoriteBusyId] = useState("");
  const [search, setSearch] = useState({
    make: "",
    location: "",
    maxPrice: ""
  });

  useEffect(() => {
    Promise.all([apiFetch("/api/listings/featured?limit=4"), apiFetch("/api/listings?limit=4&sort=newest")])
      .then(([featuredData, latestData]) => {
        setFeaturedCars(featuredData.items || []);
        setLatestCars(latestData.items || []);
      })
      .catch(() => {
        setFeaturedCars([]);
        setLatestCars([]);
      });
  }, []);

  const toggleFavorite = async (listing) => {
    if (!session?.token) {
      router.push("/auth");
      return;
    }

    setFavoriteBusyId(listing._id);
    try {
      const response = await apiFetch(`/api/listings/${listing._id}/favorite`, {
        method: "POST",
        token: session.token
      });
      const updateItem = (item) => (item._id === listing._id ? { ...item, isFavorited: response.isFavorited } : item);
      setFeaturedCars((current) => current.map(updateItem));
      setLatestCars((current) => current.map(updateItem));
    } finally {
      setFavoriteBusyId("");
    }
  };

  const handleSearch = () => {
    const query = createQueryString(search);
    router.push(`/cars${query ? `?${query}` : ""}`);
  };

  return (
    <div className="pb-16">
      <section className="hero-grid relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-24">
          <div className="space-y-8">
            <div className="inline-flex rounded-full bg-white/90 px-4 py-2 text-sm font-bold uppercase tracking-[0.24em] text-moss shadow-card">
              Kenya’s trust-first car marketplace
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black tracking-tight text-ink sm:text-6xl">
                Better than classifieds.
                <span className="block text-moss">Built for serious car buying in Kenya.</span>
              </h1>
              <p className="max-w-2xl text-lg text-slate sm:text-xl">
                Soko Motors combines verified sellers, dealer revenue tools, market-based pricing intelligence, and admin moderation so buyers can trust listings and dealers can actually grow.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="panel rounded-4xl p-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate">Trust</p>
                <p className="mt-3 text-3xl font-black">ID-backed sellers</p>
              </div>
              <div className="panel rounded-4xl p-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate">Revenue</p>
                <p className="mt-3 text-3xl font-black">{formatCurrency(4900)} plans</p>
              </div>
              <div className="panel rounded-4xl p-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate">Speed</p>
                <p className="mt-3 text-3xl font-black">WhatsApp-ready leads</p>
              </div>
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Find your next car</p>
            <h2 className="mt-3 text-3xl font-black text-ink">Quick search for Kenyan buyers</h2>
            <p className="mt-2 text-slate">
              Filter by make, budget, and city, then jump into inventory with pricing insight already applied.
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate">Make</label>
                <select
                  className="field"
                  onChange={(event) => setSearch((current) => ({ ...current, make: event.target.value }))}
                  value={search.make}
                >
                  <option value="">Any make</option>
                  {marketplaceDefaults.makes.map((make) => (
                    <option key={make} value={make}>
                      {make}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate">Location</label>
                <select
                  className="field"
                  onChange={(event) => setSearch((current) => ({ ...current, location: event.target.value }))}
                  value={search.location}
                >
                  <option value="">Any location</option>
                  {marketplaceDefaults.locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate">Max budget (KES)</label>
                <input
                  className="field"
                  onChange={(event) => setSearch((current) => ({ ...current, maxPrice: event.target.value }))}
                  placeholder="e.g. 2500000"
                  type="number"
                  value={search.maxPrice}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button className="button-primary px-6 py-3" onClick={handleSearch} type="button">
                Search Marketplace
              </button>
              <Link className="button-secondary px-6 py-3" href="/sell">
                Post Your Car
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Featured Inventory"
          title="High-visibility listings dealers are paying to boost"
          description="Featured stock earns stronger placement, trust cues, and faster response loops for serious inventory operators."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {featuredCars.length > 0 ? (
            featuredCars.map((listing) => (
              <ListingCard
                favoriteBusy={favoriteBusyId === listing._id}
                key={listing._id}
                listing={listing}
                onFavorite={toggleFavorite}
              />
            ))
          ) : (
            <div className="lg:col-span-2 xl:col-span-4">
              <EmptyState
                copy="Featured dealer inventory will appear here once the backend is seeded or live dealers boost active listings."
                title="Featured cars are loading"
              />
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="rounded-4xl bg-ink p-8 text-white shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/70">Trust stack</p>
            <h3 className="mt-3 text-3xl font-black">Verification before visibility</h3>
            <p className="mt-4 text-white/80">
              Seller ID simulation, dealer badges, admin moderation, reporting, and ratings help buyers sort genuine sellers from risky listings fast.
            </p>
          </div>
          <div className="rounded-4xl bg-sand p-8 shadow-card">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-ember">Dealer tools</p>
            <h3 className="mt-3 text-3xl font-black text-ink">Inventory, leads, and plan upgrades</h3>
            <p className="mt-4 text-slate">
              Every dealer gets listing management, lead tracking, featured boosts, saves, and subscription tiers designed for real Kenyan yards.
            </p>
          </div>
          <div className="rounded-4xl bg-moss p-8 text-white shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/80">Price intelligence</p>
            <h3 className="mt-3 text-3xl font-black">Good deal, fair, overpriced</h3>
            <p className="mt-4 text-white/85">
              Listings are benchmarked against stored average market prices so buyers can evaluate value instead of guessing from noisy classifieds.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Fresh Stock"
          title="New arrivals across Nairobi, Nakuru, Kisumu, and Mombasa"
          description="Mobile-first cards keep search fast while still surfacing financing, verification, and pricing signals."
          action={
            <Link className="button-secondary px-6 py-3" href="/cars">
              Explore all cars
            </Link>
          }
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {latestCars.map((listing) => (
            <ListingCard
              favoriteBusy={favoriteBusyId === listing._id}
              key={listing._id}
              listing={listing}
              onFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
