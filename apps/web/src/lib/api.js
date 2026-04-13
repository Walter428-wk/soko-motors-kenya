const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SESSION_KEY = "soko-motors-session";

export const marketplaceDefaults = {
  locations: [
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
  ],
  makes: [
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
  ],
  fuelTypes: ["Petrol", "Diesel", "Hybrid", "Electric"],
  transmissions: ["Automatic", "Manual"],
  conditions: ["New", "Foreign Used", "Locally Used"],
  importStatuses: ["Imported", "Local"]
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

export const formatNumber = (value) => new Intl.NumberFormat("en-KE").format(Number(value || 0));

export const formatDate = (value) =>
  new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));

export const getStoredSession = () => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

export const persistSession = (session) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
};

export const createQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) return;
    params.set(key, value);
  });
  return params.toString();
};

export async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: options.cache || "no-store"
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}
