const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");

const { SUBSCRIPTION_PLANS } = require("./config");
const { Favorite, Lead, Listing, MarketPrice, Report, User } = require("./models");
const {
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
} = require("./services");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

const catchAsync = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const getBearerToken = (req) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.replace("Bearer ", "");
  }
  return null;
};

const optionalAuth = catchAsync(async (req, _res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch (_error) {
    req.user = null;
  }

  return next();
});

const protect = catchAsync(async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user) {
    return res.status(401).json({ message: "Session is no longer valid." });
  }

  req.user = user;
  return next();
});

const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have access to this action." });
  }

  return next();
};

const sanitizeListingPayload = (payload = {}) => {
  const images = Array.isArray(payload.images)
    ? payload.images.filter(Boolean).map((image) => normalizeText(image))
    : [];

  return {
    title: normalizeText(payload.title || `${payload.year} ${payload.make} ${payload.model}`),
    price: Number(payload.price),
    make: normalizeText(payload.make),
    model: normalizeText(payload.model),
    year: Number(payload.year),
    mileage: Number(payload.mileage),
    fuelType: payload.fuelType,
    transmission: payload.transmission,
    condition: payload.condition,
    location: payload.location,
    importStatus: payload.importStatus,
    hirePurchaseAvailable: Boolean(payload.hirePurchaseAvailable),
    description: normalizeText(payload.description),
    images
  };
};

const ensureListingOwner = (listing, user) =>
  user.role === "admin" || listing.seller.toString() === user._id.toString();

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Soko Motors Kenya API",
    timestamp: new Date().toISOString()
  });
});

app.post(
  "/api/auth/register",
  catchAsync(async (req, res) => {
    const { name, email, password, phone, whatsappNumber, role, companyName, companyLocation } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "An account already exists with that email." });
    }

    const normalizedRole = ["buyer", "seller", "dealer"].includes(role) ? role : "buyer";

    if (normalizedRole === "dealer" && !companyName) {
      return res.status(400).json({ message: "Dealer accounts require a company name." });
    }

    const user = await User.create({
      name: normalizeText(name),
      email: email.toLowerCase(),
      password,
      phone: normalizeText(phone),
      whatsappNumber: normalizeText(whatsappNumber || phone),
      role: normalizedRole,
      dealerProfile:
        normalizedRole === "dealer"
          ? {
              companyName: normalizeText(companyName),
              companyLocation: normalizeText(companyLocation),
              badgeLabel: "Dealer Pending Verification"
            }
          : undefined
    });

    return res.status(201).json({
      token: issueToken(user),
      user: buildPublicUser(user),
      plans: SUBSCRIPTION_PLANS
    });
  })
);

app.post(
  "/api/auth/login",
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid login details." });
    }

    return res.json({
      token: issueToken(user),
      user: buildPublicUser(user),
      plans: SUBSCRIPTION_PLANS
    });
  })
);

app.get(
  "/api/auth/me",
  protect,
  catchAsync(async (req, res) => {
    return res.json({ user: buildPublicUser(req.user) });
  })
);

app.patch(
  "/api/users/me/verify",
  protect,
  catchAsync(async (req, res) => {
    if (!["seller", "dealer", "admin"].includes(req.user.role)) {
      return res.status(400).json({ message: "Only sellers and dealers can request verification." });
    }

    const { idNumber, documentName, companyName, companyLocation, yearsInBusiness } = req.body;

    if (!idNumber || !documentName) {
      return res
        .status(400)
        .json({ message: "Submit an ID number and a simulated document upload name." });
    }

    req.user.verification = {
      status: "pending",
      idNumber: normalizeText(idNumber),
      documentName: normalizeText(documentName),
      submittedAt: new Date(),
      reviewedAt: null
    };

    if (req.user.role === "dealer") {
      req.user.dealerProfile = {
        companyName: normalizeText(companyName || req.user.dealerProfile?.companyName),
        companyLocation: normalizeText(companyLocation || req.user.dealerProfile?.companyLocation),
        yearsInBusiness: Number(yearsInBusiness || req.user.dealerProfile?.yearsInBusiness || 0),
        badgeLabel: req.user.isVerified ? "Verified Dealer" : "Dealer Pending Verification"
      };
    }

    await req.user.save();
    await syncSellerListings(Listing, req.user);

    return res.json({
      message: "Verification submitted. Admin review is now pending.",
      user: buildPublicUser(req.user)
    });
  })
);

