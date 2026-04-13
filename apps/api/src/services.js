const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const {
  CONDITIONS,
  FUEL_TYPES,
  IMPORT_STATUSES,
  LOCATIONS,
  MAKES,
  SUBSCRIPTION_PLANS,
  TRANSMISSIONS
} = require("./config");

const normalizeText = (value = "") =>
  value
    .toString()
    .trim()
    .replace(/\s+/g, " ");

const issueToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });

const getPlanById = (planId) =>
  SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) || SUBSCRIPTION_PLANS[0];

const buildSellerSnapshot = (user) => ({
  name: user.name,
  companyName: user.dealerProfile?.companyName || "",
  whatsappNumber: user.whatsappNumber || user.phone || "",
  phone: user.phone || "",
  isVerified: user.isVerified,
  ratingAverage: Number(user.rating?.average || 0),
  ratingCount: Number(user.rating?.count || 0),
  role: user.role
});

const updateSellerMetrics = (user) => {
  const reviews = user.sellerReviews || [];
  const count = reviews.length;
  const average =
    count === 0
      ? 0
      : Number(
          (reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / count).toFixed(1)
        );

  user.rating = { average, count };
};

const syncSellerListings = async (Listing, user) => {
  await Listing.updateMany(
    { seller: user._id },
    {
      $set: {
        sellerSnapshot: buildSellerSnapshot(user)
      }
    }
  );
};

const resolvePricingInsight = async ({ make, model, year, price, listingId }, MarketPrice, Listing) => {
  const normalizedMake = normalizeText(make);
  const normalizedModel = normalizeText(model);
  const numericYear = Number(year);
  const numericPrice = Number(price);

  const marketEntries = await MarketPrice.find({
    make: normalizedMake,
    model: normalizedModel
  }).lean();

  let benchmark = null;

  if (marketEntries.length > 0) {
    const closest = marketEntries.sort(
      (first, second) => Math.abs(first.year - numericYear) - Math.abs(second.year - numericYear)
    )[0];
    benchmark = closest.averagePrice;
  } else {
    const listingMatch = {
      make: normalizedMake,
      model: normalizedModel,
      status: { $in: ["approved", "sold"] }
    };

    if (listingId) {
      listingMatch._id = { $ne: new mongoose.Types.ObjectId(listingId) };
    }

    const aggregate = await Listing.aggregate([
      { $match: listingMatch },
      {
        $group: {
          _id: null,
          averagePrice: { $avg: "$price" }
        }
      }
    ]);

    if (aggregate[0]?.averagePrice) {
      benchmark = Math.round(aggregate[0].averagePrice);
    }
  }

  if (!benchmark) {
    return {
      label: "No Data",
      benchmark: null,
      deltaPercentage: null
    };
  }

  const deltaPercentage = Number((((numericPrice - benchmark) / benchmark) * 100).toFixed(1));
  let label = "Fair Price";

  if (deltaPercentage <= -8) {
    label = "Good Deal";
  } else if (deltaPercentage >= 8) {
    label = "Overpriced";
  }

  return {
    label,
    benchmark,
    deltaPercentage
  };
};

const buildPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  whatsappNumber: user.whatsappNumber,
  role: user.role,
  isVerified: user.isVerified,
  verification: user.verification,
  dealerProfile: user.dealerProfile,
  rating: user.rating,
  subscription: user.subscription,
  createdAt: user.createdAt
});

const buildListingFilters = (query = {}) => {
  const filters = {
    status: { $in: ["approved", "sold"] }
  };

  if (query.make) filters.make = normalizeText(query.make);
  if (query.model) filters.model = new RegExp(normalizeText(query.model), "i");
  if (query.fuelType) filters.fuelType = query.fuelType;
  if (query.transmission) filters.transmission = query.transmission;
  if (query.location) filters.location = query.location;
  if (query.importStatus) filters.importStatus = query.importStatus;
  if (query.condition) filters.condition = query.condition;
  if (query.featuredOnly === "true") filters["featured.enabled"] = true;

  if (query.hirePurchase === "true") {
    filters.hirePurchaseAvailable = true;
  }

  const priceFilter = {};
  if (query.minPrice) priceFilter.$gte = Number(query.minPrice);
  if (query.maxPrice) priceFilter.$lte = Number(query.maxPrice);
  if (Object.keys(priceFilter).length > 0) filters.price = priceFilter;

  const yearFilter = {};
  if (query.minYear) yearFilter.$gte = Number(query.minYear);
  if (query.maxYear) yearFilter.$lte = Number(query.maxYear);
  if (Object.keys(yearFilter).length > 0) filters.year = yearFilter;

  return filters;
};

const buildListingSort = (sort = "newest") => {
  switch (sort) {
    case "price_asc":
      return { price: 1, createdAt: -1 };
    case "price_desc":
      return { price: -1, createdAt: -1 };
    case "most_viewed":
      return { "stats.views": -1, createdAt: -1 };
    case "oldest":
      return { createdAt: 1 };
    default:
      return { "featured.enabled": -1, createdAt: -1 };
  }
};

const buildMarketplaceMeta = () => ({
  locations: LOCATIONS,
  makes: MAKES,
  fuelTypes: FUEL_TYPES,
  transmissions: TRANSMISSIONS,
  conditions: CONDITIONS,
  importStatuses: IMPORT_STATUSES,
  subscriptionPlans: SUBSCRIPTION_PLANS
});

module.exports = {
  buildListingFilters,
  buildListingSort,
  buildMarketplaceMeta,
  buildPublicUser,
  buildSellerSnapshot,
  getPlanById,
  issueToken,
  normalizeText,
  resolvePricingInsight,
  syncSellerListings,
  updateSellerMetrics
};
