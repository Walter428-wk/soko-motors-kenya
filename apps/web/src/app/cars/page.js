"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";

import { useSession } from "@/components/app-shell";
import { EmptyState, ListingCard, SectionHeading } from "@/components/ui";
import { apiFetch, createQueryString, marketplaceDefaults } from "@/lib/api";

const buildInitialFilters = (searchParams) => ({
  minPrice: searchParams.get("minPrice") || "",
  maxPrice: searchParams.get("maxPrice") || "",
  make: searchParams.get("make") || "",
  model: searchParams.get("model") || "",
  minYear: searchParams.get("minYear") || "",
  maxYear: searchParams.get("maxYear") || "",
  fuelType: searchParams.get("fuelType") || "",
  transmission: searchParams.get("transmission") || "",
  location: searchParams.get("location") || "",
  importStatus: searchParams.get("importStatus") || "",
  hirePurchase: searchParams.get("hirePurchase") || "",
  sort: searchParams.get("sort") || "newest"
});

export default function CarsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const [filters, setFilters] = useState(() => buildInitialFilters(searchParams));
  const [options, setOptions] = useState(marketplaceDefaults);
  const [listings, setListings] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteBusyId, setFavoriteBusyId] = useState("");
  const deferredModel = useDeferredValue(filters.model);

  useEffect(() => {
    apiFetch("/api/listings/meta")
      .then((data) => setOptions(data))
      .catch(() => setOptions(marketplaceDefaults));
  }, []);

  useEffect(() => {
    const activeFilters = { ...filters, model: deferredModel };
    setLoading(true);
    setError("");

    apiFetch(`/api/listings?${createQueryString(activeFilters)}`, {
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined
    })
      .then((data) => {
        setListings(data.items || []);
        setMeta(data.meta || { total: 0 });
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [
    deferredModel,
    filters.fuelType,
    filters.hirePurchase,
    filters.importStatus,
    filters.location,
    filters.make,
    filters.maxPrice,
    filters.maxYear,
    filters.minPrice,
    filters.minYear,
    filters.sort,
    filters.transmission,
    session?.token
  ]);

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
      setListings((current) =>
        current.map((item) => (item._id === listing._id ? { ...item, isFavorited: response.isFavorited } : item))
      );
    } finally {
      setFavoriteBusyId("");
    }
  };

  const resetFilters = () => {
    setFilters({
      minPrice: "",
      maxPrice: "",
      make: "",
      model: "",
      minYear: "",
      maxYear: "",
      fuelType: "",
      transmission: "",
      location: "",
      importStatus: "",
      hirePurchase: "",
      sort: "newest"
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Marketplace"
        title="Search inventory with Kenyan filters buyers expect"
        description="Browse by city, financing, import status, drivetrain basics, and market-based pricing so every search feels grounded in local reality."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="panel h-fit rounded-4xl p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">Filters</h2>
            <button className="text-sm font-semibold text-moss" onClick={resetFilters} type="button">
              Reset
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["minPrice", "Min price"],
                ["maxPrice", "Max price"],
                ["minYear", "Min year"],
                ["maxYear", "Max year"]
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="mb-2 block text-sm font-semibold text-slate">{label}</label>
                  <input
                    className="field"
                    onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
                    type="number"
                    value={filters[key]}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate">Make</label>
              <select
                className="field"
                onChange={(event) => setFilters((current) => ({ ...current, make: event.target.value }))}
                value={filters.make}
              >
                <option value="">Any make</option>
                {options.makes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate">Model</label>
              <input
                className="field"
                onChange={(event) => setFilters((current) => ({ ...current, model: event.target.value }))}
                placeholder="e.g. Harrier"
                value={filters.model}
              />
            </div>

            {[
              ["fuelType", "Fuel type", options.fuelTypes],
              ["transmission", "Transmission", options.transmissions],
              ["location", "Location", options.locations],
              ["importStatus", "Imported / Local", options.importStatuses]
            ].map(([key, label, values]) => (
              <div key={key}>
                <label className="mb-2 block text-sm font-semibold text-slate">{label}</label>
                <select
                  className="field"
                  onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
                  value={filters[key]}
                >
                  <option value="">Any</option>
                  {values.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate">Hire purchase</label>
              <select
                className="field"
                onChange={(event) => setFilters((current) => ({ ...current, hirePurchase: event.target.value }))}
                value={filters.hirePurchase}
              >
                <option value="">Any</option>
                <option value="true">Available</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate">Sort by</label>
              <select
                className="field"
                onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
                value={filters.sort}
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="most_viewed">Most Viewed</option>
              </select>
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-moss">Results</p>
              <h2 className="mt-2 text-3xl font-black text-ink">{meta.total || 0} cars matched</h2>
            </div>
            <button
              className="button-secondary px-5 py-3"
              onClick={() => router.push(`/cars?${createQueryString(filters)}`)}
              type="button"
            >
              Refresh URL
            </button>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="h-[26rem] animate-pulse rounded-4xl bg-white shadow-card" key={index} />
              ))}
            </div>
          ) : error ? (
            <EmptyState copy={error} title="We could not load inventory" />
          ) : listings.length === 0 ? (
            <EmptyState
              copy="Try widening the budget, removing the make filter, or checking nearby Kenyan cities."
              title="No cars matched these filters"
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard
                  favoriteBusy={favoriteBusyId === listing._id}
                  key={listing._id}
                  listing={listing}
                  onFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
