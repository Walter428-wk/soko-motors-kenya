const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const LOCATIONS = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Kiambu",
  "Thika",
  "Machakos",
  "Naivasha",
  "Kitengela"
];

const MAKES = [
  "Toyota",
  "Mazda",
  "Subaru",
  "Nissan",
  "Honda",
  "Mercedes-Benz",
  "BMW",
  "Isuzu",
  "Mitsubishi",
  "Volkswagen"
];

const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const CONDITIONS = ["New", "Foreign Used", "Locally Used"];
const IMPORT_STATUSES = ["Imported", "Local"];

const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter Yard",
    priceMonthly: 4900,
    listingLimit: 8,
    featuredCredits: 1,
    perks: [
      "Dealer profile with trust badge",
      "Lead inbox and WhatsApp tracking",
      "1 featured listing credit per month"
    ]
  },
  {
    id: "growth",
    name: "Growth Dealer",
    priceMonthly: 9900,
    listingLimit: 25,
    featuredCredits: 5,
    perks: [
      "Priority placement in search",
      "5 featured listing credits",
      "Analytics for views, leads, and saves"
    ]
  },
  {
    id: "premier",
    name: "Premier Network",
    priceMonthly: 19900,
    listingLimit: 100,
    featuredCredits: 15,
    perks: [
      "Unlimited team-ready inventory scale",
      "15 featured credits with premium badge",
      "Priority support and suspicious listing shield"
    ]
  }
];

const connectDatabase = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing from environment variables.");
  }

  await mongoose.connect(mongoUri, {
    autoIndex: true
  });
};

module.exports = {
  CONDITIONS,
  FUEL_TYPES,
  IMPORT_STATUSES,
  LOCATIONS,
  MAKES,
  SUBSCRIPTION_PLANS,
  TRANSMISSIONS,
  connectDatabase
};