app.patch(
  "/api/users/me/subscription",
  protect,
  catchAsync(async (req, res) => {
    const { planId } = req.body;

    if (!["seller", "dealer", "admin"].includes(req.user.role)) {
      return res.status(400).json({ message: "Subscriptions are available to sellers and dealers." });
    }

    const plan = getPlanById(planId);
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30);

    req.user.subscription = {
      planId: plan.id,
      status: "active",
      startsAt,
      endsAt,
      featuredCredits: plan.featuredCredits
    };

    await req.user.save();

    return res.json({
      message: `Your ${plan.name} subscription is active.`,
      user: buildPublicUser(req.user),
      plan
    });
  })
);

app.get(
  "/api/users/me/dashboard",
  protect,
  catchAsync(async (req, res) => {
    const listingIds = await Listing.find({ seller: req.user._id }).distinct("_id");
    const [myListings, favorites, leads, reports] = await Promise.all([
      Listing.find({ seller: req.user._id }).sort({ createdAt: -1 }).lean(),
      Favorite.find({ user: req.user._id })
        .populate({
          path: "listing",
          populate: {
            path: "seller",
            select: "name isVerified dealerProfile rating"
          }
        })
        .sort({ createdAt: -1 })
        .lean(),
      Lead.find({ listing: { $in: listingIds } }).sort({ createdAt: -1 }).lean(),
      Report.find({ listing: { $in: listingIds } }).sort({ createdAt: -1 }).lean()
    ]);

    const totals = myListings.reduce(
      (summary, listing) => {
        summary.views += listing.stats?.views || 0;
        summary.leads += listing.stats?.leads || 0;
        summary.saves += listing.stats?.saves || 0;
        if (listing.status === "approved") summary.active += 1;
        if (listing.status === "pending") summary.pending += 1;
        if (listing.status === "sold") summary.sold += 1;
        return summary;
      },
      { views: 0, leads: 0, saves: 0, active: 0, pending: 0, sold: 0 }
    );

    return res.json({
      user: buildPublicUser(req.user),
      listings: myListings,
      favorites: favorites
        .filter((entry) => entry.listing)
        .map((entry) => ({ ...entry.listing, favoriteId: entry._id })),
      totals,
      leadFeed: leads,
      reports,
      subscriptionPlans: SUBSCRIPTION_PLANS
    });
  })
);

app.get("/api/listings/meta", (_req, res) => {
  return res.json(buildMarketplaceMeta());
});

app.get(
  "/api/listings/featured",
  optionalAuth,
  catchAsync(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 6, 12);
    const listings = await Listing.find({
      status: "approved",
      "featured.enabled": true
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    let favoriteIds = new Set();
    if (req.user && listings.length > 0) {
      const favorites = await Favorite.find({
        user: req.user._id,
        listing: { $in: listings.map((listing) => listing._id) }
      }).lean();
      favoriteIds = new Set(favorites.map((favorite) => favorite.listing.toString()));
    }

    return res.json({
      items: listings.map((listing) => ({
        ...listing,
        isFavorited: favoriteIds.has(listing._id.toString())
      }))
    });
  })
);

