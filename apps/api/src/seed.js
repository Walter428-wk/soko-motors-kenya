const { connectDatabase } = require("./config");
const { Favorite, Lead, Listing, MarketPrice, Report, User } = require("./models");
const { buildSellerSnapshot, resolvePricingInsight, updateSellerMetrics } = require("./services");

const samplePrices = [
  { make: "Toyota", model: "Harrier", year: 2018, averagePrice: 3650000, sampleSize: 18 },
  { make: "Toyota", model: "Axio", year: 2017, averagePrice: 1680000, sampleSize: 24 },
  { make: "Mazda", model: "CX-5", year: 2019, averagePrice: 3290000, sampleSize: 15 },
  { make: "Subaru", model: "Forester", year: 2016, averagePrice: 2450000, sampleSize: 12 },
  { make: "Honda", model: "Fit", year: 2018, averagePrice: 1490000, sampleSize: 22 },
  { make: "Nissan", model: "X-Trail", year: 2017, averagePrice: 2360000, sampleSize: 13 },
  { make: "Mercedes-Benz", model: "C200", year: 2016, averagePrice: 3050000, sampleSize: 10 },
  { make: "Volkswagen", model: "Tiguan", year: 2018, averagePrice: 2850000, sampleSize: 9 }
];

const demoImageSets = {
  harrier: [
    "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80"
  ],
  cx5: [
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
  ],
  axio: [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1200&q=80"
  ],
  fit: [
    "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80"
  ]
};

const createUsers = async () => {
  const admin = await User.create({
    name: "Admin Team",
    email: "admin@sokomotors.co.ke",
    password: "Pass1234!",
    phone: "0700000000",
    whatsappNumber: "0700000000",
    role: "admin",
    isVerified: true,
    verification: {
      status: "approved",
      idNumber: "ADM001234",
      documentName: "admin-id.pdf",
      submittedAt: new Date(),
      reviewedAt: new Date()
    }
  });

  const dealerOne = await User.create({
    name: "Amina Wanjiku",
    email: "dealer@sokomotors.co.ke",
    password: "Pass1234!",
    phone: "0712345678",
    whatsappNumber: "0712345678",
    role: "dealer",
    isVerified: true,
    verification: {
      status: "approved",
      idNumber: "33889901",
      documentName: "dealer-license.pdf",
      submittedAt: new Date(),
      reviewedAt: new Date()
    },
    dealerProfile: {
      companyName: "Nairobi Auto Vault",
      companyLocation: "Nairobi",
      yearsInBusiness: 8,
      badgeLabel: "Verified Dealer"
    },
    subscription: {
      planId: "premier",
      status: "active",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      featuredCredits: 12
    }
  });

  const dealerTwo = await User.create({
    name: "Kevin Otieno",
    email: "growth@sokomotors.co.ke",
    password: "Pass1234!",
    phone: "0722113344",
    whatsappNumber: "0722113344",
    role: "dealer",
    isVerified: true,
    verification: {
      status: "approved",
      idNumber: "22994455",
      documentName: "yard-verification.pdf",
      submittedAt: new Date(),
      reviewedAt: new Date()
    },
    dealerProfile: {
      companyName: "Lakeside Car Hub",
      companyLocation: "Kisumu",
      yearsInBusiness: 5,
      badgeLabel: "Verified Dealer"
    },
    subscription: {
      planId: "growth",
      status: "active",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      featuredCredits: 4
    }
  });

  const seller = await User.create({
    name: "Faith Njeri",
    email: "seller@sokomotors.co.ke",
    password: "Pass1234!",
    phone: "0733556677",
    whatsappNumber: "0733556677",
    role: "seller",
    isVerified: true,
    verification: {
      status: "approved",
      idNumber: "30115577",
      documentName: "seller-id-card.jpg",
      submittedAt: new Date(),
      reviewedAt: new Date()
    },
    subscription: {
      planId: "starter",
      status: "active",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      featuredCredits: 1
    }
  });

  const buyer = await User.create({
    name: "Brian Mwangi",
    email: "buyer@sokomotors.co.ke",
    password: "Pass1234!",
    phone: "0799887766",
    whatsappNumber: "0799887766",
    role: "buyer"
  });

  seller.sellerReviews.push({
    reviewer: buyer._id,
    rating: 5,
    comment: "Transparent seller and the logbook process was smooth."
  });
  updateSellerMetrics(seller);
  await seller.save();

  return { admin, buyer, dealerOne, dealerTwo, seller };
};

