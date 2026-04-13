"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSession } from "@/components/app-shell";
import { EmptyState, SectionHeading } from "@/components/ui";
import { apiFetch, marketplaceDefaults } from "@/lib/api";

const initialForm = {
  title: "",
  price: "",
  make: "",
  model: "",
  year: "",
  mileage: "",
  fuelType: "Petrol",
  transmission: "Automatic",
  condition: "Foreign Used",
  location: "Nairobi",
  importStatus: "Imported",
  hirePurchaseAvailable: false,
  description: "",
  imageText: ""
};

export default function SellPage() {
  const router = useRouter();
  const { session } = useSession();
  const [form, setForm] = useState(initialForm);
  const [options, setOptions] = useState(marketplaceDefaults);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/listings/meta")
      .then((data) => setOptions(data))
      .catch(() => setOptions(marketplaceDefaults));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!session?.token) {
      router.push("/auth");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await apiFetch("/api/listings", {
        method: "POST",
        token: session.token,
        body: {
          ...form,
          images: form.imageText
            .split("\n")
            .map((entry) => entry.trim())
            .filter(Boolean)
        }
      });

      setMessage("Listing submitted successfully. The admin queue will now review it.");
      setForm(initialForm);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.token) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          action={
            <Link className="button-primary inline-flex px-6 py-3" href="/auth">
              Sign in to post a car
            </Link>
          }
          copy="Seller and dealer accounts can create stock, manage featured boosts, and request verification from the dashboard."
          title="Posting inventory requires an account"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Seller workflow"
        title="Post inventory with Kenya-specific data that buyers actually care about"
        description="Capture price, financing, import status, location, and multiple photos so trust signals are visible before a buyer opens WhatsApp."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <form className="panel rounded-4xl p-8" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate">Listing title</label>
              <input
                className="field"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. 2019 Mazda CX-5 Touring AWD"
                value={form.title}
              />
            </div>

            {[
              ["price", "Price (KES)", "number"],
              ["model", "Model", "text"],
              ["year", "Year", "number"],
              ["mileage", "Mileage (km)", "number"]
            ].map(([key, label, type]) => (
              <div key={key}>
                <label className="mb-2 block text-sm font-semibold text-slate">{label}</label>
                <input
                  className="field"
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  required
                  type={type}
                  value={form[key]}
                />
              </div>
            ))}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate">Make</label>
              <select
                className="field"
                onChange={(event) => setForm((current) => ({ ...current, make: event.target.value }))}
                required
                value={form.make}
              >
                <option value="">Select make</option>
                {options.makes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
            </div>

            {[
              ["fuelType", "Fuel type", options.fuelTypes],
              ["transmission", "Transmission", options.transmissions],
              ["condition", "Condition", options.conditions],
              ["location", "Location", options.locations],
              ["importStatus", "Import status", options.importStatuses]
            ].map(([key, label, values]) => (
              <div key={key}>
                <label className="mb-2 block text-sm font-semibold text-slate">{label}</label>
                <select
                  className="field"
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  value={form[key]}
                >
                  {values.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="md:col-span-2 flex items-center gap-3 rounded-3xl bg-sand px-4 py-4">
              <input
                checked={form.hirePurchaseAvailable}
                id="hirePurchase"
                onChange={(event) =>
                  setForm((current) => ({ ...current, hirePurchaseAvailable: event.target.checked }))
                }
                type="checkbox"
              />
              <label className="text-sm font-semibold text-ink" htmlFor="hirePurchase">
                Hire purchase is available for this car
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate">Description</label>
              <textarea
                className="field min-h-36"
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                required
                value={form.description}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate">Image URLs</label>
              <textarea
                className="field min-h-36"
                onChange={(event) => setForm((current) => ({ ...current, imageText: event.target.value }))}
                placeholder="Paste one image URL per line"
                value={form.imageText}
              />
            </div>
          </div>

          {error ? <div className="mt-6 rounded-3xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
          {message ? <div className="mt-6 rounded-3xl bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">{message}</div> : null}

          <button className="button-primary mt-8 w-full px-6 py-3" disabled={loading} type="submit">
            {loading ? "Submitting..." : "Submit Listing"}
          </button>
        </form>

        <div className="space-y-6">
          <div className="rounded-4xl bg-ink p-8 text-white shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/70">Publishing flow</p>
            <h2 className="mt-3 text-3xl font-black">Built for dealer ops, not hobby classifieds</h2>
            <p className="mt-4 text-white/80">
              New listings enter an admin approval queue by default, then become eligible for featured boosts and pricing insight once published.
            </p>
          </div>

          <div className="rounded-4xl bg-white p-8 shadow-card">
            <h3 className="text-2xl font-black text-ink">What buyers see immediately</h3>
            <div className="mt-5 space-y-3 text-sm text-slate">
              <p>Price intelligence label: Good Deal, Fair Price, or Overpriced.</p>
              <p>Seller verification badge and rating summary.</p>
              <p>Kenyan location, import status, financing, and WhatsApp lead button.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