app.get(
  "/api/listings",
  optionalAuth,
  catchAsync(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(24, Number(req.query.limit) || 12);
    const filters = buildListingFilters(req.query);

    if (req.query.mine === "true" && req.user) {
      filters.seller = req.user._id;
      delete filters.status;
      if (req.query.status) {
        filters.status = req.query.status;
      }
    }

    const [items, total] = await Promise.all([
      Listing.find(filters)
        .sort(buildListingSort(req.query.sort))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Listing.countDocuments(filters)
    ]);

    let favoriteIds = new Set();
    if (req.user && items.length > 0) {
      const favorites = await Favorite.find({
        user: req.user._id,
        listing: { $in: items.map((listing) => listing._id) }
      }).lean();
      favoriteIds = new Set(favorites.map((favorite) => favorite.listing.toString()));
    }

    return res.json({
      items: items.map((listing) => ({
        ...listing,
        isFavorited: favoriteIds.has(listing._id.toString())
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        filters: buildMarketplaceMeta()
      }
    });
  })
);

app.get(
  "/api/listings/:id",
  optionalAuth,
  catchAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id)
      .populate("seller", "name phone whatsappNumber role isVerified dealerProfile rating createdAt")
      .lean();

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    const canViewPrivate =
      req.user &&
      (req.user.role === "admin" || req.user._id.toString() === listing.seller?._id?.toString());

    if (!["approved", "sold"].includes(listing.status) && !canViewPrivate) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (!canViewPrivate) {
      await Listing.findByIdAndUpdate(listing._id, { $inc: { "stats.views": 1 } });
      listing.stats.views += 1;
    }

    const [similarCars, favorite] = await Promise.all([
      Listing.find({
        _id: { $ne: listing._id },
        status: "approved",
        make: listing.make,
        $or: [{ model: listing.model }, { location: listing.location }]
      })
        .sort({ "featured.enabled": -1, createdAt: -1 })
        .limit(4)
        .lean(),
      req.user
        ? Favorite.findOne({
            user: req.user._id,
            listing: listing._id
          }).lean()
        : null
    ]);

    return res.json({
      item: {
        ...listing,
        isFavorited: Boolean(favorite)
      },
      similarCars
    });
  })
);

app.post(
  "/api/listings",
  protect,
  allowRoles("seller", "dealer", "admin"),
  catchAsync(async (req, res) => {
    const payload = sanitizeListingPayload(req.body);

    if (
      !payload.make ||
      !payload.model ||
      !payload.year ||
      !payload.price ||
      !payload.location ||
      !payload.description
    ) {
      return res.status(400).json({ message: "Complete the required listing details." });
    }

    const plan = getPlanById(req.user.subscription?.planId);
    const currentInventoryCount = await Listing.countDocuments({
      seller: req.user._id,
      status: { $nin: ["rejected"] }
    });
    const allowedListings = req.user.subscription?.status === "active" ? plan.listingLimit : 3;

    if (currentInventoryCount >= allowedListings && req.user.role !== "admin") {
      return res.status(400).json({
        message: `Your current plan allows ${allowedListings} active listings. Upgrade to add more stock.`
      });
    }

    const pricingInsight = await resolvePricingInsight(payload, MarketPrice, Listing);

    const listing = await Listing.create({
      ...payload,
      seller: req.user._id,
      sellerSnapshot: buildSellerSnapshot(req.user),
      pricingInsight,
      status: req.user.role === "admin" ? "approved" : "pending"
    });

    return res.status(201).json({
      message:
        listing.status === "approved"
          ? "Listing created and published."
          : "Listing submitted and waiting for admin approval.",
      item: listing
    });
  })
);

app.put(
  "/api/listings/:id",
  protect,
  catchAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (!ensureListingOwner(listing, req.user)) {
      return res.status(403).json({ message: "You cannot edit this listing." });
    }

    const payload = sanitizeListingPayload({
      ...listing.toObject(),
      ...req.body
    });

    const pricingInsight = await resolvePricingInsight(
      { ...payload, listingId: listing._id.toString() },
      MarketPrice,
      Listing
    );

    Object.assign(listing, payload, {
      pricingInsight,
      sellerSnapshot: buildSellerSnapshot(req.user)
    });

    if (req.user.role !== "admin" && listing.status !== "sold") {
      listing.status = "pending";
    }

    await listing.save();

    return res.json({
      message: "Listing updated successfully.",
      item: listing
    });
  })
);

