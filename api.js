/* ===========================================================
   FRIENDO — API client
   Talks to the Friendo Spring Boot backend over JSON/REST
   (plus a small STOMP/WebSocket helper for live chat).
   =========================================================== */

/* Change this if your backend runs somewhere other than
   http://localhost:8080 (e.g. a deployed URL). */
const API_BASE_URL = window.FRIENDO_API_BASE || "http://localhost:8080";

/* ---------------- Auth/session storage ---------------- */

const Auth = {
  getToken() {
    return localStorage.getItem("friendo_token");
  },
  getUserId() {
    return localStorage.getItem("friendo_userId");
  },
  isProfileComplete() {
    return localStorage.getItem("friendo_profileComplete") === "true";
  },
  setSession(auth) {
    localStorage.setItem("friendo_token", auth.token);
    localStorage.setItem("friendo_userId", auth.userId);
    localStorage.setItem("friendo_nickname", auth.nickname || "");
    localStorage.setItem("friendo_profileComplete", !!auth.profileComplete);
  },
  setProfileComplete(val) {
    localStorage.setItem("friendo_profileComplete", !!val);
  },
  clear() {
    localStorage.removeItem("friendo_token");
    localStorage.removeItem("friendo_userId");
    localStorage.removeItem("friendo_nickname");
    localStorage.removeItem("friendo_profileComplete");
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  /** Call at the top of any page that requires a logged-in user. */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
    }
  },
  logout() {
    this.clear();
    window.location.href = "login.html";
  },
};

/* ---------------- Low-level JSON fetch wrapper ---------------- */

async function apiFetch(path, options) {
  options = options || {};
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {}
  );
  const token = Auth.getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  let res;
  try {
    res = await fetch(API_BASE_URL + path, Object.assign({}, options, { headers }));
  } catch (e) {
    throw new Error(
      "Could not reach the Friendo server at " +
        API_BASE_URL +
        ". Make sure the Spring Boot backend is running."
    );
  }

  if (res.status === 401) {
    // Token missing/expired/invalid — send the user back to login.
    Auth.clear();
    if (!location.pathname.endsWith("login.html")) {
      window.location.href = "login.html";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.indexOf("application/json") !== -1;
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && body.message) ||
      (typeof body === "string" && body) ||
      "Request failed (" + res.status + ")";
    throw new Error(message);
  }

  return body;
}

function qs(params) {
  const usable = {};
  Object.keys(params || {}).forEach(function (k) {
    if (params[k] !== undefined && params[k] !== null && params[k] !== "" && params[k] !== "All") {
      usable[k] = params[k];
    }
  });
  const s = new URLSearchParams(usable).toString();
  return s ? "?" + s : "";
}

/* ---------------- Endpoint calls (mirrors the backend controllers) ---------------- */

const Api = {
  // Auth
  register(email, password, nickname) {
    return apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, nickname }),
    });
  },
  login(email, password) {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // Profile
  getMyProfile() {
    return apiFetch("/api/profile/me");
  },
  setupProfile(data) {
    return apiFetch("/api/profile/setup", { method: "PUT", body: JSON.stringify(data) });
  },
  updateProfile(data) {
    return apiFetch("/api/profile/me", { method: "PUT", body: JSON.stringify(data) });
  },

  // People
  browsePeople(filters) {
    return apiFetch("/api/people" + qs(filters));
  },

  // Friends
  sendFriendRequest(userId) {
    return apiFetch("/api/friends/request/" + userId, { method: "POST" });
  },
  acceptFriendRequest(requestId) {
    return apiFetch("/api/friends/" + requestId + "/accept", { method: "POST" });
  },
  declineFriendRequest(requestId) {
    return apiFetch("/api/friends/" + requestId + "/decline", { method: "POST" });
  },
  listFriends() {
    return apiFetch("/api/friends");
  },
  listSentRequests() {
    return apiFetch("/api/friends/sent");
  },
  listReceivedRequests() {
    return apiFetch("/api/friends/received");
  },

  // Chat
  listChatRooms() {
    return apiFetch("/api/chat/rooms");
  },
  getOrCreateRoom(otherUserId) {
    return apiFetch("/api/chat/rooms/" + otherUserId, { method: "POST" });
  },
  getMessages(roomId, page, size) {
    return apiFetch(
      "/api/chat/rooms/" + roomId + "/messages" + qs({ page: page || 0, size: size || 30 })
    );
  },
  sendMessage(roomId, content) {
    return apiFetch("/api/chat/rooms/" + roomId + "/messages", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  // Settings
  getSettings() {
    return apiFetch("/api/settings");
  },
  updateSettings(data) {
    return apiFetch("/api/settings", { method: "PUT", body: JSON.stringify(data) });
  },

  // Account
  deleteAccount() {
    return apiFetch("/api/account", { method: "DELETE" });
  },

  // Payment
  createOrder(purpose, amountPaise) {
    return apiFetch("/api/payment/orders", {
      method: "POST",
      body: JSON.stringify({ purpose, amountPaise }),
    });
  },
  verifyPayment(data) {
    return apiFetch("/api/payment/verify", { method: "POST", body: JSON.stringify(data) });
  },
  paymentStatus() {
    return apiFetch("/api/payment/status");
  },

  // Contact
  submitContact(data) {
    return apiFetch("/api/contact", { method: "POST", body: JSON.stringify(data) });
  },
};

/* ---------------- Live chat over STOMP/WebSocket (optional real-time layer) ---------------- */
/* Falls back gracefully to REST-only (poll + POST) if the SockJS/Stomp CDN
   scripts aren't loaded on a given page. */

const LiveChat = {
  client: null,
  subscriptions: {},

  connect(onConnected) {
    if (typeof SockJS === "undefined" || typeof Stomp === "undefined") {
      console.warn("SockJS/Stomp not loaded — falling back to REST polling for chat.");
      return;
    }
    const socket = new SockJS(API_BASE_URL + "/ws");
    this.client = Stomp.over(socket);
    this.client.debug = null; // quiet console
    this.client.connect({}, function () {
      if (onConnected) onConnected();
    }, function (err) {
      console.warn("WebSocket connect failed, staying on REST polling.", err);
    });
  },

  subscribeToRoom(roomId, onMessage) {
    if (!this.client || !this.client.connected) return;
    if (this.subscriptions[roomId]) return; // already subscribed
    this.subscriptions[roomId] = this.client.subscribe(
      "/topic/room." + roomId,
      function (frame) {
        try {
          onMessage(JSON.parse(frame.body));
        } catch (e) {
          /* ignore malformed frame */
        }
      }
    );
  },

  send(roomId, content) {
    if (this.client && this.client.connected) {
      this.client.send(
        "/app/chat.send/" + roomId,
        {},
        JSON.stringify({ content })
      );
      return true;
    }
    return false;
  },

  disconnect() {
    if (this.client) {
      try {
        this.client.disconnect();
      } catch (e) {}
    }
    this.client = null;
    this.subscriptions = {};
  },
};
