const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const sellerReviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing"
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 300
    }
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    phone: {
      type: String,
      trim: true
    },
    whatsappNumber: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ["buyer", "seller", "dealer", "admin"],
      default: "buyer"
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verification: {
      status: {
        type: String,
        enum: ["unsubmitted", "pending", "approved", "rejected"],
        default: "unsubmitted"
      },
      idNumber: String,
      documentName: String,
      submittedAt: Date,
      reviewedAt: Date
    },
    dealerProfile: {
      companyName: String,
      companyLocation: String,
      yearsInBusiness: Number,
      badgeLabel: {
        type: String,
        default: "Verified Dealer"
      }
    },
    rating: {
      average: {
        type: Number,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      }
    },
    sellerReviews: [sellerReviewSchema],
    subscription: {
      planId: {
        type: String,
        default: "starter"
      },
      status: {
        type: String,
        enum: ["inactive", "active"],
        default: "inactive"
      },
      startsAt: Date,
      endsAt: Date,
      featuredCredits: {
        type: Number,
        default: 0
      }
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function toJSON() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const listingSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 1
    },
    make: {
      type: String,
      required: true,
      trim: true
    },
    model: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      required: true
    },
    mileage: {
      type: Number,
      required: true,
      min: 0
    },
    fuelType: {
      type: String,
      required: true
    },
    transmission: {
      type: String,
      required: true
    },
    condition: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    importStatus: {
      type: String,
      required: true
    },
    hirePurchaseAvailable: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      required: true,
      maxlength: 2500
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "sold", "flagged"],
      default: "pending"
    },
    featured: {
      enabled: {
        type: Boolean,
        default: false
      },
      tier: {
        type: String,
        enum: ["none", "featured", "spotlight"],
        default: "none"
      },
      expiresAt: Date
    },
    pricingInsight: {
      label: {
        type: String,
        enum: ["Good Deal", "Fair Price", "Overpriced", "No Data"],
        default: "No Data"
      },
      benchmark: Number,
      deltaPercentage: Number
    },
    sellerSnapshot: {
      name: String,
      companyName: String,
      whatsappNumber: String,
      phone: String,
      isVerified: Boolean,
      ratingAverage: Number,
      ratingCount: Number,
      role: String
    },
    stats: {
      views: {
        type: Number,
        default: 0
      },
      leads: {
        type: Number,
        default: 0
      },
      saves: {
        type: Number,
        default: 0
      }
    },
    flags: {
      type: [String],
      default: []
    },
    reportCount: {
      type: Number,
      default: 0
    },
    adminNotes: String
  },
  { timestamps: true }
);

listingSchema.index({ make: 1, model: 1, year: 1, price: 1 });
listingSchema.index({ status: 1, location: 1, createdAt: -1 });
listingSchema.index({ "featured.enabled": 1, createdAt: -1 });

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    }
  },
  { timestamps: true }
);

favoriteSchema.index({ user: 1, listing: 1 }, { unique: true });

const leadSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    buyerName: String,
    buyerPhone: String,
    buyerEmail: String,
    message: String,
    source: {
      type: String,
      enum: ["whatsapp", "call", "form"],
      default: "whatsapp"
    }
  },
  { timestamps: true }
);

const reportSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reason: {
      type: String,
      required: true
    },
    details: String,
    status: {
      type: String,
      enum: ["open", "reviewed", "dismissed"],
      default: "open"
    }
  },
  { timestamps: true }
);

const marketPriceSchema = new mongoose.Schema(
  {
    make: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    averagePrice: {
      type: Number,
      required: true
    },
    sampleSize: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true }
);

marketPriceSchema.index({ make: 1, model: 1, year: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Listing = mongoose.models.Listing || mongoose.model("Listing", listingSchema);
const Favorite = mongoose.models.Favorite || mongoose.model("Favorite", favoriteSchema);
const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);
const MarketPrice =
  mongoose.models.MarketPrice || mongoose.model("MarketPrice", marketPriceSchema);

module.exports = {
  Favorite,
  Lead,
  Listing,
  MarketPrice,
  Report,
  User
};