app.patch(
  "/api/listings/:id/sold",
  protect,
  catchAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (!ensureListingOwner(listing, req.user)) {
      return res.status(403).json({ message: "You cannot update this listing." });
    }

    listing.status = "sold";
    await listing.save();

    return res.json({ message: "Listing marked as sold.", item: listing });
  })
);

app.post(
  "/api/listings/:id/feature",
  protect,
  catchAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (!ensureListingOwner(listing, req.user)) {
      return res.status(403).json({ message: "You cannot feature this listing." });
    }

    if (req.user.subscription?.status !== "active" || req.user.subscription.featuredCredits < 1) {
      return res.status(400).json({
        message: "You need an active dealer plan with featured credits to boost inventory."
      });
    }

    req.user.subscription.featuredCredits -= 1;
    listing.featured = {
      enabled: true,
      tier: "featured",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    };

    await Promise.all([req.user.save(), listing.save()]);

    return res.json({
      message: "Your listing is now featured for 7 days.",
      item: listing,
      user: buildPublicUser(req.user)
    });
  })
);

app.post(
  "/api/listings/:id/favorite",
  protect,
  catchAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing || !["approved", "sold"].includes(listing.status)) {
      return res.status(404).json({ message: "Listing not found." });
    }

    const existingFavorite = await Favorite.findOne({
      user: req.user._id,
      listing: listing._id
    });

    let message = "Listing saved.";
    if (existingFavorite) {
      await existingFavorite.deleteOne();
      message = "Listing removed from saved cars.";
    } else {
      await Favorite.create({
        user: req.user._id,
        listing: listing._id
      });
    }

    listing.stats.saves = await Favorite.countDocuments({ listing: listing._id });
    await listing.save();

    return res.json({
      message,
      isFavorited: !existingFavorite,
      saves: listing.stats.saves
    });
  })
);

app.post(
  "/api/listings/:id/lead",
  optionalAuth,
  catchAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing || listing.status !== "approved") {
      return res.status(404).json({ message: "Listing not found." });
    }

    const lead = await Lead.create({
      listing: listing._id,
      buyer: req.user?._id,
      buyerName: normalizeText(req.body.buyerName || req.user?.name || "Interested buyer"),
      buyerPhone: normalizeText(req.body.buyerPhone || req.user?.phone || ""),
      buyerEmail: normalizeText(req.body.buyerEmail || req.user?.email || ""),
      message: normalizeText(req.body.message || "Interested in this vehicle."),
      source: req.body.source || "whatsapp"
    });

    listing.stats.leads += 1;
    await listing.save();

    return res.status(201).json({
      message: "Lead captured successfully.",
      item: lead
    });
  })
);

app.post(
  "/api/listings/:id/report",
  optionalAuth,
  catchAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (!req.body.reason) {
      return res.status(400).json({ message: "Select a reason to report this listing." });
    }

    const report = await Report.create({
      listing: listing._id,
      reporter: req.user?._id,
      reason: normalizeText(req.body.reason),
      details: normalizeText(req.body.details)
    });

    listing.reportCount += 1;
    if (listing.reportCount >= 3) {
      listing.status = "flagged";
      if (!listing.flags.includes("Suspicious activity")) {
        listing.flags.push("Suspicious activity");
      }
    }
    await listing.save();

    return res.status(201).json({
      message: "Report submitted. Our moderation team will review it.",
      item: report
    });
  })
);