const createListings = async ({ buyer, dealerOne, dealerTwo, seller }) => {
  const listingPayloads = [
    {
      seller: dealerOne,
      title: "2018 Toyota Harrier Premium Sunroof",
      price: 3490000,
      make: "Toyota",
      model: "Harrier",
      year: 2018,
      mileage: 64800,
      fuelType: "Petrol",
      transmission: "Automatic",
      condition: "Foreign Used",
      location: "Nairobi",
      importStatus: "Imported",
      hirePurchaseAvailable: true,
      description:
        "Auction grade 4.5 Harrier with clean beige interior, reverse camera, sunroof, and hire purchase support for salaried buyers.",
      images: demoImageSets.harrier,
      status: "approved",
      featured: {
        enabled: true,
        tier: "featured",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
      },
      stats: { views: 124, leads: 11, saves: 18 }
    },
    {
      seller: dealerOne,
      title: "2019 Mazda CX-5 Touring AWD",
      price: 3350000,
      make: "Mazda",
      model: "CX-5",
      year: 2019,
      mileage: 53200,
      fuelType: "Petrol",
      transmission: "Automatic",
      condition: "Foreign Used",
      location: "Nairobi",
      importStatus: "Imported",
      hirePurchaseAvailable: true,
      description:
        "Well-optioned CX-5 with i-Stop, lane assist, premium cloth interior, and structured dealer financing.",
      images: demoImageSets.cx5,
      status: "approved",
      featured: {
        enabled: true,
        tier: "featured",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6)
      },
      stats: { views: 88, leads: 9, saves: 12 }
    },
    {
      seller: dealerTwo,
      title: "2017 Toyota Axio Hybrid",
      price: 1590000,
      make: "Toyota",
      model: "Axio",
      year: 2017,
      mileage: 81200,
      fuelType: "Hybrid",
      transmission: "Automatic",
      condition: "Foreign Used",
      location: "Kisumu",
      importStatus: "Imported",
      hirePurchaseAvailable: true,
      description:
        "Fuel-saving Axio hybrid with push start, lane assist, clean odometer history, and ready bank financing.",
      images: demoImageSets.axio,
      status: "approved",
      featured: { enabled: false, tier: "none" },
      stats: { views: 67, leads: 6, saves: 9 }
    },
    {
      seller,
      title: "2018 Honda Fit Shuttle",
      price: 1540000,
      make: "Honda",
      model: "Fit",
      year: 2018,
      mileage: 73500,
      fuelType: "Petrol",
      transmission: "Automatic",
      condition: "Locally Used",
      location: "Nakuru",
      importStatus: "Local",
      hirePurchaseAvailable: false,
      description:
        "Locally maintained Fit Shuttle with recent service records, two original keys, and a verified private seller.",
      images: demoImageSets.fit,
      status: "approved",
      featured: { enabled: false, tier: "none" },
      stats: { views: 43, leads: 4, saves: 7 }
    },
    {
      seller: dealerTwo,
      title: "2016 Subaru Forester XT",
      price: 2790000,
      make: "Subaru",
      model: "Forester",
      year: 2016,
      mileage: 89300,
      fuelType: "Petrol",
      transmission: "Automatic",
      condition: "Foreign Used",
      location: "Kisumu",
      importStatus: "Imported",
      hirePurchaseAvailable: true,
      description:
        "Turbocharged Forester XT with leather trim, eyesight package, and dealer-backed trade-in support.",
      images: demoImageSets.cx5,
      status: "pending",
      featured: { enabled: false, tier: "none" },
      stats: { views: 14, leads: 1, saves: 2 }
    },
    {
      seller: dealerOne,
      title: "2016 Mercedes-Benz C200 AMG Line",
      price: 3590000,
      make: "Mercedes-Benz",
      model: "C200",
      year: 2016,
      mileage: 67500,
      fuelType: "Petrol",
      transmission: "Automatic",
      condition: "Foreign Used",
      location: "Nairobi",
      importStatus: "Imported",
      hirePurchaseAvailable: false,
      description:
        "Premium C200 with panoramic roof, AMG styling, and complete import documents for trust-first buyers.",
      images: demoImageSets.harrier,
      status: "approved",
      featured: { enabled: false, tier: "none" },
      stats: { views: 59, leads: 3, saves: 5 }
    }
  ];

  const createdListings = [];
  for (const payload of listingPayloads) {
    const pricingInsight = await resolvePricingInsight(payload, MarketPrice, Listing);
    const createdListing = await Listing.create({
      ...payload,
      seller: payload.seller._id,
      sellerSnapshot: buildSellerSnapshot(payload.seller),
      pricingInsight
    });
    createdListings.push(createdListing);
  }

  await Favorite.insertMany([
    { user: buyer._id, listing: createdListings[0]._id },
    { user: buyer._id, listing: createdListings[2]._id }
  ]);

  await Lead.insertMany([
    {
      listing: createdListings[0]._id,
      buyer: buyer._id,
      buyerName: buyer.name,
      buyerPhone: buyer.phone,
      buyerEmail: buyer.email,
      message: "Can I view this Harrier tomorrow in Westlands?",
      source: "whatsapp"
    },
    {
      listing: createdListings[2]._id,
      buyerName: "Janet",
      buyerPhone: "0711112233",
      buyerEmail: "janet@example.com",
      message: "Is hire purchase available through NCBA?",
      source: "form"
    }
  ]);

  await Report.create({
    listing: createdListings[4]._id,
    reporter: buyer._id,
    reason: "Mileage inconsistency",
    details: "The odometer claim looks different from the imported inspection sheet."
  });
};

const runSeed = async () => {
  try {
    await connectDatabase();

    await Promise.all([
      Favorite.deleteMany({}),
      Lead.deleteMany({}),
      Report.deleteMany({}),
      Listing.deleteMany({}),
      MarketPrice.deleteMany({}),
      User.deleteMany({})
    ]);

    await MarketPrice.insertMany(samplePrices);
    const users = await createUsers();
    await createListings(users);

    console.log("Seed complete.");
    console.log("Admin login: admin@sokomotors.co.ke / Pass1234!");
    console.log("Dealer login: dealer@sokomotors.co.ke / Pass1234!");
    console.log("Buyer login: buyer@sokomotors.co.ke / Pass1234!");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

runSeed();
