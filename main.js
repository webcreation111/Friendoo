/* ===========================================================
   FRIENDO — shared script
   Data structures, localStorage, navigation, modal helpers.
   =========================================================== */

/* ---------------- Data: countries & regions ---------------- */

const REGIONS = {
  India: [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
  ],
  "United States": [
    "California",
    "Texas",
    "New York",
    "Florida",
    "Illinois",
    "Washington",
    "Georgia",
    "Massachusetts",
    "Ohio",
    "Pennsylvania",
    "Other US State",
  ],
  Japan: [
    "Tokyo",
    "Osaka",
    "Kyoto",
    "Hokkaido",
    "Fukuoka",
    "Aichi",
    "Kanagawa",
    "Other Prefecture",
  ],
  Korea: [
    "Seoul",
    "Busan",
    "Incheon",
    "Daegu",
    "Gwangju",
    "Daejeon",
    "Jeju",
    "Other Region",
  ],
  China: [
    "Beijing",
    "Shanghai",
    "Guangdong",
    "Sichuan",
    "Zhejiang",
    "Jiangsu",
    "Other Province",
  ],
  Australia: [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
    "Other Territory",
  ],
  Canada: [
    "Ontario",
    "Quebec",
    "British Columbia",
    "Alberta",
    "Manitoba",
    "Other Province",
  ],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Indonesia: [
    "Jakarta",
    "West Java",
    "East Java",
    "Bali",
    "Central Java",
    "Other Province",
  ],
  Taiwan: [
    "Taipei",
    "New Taipei",
    "Taichung",
    "Kaohsiung",
    "Tainan",
    "Other Region",
  ],
  Global: ["Not specified"],
};

const COUNTRIES = [
  { name: "Global", flag: "🌐" },
  { name: "Korea", flag: "🇰🇷" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "China", flag: "🇨🇳" },
  { name: "India", flag: "🇮🇳" },
  { name: "Indonesia", flag: "🇮🇩" },
  { name: "Taiwan", flag: "🇹🇼" },
  { name: "United Kingdom", flag: "🇬🇧" },
];

/* ---------------- Sample data (prototype only) ---------------- */

const SAMPLE_PEOPLE = [
  { name: "Namratha", sub: "Late 20s", time: "now" },
  { name: "Kriti", sub: "Middle 40s", time: "now" },
  { name: "Angel4u", sub: "Early 40s", time: "1m ago" },
  { name: "sonu", sub: "Late 20s", time: "1m ago" },
  { name: "Syeda Mehreen", sub: "Middle 30s", time: "3m ago" },
  { name: "pooja", sub: "Early 30s", time: "4m ago" },
  { name: "Neha", sub: "Early 30s", time: "4m ago" },
];

/* ---------------- LocalStorage helpers ---------------- */

const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem("friendo_" + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem("friendo_" + key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable, ignore for prototype */
    }
  },
};

function getProfile() {
  return Store.get("profile", {
    nickname: "",
    gender: "",
    birthYear: "",
    nationality: "",
    region: "",
    selfIntroduction: "",
    extraInformation: "",
    privacy: "Public",
  });
}
function saveProfile(p) {
  Store.set("profile", p);
}

function getSettings() {
  return Store.get("settings", {
    searchGender: "All",
    minAge: "All",
    maxAge: "All",
    searchNationality: "All",
    searchRegion: "All",
    receiveFriendRequests: true,
    friendRequestNotif: true,
    chattingNotif: true,
    fontSize: "Medium 100%",
  });
}
function saveSettings(s) {
  Store.set("settings", s);
}

/* ---------------- Payment links ---------------- */

const RAZORPAY_LINK = "https://rzp.io/rzp/SsBYjYq";
const PLAY_STORE_LINK =
  "https://play.google.com/store/apps/details?id=com.friendo.app";

function openRazorpay() {
  window.open(RAZORPAY_LINK, "_blank", "noopener");
}
function openPlayStore() {
  window.open(PLAY_STORE_LINK, "_blank", "noopener");
}

/* ---------------- Navigation active-state ---------------- */

document.addEventListener("DOMContentLoaded", function () {
  const current = (document.body.getAttribute("data-page") || "").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(function (el) {
    if (el.getAttribute("data-nav").toLowerCase() === current) {
      el.classList.add("active");
    }
  });
});

/* ---------------- Generic dialog helpers ---------------- */

function openDialog(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}
function closeDialog(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

/* ---------------- Simple list filter for dialog search ---------------- */

function filterOptionRows(inputEl, listSelector) {
  const q = inputEl.value.trim().toLowerCase();
  document
    .querySelectorAll(listSelector + " .option-row")
    .forEach(function (row) {
      const label = (row.getAttribute("data-label") || "").toLowerCase();
      row.style.display = label.indexOf(q) === -1 ? "none" : "flex";
    });
}