app.post(
  "/api/listings/:id/rate",
  protect,
  catchAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    const seller = await User.findById(listing.seller);
    if (!seller) {
      return res.status(404).json({ message: "Seller not found." });
    }

    if (seller._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot rate your own seller profile." });
    }

    const rating = Number(req.body.rating);
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Provide a rating between 1 and 5." });
    }

    const existingReview = seller.sellerReviews.find(
      (review) =>
        review.reviewer?.toString() === req.user._id.toString() &&
        review.listing?.toString() === listing._id.toString()
    );

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = normalizeText(req.body.comment);
    } else {
      seller.sellerReviews.push({
        reviewer: req.user._id,
        listing: listing._id,
        rating,
        comment: normalizeText(req.body.comment)
      });
    }

    updateSellerMetrics(seller);
    await seller.save();
    await syncSellerListings(Listing, seller);

    return res.json({
      message: "Seller rating submitted.",
      seller: buildPublicUser(seller)
    });
  })
);

app.get(
  "/api/admin/overview",
  protect,
  allowRoles("admin"),
  catchAsync(async (_req, res) => {
    const [totalUsers, totalListings, pendingListings, flaggedListings, openReports, dealerCount, users] =
      await Promise.all([
        User.countDocuments(),
        Listing.countDocuments(),
        Listing.countDocuments({ status: "pending" }),
        Listing.countDocuments({ status: "flagged" }),
        Report.countDocuments({ status: "open" }),
        User.countDocuments({ role: "dealer" }),
        User.find().lean()
      ]);

    const monthlyRevenueProjection = users.reduce((sum, user) => {
      if (user.subscription?.status !== "active") return sum;
      return sum + getPlanById(user.subscription.planId).priceMonthly;
    }, 0);

    const recentListings = await Listing.find().sort({ createdAt: -1 }).limit(8).lean();
    const recentReports = await Report.find()
      .populate("listing", "title price location")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return res.json({
      metrics: {
        totalUsers,
        totalListings,
        pendingListings,
        flaggedListings,
        openReports,
        dealerCount,
        monthlyRevenueProjection
      },
      recentListings,
      recentReports
    });
  })
);

app.get(
  "/api/admin/users",
  protect,
  allowRoles("admin"),
  catchAsync(async (_req, res) => {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    return res.json({ items: users.map(buildPublicUser) });
  })
);

app.get(
  "/api/admin/listings",
  protect,
  allowRoles("admin"),
  catchAsync(async (req, res) => {
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const listings = await Listing.find(filters).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ items: listings });
  })
);

app.patch(
  "/api/admin/users/:id/verify",
  protect,
  allowRoles("admin"),
  catchAsync(async (req, res) => {
    const { status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Verification status must be approved or rejected." });
    }

    user.verification.status = status;
    user.verification.reviewedAt = new Date();
    user.isVerified = status === "approved";

    if (user.role === "dealer") {
      user.dealerProfile = {
        ...user.dealerProfile,
        badgeLabel: status === "approved" ? "Verified Dealer" : "Dealer Verification Rejected"
      };
    }

    await user.save();
    await syncSellerListings(Listing, user);

    return res.json({
      message: `User verification ${status}.`,
      user: buildPublicUser(user)
    });
  })
);

app.patch(
  "/api/admin/listings/:id/review",
  protect,
  allowRoles("admin"),
  catchAsync(async (req, res) => {
    const { status, adminNotes, flagReason } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (!["approved", "rejected", "flagged"].includes(status)) {
      return res.status(400).json({ message: "Review status must be approved, rejected, or flagged." });
    }

    listing.status = status;
    listing.adminNotes = normalizeText(adminNotes);

    if (flagReason && !listing.flags.includes(flagReason)) {
      listing.flags.push(normalizeText(flagReason));
    }

    await listing.save();

    return res.json({
      message: `Listing ${status}.`,
      item: listing
    });
  })
);

app.use((error, _req, res, _next) => {
  const statusCode = error.name === "JsonWebTokenError" ? 401 : error.statusCode || 500;
  return res.status(statusCode).json({
    message: error.message || "Something went wrong.",
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  });
});

module.exports = app;
