const LOCAL_SERVER_ORIGIN = "http://127.0.0.1:8000";
if (window.location.protocol === "file:") {
  const hash = window.location.hash || "";
  window.location.replace(`${LOCAL_SERVER_ORIGIN}/index.html${hash}`);
}

const toolButtons = document.querySelectorAll(".tool-button");
const textarea = document.querySelector(".composer textarea");
const mediaUrlInput = document.querySelector(".media-url-input");
const composerMediaTools = document.querySelector("[data-composer-media]");
const mediaPickerInput = document.querySelector(".media-picker-input");
const mediaPickerButton = document.querySelector(".media-picker-button");
const mediaClearButton = document.querySelector(".media-clear-button");
const mediaHint = document.querySelector(".media-hint");
const composerMediaPreview = document.querySelector(".composer-media-preview");
const tickerText = document.querySelector(".live-ticker p");
const postButton = document.querySelector(".post-button");
const authModal = document.querySelector(".auth-modal");
const authGate = document.querySelector("[data-auth-gate]");
const authTabs = document.querySelectorAll(".auth-modal [data-auth-tab]");
const authPanels = document.querySelectorAll("[data-auth-panel]");
const authMessage = document.querySelector(".auth-modal .auth-message");
const gateAuthTabs = document.querySelectorAll("[data-gate-tab]");
const gateAuthPanels = document.querySelectorAll("[data-gate-panel]");
const gateAuthMessage = document.querySelector(".gate-auth-message");
const loginForm = document.querySelector(".login-form");
const gateLoginForm = document.querySelector(".gate-login-form");
const authOpenButton = document.querySelector(".auth-open");
const loginOpenButton = document.querySelector(".login-open");
const authCloseButton = document.querySelector(".auth-close");
const profileCard = document.querySelector(".profile-card");
const avatarImages = document.querySelectorAll(".avatar-button img, .composer-head img, .profile-card > img");
const navLinks = document.querySelectorAll(".nav-link");
const pageView = document.querySelector("[data-page-view]");
const homeSections = document.querySelectorAll(".hero, .content-grid");
const createButton = document.querySelector(".create-button");
const avatarButton = document.querySelector(".avatar-button");
const searchInput = document.querySelector(".search input");
const searchButton = document.querySelector(".search-button");
const notificationButton = document.querySelector(".icon-button");
const notificationPanel = document.querySelector(".notification-panel");
const notificationList = document.querySelector(".notification-list");
const notificationClose = document.querySelector(".notification-close");
const notificationDot = document.querySelector(".notification-dot");
const shareModal = document.querySelector(".share-modal");
const shareClose = document.querySelector(".share-close");
const shareCopy = document.querySelector(".share-copy");
const shareNative = document.querySelector(".share-native");
const shareInput = document.querySelector(".share-link-input");
const shareSummary = document.querySelector(".share-summary");
const shareMessage = document.querySelector(".share-message");
const sharePlatformLinks = document.querySelectorAll(".share-platforms a");
const API_BASE = window.location.protocol === "file:" ? LOCAL_SERVER_ORIGIN : "";
const SESSION_USER_KEY = "quashUser";
const SESSION_TOKEN_KEY = "quashToken";
const LOCAL_UPLOADED_POSTS_KEY = "quashLocalUploadedPosts";
const MAX_LOCAL_UPLOADED_POSTS = 24;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const IMAGE_COMPRESS_THRESHOLD_BYTES = 1200 * 1024;
const MAX_UPLOAD_IMAGE_EDGE = 1600;
const IMAGE_UPLOAD_QUALITY = 0.82;
const CUSTOM_COMMUNITIES_KEY = "quashCustomCommunities";
const CUSTOM_GROUPS_KEY = "quashCustomGroups";
const JOINED_COMMUNITIES_KEY = "quashJoinedCommunities";
const JOINED_GROUPS_KEY = "quashJoinedGroups";
const SAVED_REELS_KEY = "quashSavedReels";
let shareContext = null;
let uploadedComposerMedia = null;
let activeChatUserId = "";

const tickerUpdates = [
  "Fashion Week street looks are rising across global style circles",
  "Community reporters are sharing verified local weather alerts",
  "Short explainers are trending in technology and public policy",
  "Creators are forming groups around daily briefings and style drops"
];

const demoPosts = [];

const trends = [
  { slug: "worldin60", tag: "#WorldIn60", title: "Fast global briefings", posts: "248K posts", detail: "Short updates about policy, cities, science, business, and culture are moving quickly today." },
  { slug: "newseasonstyle", tag: "#NewSeasonStyle", title: "Fashion direction", posts: "91K posts", detail: "Creators are posting daily looks, color stories, launch reactions, and streetwear reels." },
  { slug: "localalerts", tag: "#LocalAlerts", title: "Community alerts", posts: "54K posts", detail: "Neighborhood groups are sharing transport changes, weather warnings, and verified public notices." },
  { slug: "creatornewsroom", tag: "#CreatorNewsroom", title: "Independent reporting", posts: "37K posts", detail: "Creators are building lightweight news desks with text posts, reels, and source threads." }
];

const communities = [
  { id: "world-connect", name: "World Connect", members: "186K", detail: "News, culture, public alerts, and daily global context.", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=300&q=80" },
  { id: "fashion-pulse", name: "Fashion Pulse", members: "74K", detail: "Style drops, creator reels, street looks, and brand moments.", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80" },
  { id: "tech-tomorrow", name: "Tech & Tomorrow", members: "52K", detail: "AI, devices, apps, future work, and startup updates.", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=300&q=80" }
];

const groups = [
  { id: "morning-brief-circle", name: "Morning Brief Circle", members: "4.8K", detail: "People sharing top stories before work." },
  { id: "creators-hub", name: "Creators Hub", members: "12K", detail: "Video, reel, and post collaboration." },
  { id: "campus-reporters", name: "Campus Reporters", members: "8.2K", detail: "Students sharing local news and cultural updates." }
];

let tickerIndex = 0;
let activeRoute = "feed";
let activeTopic = "";
let activeProfileId = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function compactNumber(value) {
  const number = Number(value || 0);
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return String(number);
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function timeAgo(timestamp) {
  const seconds = Math.max(1, Math.floor(Date.now() / 1000 - Number(timestamp)));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day ago`;
}

function currentUser() {
  const storedUser = localStorage.getItem(SESSION_USER_KEY);
  return storedUser ? JSON.parse(storedUser) : null;
}

function currentToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY) || "";
}

function decodeBase64UrlJson(payload) {
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function consumeOauthSessionFromHash() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#oauth-")) return false;
  try {
    const data = decodeBase64UrlJson(hash.slice("#oauth-".length));
    if (!data?.token || !data?.user) throw new Error("Missing session data.");
    saveSession(data);
    history.replaceState(null, "", "#feed");
    return true;
  } catch (error) {
    clearSession();
    history.replaceState(null, "", "");
    showAllAuthMessages("Social sign-in could not be completed. Please try again.", "error");
    return false;
  }
}

function readJsonArray(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function writeJsonArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function userScopedKey(baseKey) {
  return `${baseKey}:${currentUser()?.id || "guest"}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || `quash-${Date.now()}`;
}

function joinedSet(key) {
  return new Set(readJsonArray(userScopedKey(key)).map(String));
}

function toggleJoined(key, id) {
  const scopedKey = userScopedKey(key);
  const set = joinedSet(key);
  const itemId = String(id);
  if (set.has(itemId)) {
    set.delete(itemId);
  } else {
    set.add(itemId);
  }
  writeJsonArray(scopedKey, [...set]);
  return set.has(itemId);
}

function savedReelSet() {
  return new Set(readJsonArray(userScopedKey(SAVED_REELS_KEY)).map(String));
}

function isReelSaved(postId) {
  return savedReelSet().has(String(postId));
}

function toggleSavedReel(postId) {
  const scopedKey = userScopedKey(SAVED_REELS_KEY);
  const set = savedReelSet();
  const id = String(postId);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  writeJsonArray(scopedKey, [...set]);
  return set.has(id);
}

function createdCommunities() {
  return readJsonArray(CUSTOM_COMMUNITIES_KEY).filter((community) => community?.id && community?.name);
}

function createdGroups() {
  return readJsonArray(CUSTOM_GROUPS_KEY).filter((group) => group?.id && group?.name);
}

function visibleCommunities() {
  const joined = joinedSet(JOINED_COMMUNITIES_KEY);
  return [...createdCommunities(), ...communities].map((community) => ({
    ...community,
    joined: joined.has(String(community.id)),
    image: community.image || "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=300&q=80"
  }));
}

function visibleGroups() {
  const joined = joinedSet(JOINED_GROUPS_KEY);
  return [...createdGroups(), ...groups].map((group) => ({
    ...group,
    joined: joined.has(String(group.id))
  }));
}

function clearSession() {
  localStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

function normalizeStoredLocalPost(post) {
  if (!post || typeof post !== "object") return null;
  if (!post.localPersistent) return null;
  if (!post.id || !post.author || !post.mediaUrl) return null;
  return {
    id: String(post.id),
    isDemo: true,
    localPersistent: true,
    postType: post.postType || "Image",
    body: post.body || "",
    mediaUrl: post.mediaUrl,
    createdAt: Number(post.createdAt || Date.now() / 1000),
    likeCount: Number(post.likeCount || 0),
    commentCount: Number(post.commentCount || 0),
    shareCount: Number(post.shareCount || 0),
    likedByMe: Boolean(post.likedByMe),
    comments: Array.isArray(post.comments) ? post.comments : [],
    author: {
      id: post.author.id,
      fullName: post.author.fullName || "Quash user",
      username: post.author.username || "quashuser",
      avatarUrl: post.author.avatarUrl || "",
      following: Boolean(post.author.following)
    }
  };
}

function readLocalUploadedPosts() {
  const raw = localStorage.getItem(LOCAL_UPLOADED_POSTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoredLocalPost).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function writeLocalUploadedPosts(posts) {
  try {
    localStorage.setItem(LOCAL_UPLOADED_POSTS_KEY, JSON.stringify(posts));
    return true;
  } catch (error) {
    return false;
  }
}

function hydrateLocalUploadedPosts() {
  const stored = readLocalUploadedPosts();
  if (!stored.length) return;
  const knownIds = new Set(demoPosts.map((post) => String(post.id)));
  stored.forEach((post) => {
    if (!knownIds.has(String(post.id))) {
      demoPosts.unshift(post);
    }
  });
}

function readCookie(name) {
  const encoded = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const value = part.trim();
    if (value.startsWith(encoded)) {
      return decodeURIComponent(value.slice(encoded.length));
    }
  }
  return "";
}

async function requestApi(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const csrfToken = readCookie("XSRF-TOKEN");
  const token = currentToken();
  const isFormBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...options.headers
  };
  if (!isFormBody && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
    headers["X-XSRF-TOKEN"] = csrfToken;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers
    });
  } catch (error) {
    throw new Error("Cannot reach Quash server. Open http://127.0.0.1:8000/index.html");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      applyGuest();
    }
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

function requireUser() {
  const user = currentUser();
  const token = currentToken();
  if (!user || !token) {
    setGateTab("login");
    setAuthLocked(true);
    return null;
  }
  return user;
}

function openAuth(tabName = "login") {
  authModal.classList.add("open");
  authModal.setAttribute("aria-hidden", "false");
  setAuthTab(tabName);
}

function closeAuth() {
  authModal.classList.remove("open");
  authModal.setAttribute("aria-hidden", "true");
  authMessage.textContent = "";
}

function setAuthTab(tabName) {
  authTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authTab === tabName);
  });
  authPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.authPanel !== tabName);
  });
  authMessage.textContent = "";
}

function showAuthMessage(message, type = "info") {
  authMessage.textContent = message;
  authMessage.dataset.type = type;
}

function setAuthMessage(target, message, type = "info") {
  if (!target) return;
  target.textContent = message;
  target.dataset.type = type;
}

function showGateAuthMessage(message, type = "info") {
  setAuthMessage(gateAuthMessage, message, type);
}

function showAllAuthMessages(message, type = "info") {
  showAuthMessage(message, type);
  showGateAuthMessage(message, type);
}

function setGateTab(tabName) {
  gateAuthTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.gateTab === tabName);
  });
  gateAuthPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.gatePanel !== tabName);
  });
  showGateAuthMessage("");
}

function setAuthLocked(locked) {
  document.body.classList.toggle("auth-locked", Boolean(locked));
  if (authGate) {
    authGate.classList.toggle("hidden", !locked);
    authGate.setAttribute("aria-hidden", locked ? "false" : "true");
  }
  if (locked) {
    closeAuth();
    closeNotifications();
    if (shareModal?.classList.contains("open")) closeShareDialog();
  }
}

function socialProviderName(provider) {
  return provider === "facebook" ? "Facebook" : "Google";
}

async function enterAuthenticatedApp(route = "feed") {
  closeAuth();
  setAuthLocked(false);
  history.replaceState(null, "", `#${route}`);
  await navigate(route);
}

async function submitLoginForm(form, messageTarget) {
  const formData = new FormData(form);
  setAuthMessage(messageTarget, "Signing in...");
  try {
    const data = await requestApi("/api/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData))
    });
    saveSession(data);
    setAuthMessage(messageTarget, "Signed in.", "success");
    form.reset();
    await enterAuthenticatedApp("feed");
  } catch (error) {
    setAuthMessage(messageTarget, error.message, "error");
  }
}

function startSocialLogin(provider) {
  const safeProvider = provider === "facebook" ? "facebook" : "google";
  const providerName = socialProviderName(provider);
  showAllAuthMessages(`Opening ${providerName} sign-in...`);
  window.location.assign(`${API_BASE}/api/auth/${encodeURIComponent(safeProvider)}`);
}

function mediaKindForMode(mode) {
  if (mode === "Image") return "image";
  if (mode === "Video" || mode === "Reel") return "video";
  return "";
}

function clearComposerUpload(options = {}) {
  const { revoke = true } = options;
  if (revoke && uploadedComposerMedia?.url) {
    URL.revokeObjectURL(uploadedComposerMedia.url);
  }
  uploadedComposerMedia = null;
  if (mediaPickerInput) mediaPickerInput.value = "";
  if (mediaClearButton) mediaClearButton.classList.add("hidden");
  if (composerMediaPreview) {
    composerMediaPreview.innerHTML = "";
    composerMediaPreview.classList.add("hidden");
  }
}

function setComposerUpload(file, kind) {
  clearComposerUpload();
  const objectUrl = URL.createObjectURL(file);
  uploadedComposerMedia = { file, kind, url: objectUrl };

  if (mediaClearButton) {
    mediaClearButton.classList.remove("hidden");
  }

  if (!composerMediaPreview) return;
  if (kind === "video") {
    composerMediaPreview.innerHTML = `<video src="${escapeHtml(objectUrl)}" controls muted playsinline></video>`;
  } else {
    composerMediaPreview.innerHTML = `<img src="${escapeHtml(objectUrl)}" alt="Upload preview">`;
  }
  if (mediaHint) {
    const sizeText = formatBytes(file.size);
    mediaHint.textContent =
      kind === "image"
        ? `${sizeText} selected. Large images are optimized before upload.`
        : `${sizeText} selected. Videos upload fastest under 25 MB on free hosting.`;
  }
  composerMediaPreview.classList.remove("hidden");
}

function syncComposerUploadUi(mode) {
  const kind = mediaKindForMode(mode);
  if (!composerMediaTools || !mediaPickerInput || !mediaHint) return;

  const uploadEnabled = Boolean(kind);
  composerMediaTools.classList.toggle("hidden", !uploadEnabled);
  if (!uploadEnabled) {
    clearComposerUpload();
    return;
  }

  mediaPickerInput.accept = kind === "image" ? "image/*" : "video/*";
  mediaHint.textContent =
    kind === "image"
      ? "Upload an image from your device, or paste an image URL."
      : "Upload a video from your device, or paste a video URL.";

  if (uploadedComposerMedia && uploadedComposerMedia.kind !== kind) {
    clearComposerUpload();
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not optimize image."));
      }
    }, type, quality);
  });
}

async function compressImageForUpload(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < IMAGE_COMPRESS_THRESHOLD_BYTES) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_UPLOAD_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale >= 1 && file.size < 2 * IMAGE_COMPRESS_THRESHOLD_BYTES) {
    bitmap.close?.();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await canvasToBlob(canvas, "image/jpeg", IMAGE_UPLOAD_QUALITY);
  if (blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, "") || "quash-image";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

async function prepareUploadFile(file, kind) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File too large. Choose a file under ${formatBytes(MAX_UPLOAD_BYTES)}.`);
  }
  if (kind === "image") {
    const optimized = await compressImageForUpload(file);
    if (mediaHint && optimized.size < file.size) {
      mediaHint.textContent = `Optimized from ${formatBytes(file.size)} to ${formatBytes(optimized.size)} before upload.`;
    }
    return optimized;
  }
  return file;
}

function createLocalUploadedPost(postType, body, mediaUrl) {
  const user = currentUser();
  if (!user || !mediaUrl) return;

  const kindLabel = postType === "Image" ? "image" : "video";
  const localPost = {
    id: `local-${Date.now()}`,
    isDemo: true,
    localPersistent: true,
    postType,
    body: body || `Shared a ${kindLabel} update.`,
    mediaUrl,
    createdAt: Date.now() / 1000,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    likedByMe: false,
    comments: [],
    author: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      avatarUrl: user.avatarUrl || "",
      following: false
    }
  };
  demoPosts.unshift(localPost);
  const existing = readLocalUploadedPosts();
  const merged = [localPost, ...existing].slice(0, MAX_LOCAL_UPLOADED_POSTS);
  return writeLocalUploadedPosts(merged);
}

async function uploadComposerMedia(file, onProgress = () => {}) {
  const formData = new FormData();
  formData.append("media", file, file.name || "upload");

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/api/media-upload`);
    request.withCredentials = true;

    const token = currentToken();
    const csrfToken = readCookie("XSRF-TOKEN");
    if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);
    if (csrfToken) request.setRequestHeader("X-XSRF-TOKEN", csrfToken);

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    });

    request.addEventListener("load", () => {
      const data = JSON.parse(request.responseText || "{}");
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(data);
        return;
      }
      if (request.status === 401) {
        clearSession();
        applyGuest();
      }
      reject(new Error(data.error || "Upload failed."));
    });

    request.addEventListener("error", () => {
      reject(new Error("Upload failed. Try a smaller file or a stronger connection."));
    });

    request.send(formData);
  });
}

async function migrateLocalUploadedPostsToServer() {
  if (!currentUser() || !currentToken()) return;

  const storedPosts = readLocalUploadedPosts();
  if (!storedPosts.length) return;

  const remainingPosts = [];
  for (const post of storedPosts) {
    try {
      if (!String(post.mediaUrl).startsWith("data:")) {
        remainingPosts.push(post);
        continue;
      }

      const mediaResponse = await fetch(post.mediaUrl);
      const mediaBlob = await mediaResponse.blob();
      const uploaded = await uploadComposerMedia(mediaBlob);
      await requestApi("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          postType: post.postType,
          body: post.body,
          mediaUrl: uploaded.mediaUrl
        })
      });
    } catch (error) {
      remainingPosts.push(post);
    }
  }

  if (remainingPosts.length) {
    writeLocalUploadedPosts(remainingPosts);
  } else {
    localStorage.removeItem(LOCAL_UPLOADED_POSTS_KEY);
  }

  const remainingIds = new Set(remainingPosts.map((post) => String(post.id)));
  for (let index = demoPosts.length - 1; index >= 0; index -= 1) {
    const post = demoPosts[index];
    if (post.localPersistent && !remainingIds.has(String(post.id))) {
      demoPosts.splice(index, 1);
    }
  }
}

function saveSession(data) {
  if (data?.token) {
    localStorage.setItem(SESSION_TOKEN_KEY, data.token);
  }
  if (!data?.user) return;
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user));
  applyUser(data.user);
  setAuthLocked(false);
  refreshNotifications();
}

function applyGuest() {
  setAuthLocked(true);
  authOpenButton.classList.remove("profile-avatar-link");
  authOpenButton.classList.add("top-auth-hidden");
  loginOpenButton.classList.remove("top-auth-hidden");
  authOpenButton.textContent = "Profile";
  loginOpenButton.textContent = "Sign in";
  loginOpenButton.dataset.action = "login";
}

async function syncSession() {
  if (!currentToken()) {
    clearSession();
    applyGuest();
    return;
  }
  try {
    const data = await requestApi("/api/me");
    if (data?.user) {
      saveSession(data);
      return;
    }
  } catch (error) {
    // session not active
  }
  clearSession();
  applyGuest();
}

function avatarUrlFor(user) {
  if (user.avatarUrl) return user.avatarUrl;
  const initials = String(user.fullName || user.username || "Q")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=007c89&color=fff`;
}

function profileHashFor(userId) {
  return `#user-${encodeURIComponent(userId)}`;
}

function publicProfileUrl(userId) {
  const baseUrl = window.location.protocol === "file:" ? `${API_BASE}/index.html` : `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}${profileHashFor(userId)}`;
}

function chatHashFor(userId) {
  return userId ? `#messages-${encodeURIComponent(userId)}` : "#messages";
}

function mergeChatContacts(conversations = [], contacts = []) {
  const rows = new Map();
  conversations.forEach((conversation) => {
    if (!conversation?.user?.id) return;
    rows.set(String(conversation.user.id), {
      user: conversation.user,
      lastMessage: conversation.lastMessage || null,
      unreadCount: Number(conversation.unreadCount || 0)
    });
  });
  contacts.forEach((user) => {
    if (!user?.id) return;
    const key = String(user.id);
    if (!rows.has(key)) {
      rows.set(key, { user, lastMessage: null, unreadCount: 0 });
    }
  });
  return [...rows.values()];
}

function chatPreview(conversation) {
  const message = conversation?.lastMessage;
  if (!message) return "Start a private conversation";
  const prefix = message.mine ? "You: " : "";
  return `${prefix}${message.body || ""}`;
}

function chatContactButton(conversation, selectedUserId) {
  const user = conversation.user || {};
  const selected = String(user.id) === String(selectedUserId);
  return `
    <button class="chat-contact ${selected ? "active" : ""}" type="button" data-action="open-chat" data-user-id="${escapeHtml(user.id)}">
      <img src="${escapeHtml(avatarUrlFor(user))}" alt="">
      <span>
        <strong>${escapeHtml(user.fullName || "Quash user")}</strong>
        <small>@${escapeHtml(user.username || "quashuser")} · ${escapeHtml(chatPreview(conversation))}</small>
      </span>
      ${conversation.unreadCount ? `<em>${compactNumber(conversation.unreadCount)}</em>` : ""}
    </button>
  `;
}

function chatMessageBubble(message) {
  const mine = Boolean(message.mine);
  const sender = message.sender || {};
  return `
    <article class="chat-message ${mine ? "mine" : ""}">
      ${mine ? "" : `<img src="${escapeHtml(avatarUrlFor(sender))}" alt="">`}
      <div>
        <p>${escapeHtml(message.body || "")}</p>
        <span>${mine ? "You" : escapeHtml(sender.fullName || "Quash user")} · ${timeAgo(message.createdAt)}</span>
      </div>
    </article>
  `;
}

function applyUser(user) {
  if (!user) return;
  setAuthLocked(false);
  const avatarUrl = avatarUrlFor(user);
  avatarImages.forEach((image) => {
    image.src = avatarUrl;
  });
  profileCard.querySelector("h2").textContent = user.fullName;
  profileCard.querySelector("p").textContent = user.bio || `@${user.username} is ready to share news, thoughts, reels, and community updates on Quash.`;
  authOpenButton.classList.add("profile-avatar-link");
  authOpenButton.classList.remove("top-auth-hidden");
  authOpenButton.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt=""><span>Open profile</span>`;
  loginOpenButton.classList.add("top-auth-hidden");
  loginOpenButton.textContent = "Sign out";
  loginOpenButton.dataset.action = "logout";
}

function setActiveRoute(route) {
  const routeForNav = route === "public-profile" ? "profile" : route;
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${routeForNav}`);
  });
  createButton?.classList.toggle("hidden", route === "messages");
}

function showHome() {
  activeRoute = "feed";
  pageView.classList.add("hidden");
  homeSections.forEach((section) => section.classList.remove("hidden"));
  setActiveRoute("feed");
}

function showPage(route, html) {
  activeRoute = route;
  homeSections.forEach((section) => section.classList.add("hidden"));
  pageView.classList.remove("hidden");
  pageView.innerHTML = html;
  setActiveRoute(route);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function mediaMarkup(post) {
  if (!post.mediaUrl) return "";
  const mediaUrl = escapeHtml(post.mediaUrl);
  const isVideo = ["Video", "Reel"].includes(post.postType) || /\.(mp4|webm|ogg)(\?|$)/i.test(post.mediaUrl);
  if (isVideo) {
    return `<video class="post-media" src="${mediaUrl}" controls muted playsinline></video>`;
  }
  return `<img class="post-media" src="${mediaUrl}" alt="">`;
}

function reelMediaMarkup(post) {
  if (!post.mediaUrl) {
    return `<div class="reel-text-backdrop"><span>Quash Reel</span></div>`;
  }
  const mediaUrl = escapeHtml(post.mediaUrl);
  const isVideo = ["Video", "Reel"].includes(post.postType) || /\.(mp4|webm|ogg)(\?|$)/i.test(post.mediaUrl);
  if (isVideo) {
    return `<video class="reel-media" src="${mediaUrl}" controls muted loop playsinline preload="metadata"></video>`;
  }
  return `<img class="reel-media" src="${mediaUrl}" alt="">`;
}

function isReelPost(post) {
  return ["Reel", "Video"].includes(post.postType) || /\.(mp4|webm|ogg)(\?|$)/i.test(post.mediaUrl || "");
}

function postShareUrl(postId) {
  const baseUrl = window.location.protocol === "file:" ? `${API_BASE}/index.html` : `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}#post-${encodeURIComponent(postId)}`;
}

function openShareDialog({ url, title, text }) {
  const shareText = text || "Quash update";
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title || "Quash"}: ${shareText}`);
  shareInput.value = url;
  shareSummary.textContent = shareText;
  shareMessage.textContent = "";

  sharePlatformLinks.forEach((link) => {
    const platform = link.dataset.platform;
    if (platform === "whatsapp") {
      link.href = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    }
    if (platform === "x") {
      link.href = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    }
    if (platform === "facebook") {
      link.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    }
    if (platform === "linkedin") {
      link.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    }
    if (platform === "email") {
      link.href = `mailto:?subject=${encodeURIComponent(title || "Quash update")}&body=${encodedText}%0A%0A${encodedUrl}`;
    }
  });

  shareModal.classList.add("open");
  shareModal.setAttribute("aria-hidden", "false");
  shareInput.focus();
  shareInput.select();
}

function closeShareDialog() {
  shareModal.classList.remove("open");
  shareModal.setAttribute("aria-hidden", "true");
  shareContext = null;
}

function commentsMarkup(post) {
  const comments = post.comments || [];
  return `
    <section class="comment-section" data-comments-for="${escapeHtml(post.id)}">
      <div class="comment-list">
        ${comments.length
          ? comments
              .map(
                (comment) => `
                  <div class="comment-item">
                    ${comment.author?.id
                      ? `<button class="comment-author-button" type="button" data-action="open-profile" data-user-id="${escapeHtml(comment.author.id)}" aria-label="Open ${escapeHtml(comment.author.fullName)} profile">
                          <img src="${escapeHtml(avatarUrlFor(comment.author))}" alt="">
                        </button>`
                      : `<img src="${escapeHtml(avatarUrlFor(comment.author))}" alt="">`}
                    <div>
                      <strong>${escapeHtml(comment.author.fullName)}</strong>
                      <p>${escapeHtml(comment.body)}</p>
                    </div>
                  </div>
                `
              )
              .join("")
          : `<p class="empty-note">No comments yet. Share your thought first.</p>`}
      </div>
      <form class="comment-form" data-post-id="${escapeHtml(post.id)}">
        <input name="body" placeholder="Write a comment">
        <button type="submit">Comment</button>
      </form>
    </section>
  `;
}

function postCard(post) {
  const demoAttr = post.isDemo ? "data-demo='true'" : "";
  const followLabel = post.author.following ? "Following" : "Follow";
  const canFollow = currentUser()?.id !== post.author.id;
  return `
    <article class="post-card" id="post-${escapeHtml(post.id)}" data-post-id="${escapeHtml(post.id)}" ${demoAttr}>
      <div class="post-author">
        <button class="author-profile-button" type="button" data-action="open-profile" data-user-id="${escapeHtml(post.author.id)}" aria-label="Open ${escapeHtml(post.author.fullName)} profile">
          <img src="${escapeHtml(avatarUrlFor(post.author))}" alt="">
          <span>
            <h3>${escapeHtml(post.author.fullName)}</h3>
            <p>@${escapeHtml(post.author.username)} · ${timeAgo(post.createdAt)}</p>
          </span>
        </button>
        ${canFollow ? `<button class="follow-button" type="button" data-action="follow-user" data-user-id="${escapeHtml(post.author.id)}">${followLabel}</button>` : ""}
        <span class="post-tag">${escapeHtml(post.postType)}</span>
      </div>
      <p class="post-text">${escapeHtml(post.body)}</p>
      ${mediaMarkup(post)}
      <div class="engagement-bar">
        <button type="button" data-action="like" data-post-id="${escapeHtml(post.id)}">${post.likedByMe ? "Liked" : "Like"} <span>${compactNumber(post.likeCount)}</span></button>
        <button type="button" data-action="toggle-comments" data-post-id="${escapeHtml(post.id)}">Comments <span>${compactNumber(post.commentCount)}</span></button>
        <button type="button" data-action="share" data-post-id="${escapeHtml(post.id)}">${post.sharedByMe ? "Shared" : "Share"} <span>${compactNumber(post.shareCount)}</span></button>
      </div>
      ${commentsMarkup(post)}
    </article>
  `;
}

function reelActionIcon(action) {
  const icons = {
    like: `<svg viewBox="0 0 24 24" focusable="false"><path d="M20.8 4.6c-1.7-1.7-4.4-1.7-6.1 0L12 7.3 9.3 4.6c-1.7-1.7-4.4-1.7-6.1 0s-1.7 4.5 0 6.2L12 19.6l8.8-8.8c1.7-1.7 1.7-4.5 0-6.2Z"></path></svg>`,
    "toggle-comments": `<svg viewBox="0 0 24 24" focusable="false"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.8 9.8 0 0 1-4.1-.9L3 20l1.2-4.2a8.1 8.1 0 0 1-1-4.3 8.4 8.4 0 0 1 9-8.4 8.5 8.5 0 0 1 8.8 8.4Z"></path></svg>`,
    share: `<svg viewBox="0 0 24 24" focusable="false"><path d="M22 3 10.5 14.5"></path><path d="m22 3-7 19-4.5-7.5L3 10l19-7Z"></path></svg>`,
    "save-reel": `<svg viewBox="0 0 24 24" focusable="false"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"></path></svg>`
  };
  return icons[action] || `<svg viewBox="0 0 24 24" focusable="false"><path d="M12 5v14M5 12h14"></path></svg>`;
}

function reelActionButton({ action, postId, label, count, active = false }) {
  return `
    <button class="reel-action ${active ? "is-active" : ""}" type="button" data-action="${action}" data-post-id="${escapeHtml(postId)}">
      <span class="reel-action-icon" aria-hidden="true">${reelActionIcon(action)}</span>
      <span class="reel-action-label">${escapeHtml(label)}</span>
      ${count !== undefined ? `<strong class="reel-action-count">${escapeHtml(count)}</strong>` : ""}
    </button>
  `;
}

function reelCard(post) {
  const demoAttr = post.isDemo ? "data-demo='true'" : "";
  const followLabel = post.author.following ? "Following" : "Follow";
  const canFollow = currentUser()?.id !== post.author.id;
  const commentCount = compactNumber(post.commentCount || (post.comments || []).length);
  const saved = isReelSaved(post.id);
  return `
    <article class="reel-card-vertical post-card" id="post-${escapeHtml(post.id)}" data-post-id="${escapeHtml(post.id)}" ${demoAttr}>
      <div class="reel-phone-frame">
        <div class="reel-stage">
          ${reelMediaMarkup(post)}
          <div class="reel-shadow"></div>
          <div class="reel-caption-panel">
            <div class="reel-author-row">
              <button class="reel-author-button" type="button" data-action="open-profile" data-user-id="${escapeHtml(post.author.id)}" aria-label="Open ${escapeHtml(post.author.fullName)} profile">
                <img src="${escapeHtml(avatarUrlFor(post.author))}" alt="">
                <span>
                  <strong class="reel-author-name">${escapeHtml(post.author.fullName)}</strong>
                  <small>@${escapeHtml(post.author.username)} · ${timeAgo(post.createdAt)}</small>
                </span>
              </button>
              ${canFollow ? `<button class="reel-follow-button" type="button" data-action="follow-user" data-user-id="${escapeHtml(post.author.id)}">${followLabel}</button>` : ""}
            </div>
            <p class="reel-caption-text post-text">${escapeHtml(post.body)}</p>
          </div>
          <div class="reel-actions-rail" aria-label="Reel actions">
            ${reelActionButton({ action: "like", postId: post.id, label: post.likedByMe ? "Liked" : "Like", count: compactNumber(post.likeCount), active: post.likedByMe })}
            ${reelActionButton({ action: "toggle-comments", postId: post.id, label: "Comment", count: commentCount })}
            ${reelActionButton({ action: "share", postId: post.id, label: post.sharedByMe ? "Shared" : "Share", count: compactNumber(post.shareCount), active: post.sharedByMe })}
            ${reelActionButton({ action: "save-reel", postId: post.id, label: saved ? "Saved" : "Save", active: saved })}
          </div>
        </div>
        ${commentsMarkup(post)}
      </div>
    </article>
  `;
}

function setActionButtonState(button, label, countText, active = false) {
  if (button.classList.contains("reel-action")) {
    button.classList.toggle("is-active", Boolean(active));
    const labelElement = button.querySelector(".reel-action-label");
    const countElement = button.querySelector(".reel-action-count");
    if (labelElement) labelElement.textContent = label;
    if (countElement && countText !== undefined) countElement.textContent = countText;
    return;
  }
  button.innerHTML = countText === undefined ? label : `${label} <span>${countText}</span>`;
}

async function loadPosts(params = "") {
  try {
    const data = await requestApi(`/api/posts${params}`);
    return [...(data.posts || [])].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  } catch (error) {
    return [];
  }
}

function renderComposerIntro() {
  return `
    <div class="page-head">
      <div>
        <p class="eyebrow dark">Create post</p>
        <h1>Post text, image, video, or reel</h1>
        <p>Choose a format on the composer, write your update, add a media URL, then notify Quash.</p>
      </div>
      <button class="page-action" type="button" data-action="compose-home">Open composer</button>
    </div>
  `;
}

async function renderFeed() {
  const posts = await loadPosts();
  showPage(
    "feed",
    `
      <div class="page-head">
        <div>
          <p class="eyebrow dark">Live feed</p>
          <h1>Daily updates from Quash</h1>
          <p>News, thoughts, reels, images, and public alerts from people and communities.</p>
        </div>
        <button class="page-action" type="button" data-action="compose-home">Create post</button>
      </div>
      <div class="page-grid single">
        ${posts.length ? posts.map(postCard).join("") : `<div class="empty-state compact"><p>No posts yet. Create the first real Quash update.</p></div>`}
      </div>
    `
  );
}

function renderTrending() {
  showPage(
    "trending",
    `
      <div class="page-head">
        <div>
          <p class="eyebrow dark">Trending page</p>
          <h1>What is trending now</h1>
          <p>Open a full topic page, follow the topic, and read posts using that trend.</p>
        </div>
      </div>
      <div class="trend-page-grid">
        ${trends
          .map(
            (trend) => `
              <article class="trend-card">
                <span>${trend.tag}</span>
                <h2>${trend.title}</h2>
                <strong>${trend.posts}</strong>
                <p>${trend.detail}</p>
                <div class="card-actions">
                  <button type="button" data-action="open-topic" data-topic="${trend.slug}">Open topic</button>
                  <button type="button" data-action="follow-topic" data-topic="${trend.slug}">Follow topic</button>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `
  );
}

async function renderReels() {
  const posts = await loadPosts();
  const reels = posts.filter(isReelPost);
  showPage(
    "reels",
    `
      <div class="page-head">
        <div>
          <p class="eyebrow dark">Reels</p>
          <h1>Short updates in vertical format</h1>
          <p>Watch 9:16 reels with quick like, comment, share, and save actions.</p>
        </div>
        <button class="page-action" type="button" data-action="compose-reel">Create reel</button>
      </div>
      <div class="reels-feed">
        ${reels.length ? reels.map(reelCard).join("") : `<div class="empty-state compact"><p>No reels yet. Create the first reel update.</p></div>`}
      </div>
    `
  );
}

async function renderTopic(topicSlug) {
  activeTopic = topicSlug;
  const trend = trends.find((item) => item.slug === topicSlug) || { tag: `#${topicSlug}`, title: topicSlug, detail: "Live topic updates from Quash." };
  let data = { posts: [], following: false, followers: 0 };
  try {
    data = await requestApi(`/api/topics/${encodeURIComponent(topicSlug)}`);
  } catch (error) {
    data.posts = [];
  }

  showPage(
    "trending",
    `
      <div class="page-head topic-head">
        <div>
          <p class="eyebrow dark">Topic page</p>
          <h1>${escapeHtml(trend.tag)}</h1>
          <p>${escapeHtml(trend.detail)}</p>
        </div>
        <button class="page-action" type="button" data-action="follow-topic" data-topic="${escapeHtml(topicSlug)}">${data.following ? "Following" : "Follow topic"} · ${compactNumber(data.followers)}</button>
      </div>
      <div class="topic-tools">
        <button type="button" data-action="compose-topic" data-topic="${escapeHtml(topicSlug)}">Create post with ${escapeHtml(trend.tag)}</button>
        <button type="button" data-action="back-trending">Back to trending</button>
      </div>
      <div class="page-grid single">
        ${data.posts.length ? data.posts.map(postCard).join("") : `<div class="empty-state compact"><p>No one has posted with ${escapeHtml(trend.tag)} yet. Create the first one.</p></div>`}
      </div>
    `
  );
}

function renderCommunities() {
  const items = visibleCommunities();
  showPage(
    "communities",
    `
      <div class="page-head">
        <div>
          <p class="eyebrow dark">Communities</p>
          <h1>Join people who care about the same updates</h1>
          <p>Find public spaces for daily news, style, tech, alerts, and creator conversations.</p>
        </div>
        <button class="page-action" type="button" data-action="create-community">Create community</button>
      </div>
      <div class="community-page-grid">
        ${items
          .map(
            (community) => `
              <article class="community-card">
                <img src="${escapeHtml(community.image)}" alt="">
                <div>
                  <h2>${escapeHtml(community.name)}</h2>
                  <p>${escapeHtml(community.detail)}</p>
                  <strong>${escapeHtml(community.members)} members</strong>
                </div>
                <button type="button" data-action="join-community" data-community-id="${escapeHtml(community.id)}">${community.joined ? "Joined" : "Join"}</button>
              </article>
            `
          )
          .join("")}
      </div>
    `
  );
}

function renderGroups() {
  const items = visibleGroups();
  showPage(
    "groups",
    `
      <div class="page-head">
        <div>
          <p class="eyebrow dark">Groups</p>
          <h1>Make smaller circles for real conversations</h1>
          <p>Create focused groups for friends, reporters, creators, classrooms, and local teams.</p>
        </div>
        <button class="page-action" type="button" data-action="create-group">New group</button>
      </div>
      <div class="group-page-grid">
        ${items
          .map(
            (group) => `
              <article class="group-page-card">
                <div>
                  <h2>${escapeHtml(group.name)}</h2>
                  <p>${escapeHtml(group.detail)}</p>
                </div>
                <span>${escapeHtml(group.members)}</span>
                <button type="button" data-action="join-group" data-group-id="${escapeHtml(group.id)}">${group.joined ? "Joined" : "Join group"}</button>
              </article>
            `
          )
          .join("")}
      </div>
    `
  );
}

function createCommunity() {
  if (!requireUser()) return;
  const name = window.prompt("Community name");
  if (!name?.trim()) return;
  const detail = window.prompt("What is this community about?") || "A new Quash community for daily updates and conversations.";
  const item = {
    id: `community-${slugify(name)}-${Date.now().toString(36)}`,
    name: name.trim().slice(0, 70),
    detail: detail.trim().slice(0, 180),
    members: "1",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=300&q=80"
  };
  writeJsonArray(CUSTOM_COMMUNITIES_KEY, [item, ...createdCommunities()]);
  const joined = joinedSet(JOINED_COMMUNITIES_KEY);
  joined.add(item.id);
  writeJsonArray(userScopedKey(JOINED_COMMUNITIES_KEY), [...joined]);
  renderCommunities();
  history.replaceState(null, "", "#communities");
}

function createGroup() {
  if (!requireUser()) return;
  const name = window.prompt("Group name");
  if (!name?.trim()) return;
  const detail = window.prompt("What will people share in this group?") || "A focused Quash group for smaller conversations.";
  const item = {
    id: `group-${slugify(name)}-${Date.now().toString(36)}`,
    name: name.trim().slice(0, 70),
    detail: detail.trim().slice(0, 180),
    members: "1"
  };
  writeJsonArray(CUSTOM_GROUPS_KEY, [item, ...createdGroups()]);
  const joined = joinedSet(JOINED_GROUPS_KEY);
  joined.add(item.id);
  writeJsonArray(userScopedKey(JOINED_GROUPS_KEY), [...joined]);
  renderGroups();
  history.replaceState(null, "", "#groups");
}

async function renderProfile() {
  const user = currentUser();
  if (!user) {
    openAuth("login");
    showPage(
      "profile",
      `
        <div class="empty-state">
          <h1>Your Quash profile</h1>
          <p>Sign in or create an account to see your posts, profile details, followers, following, and activity timeline.</p>
          <button class="page-action" type="button" data-action="login">Sign in</button>
        </div>
      `
    );
    return;
  }

  let data;
  try {
    data = await requestApi("/api/my-activity");
  } catch (error) {
    data = { user, posts: [], activity: [], stats: { posts: 0, followers: 0, following: 0 } };
  }

  const localProfilePosts = demoPosts.filter((post) => {
    if (!post?.isDemo || !post?.author) return false;
    return String(post.author.id) === String(user.id);
  });

  const combinedProfilePosts = [...localProfilePosts, ...(data.posts || [])].sort(
    (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)
  );

  const baseStats = data.stats || { posts: 0, followers: 0, following: 0 };
  const profileStats = {
    posts: Math.max(Number(baseStats.posts || 0), 0) + localProfilePosts.length,
    followers: Number(baseStats.followers || 0),
    following: Number(baseStats.following || 0)
  };

  showPage(
    "profile",
    `
      <section class="profile-page-hero">
        <img src="${escapeHtml(avatarUrlFor(data.user))}" alt="">
        <div>
          <p class="eyebrow dark">Profile</p>
          <h1>${escapeHtml(data.user.fullName)}</h1>
          <p>@${escapeHtml(data.user.username)} · ${escapeHtml(data.user.bio || "Sharing thoughts, news, and daily updates on Quash.")}</p>
        </div>
      </section>
      <div class="profile-dashboard">
        <article><strong>${profileStats.posts}</strong><span>Posts</span></article>
        <article><strong>${profileStats.followers}</strong><span>Followers</span></article>
        <article><strong>${profileStats.following}</strong><span>Following</span></article>
      </div>
      <div class="profile-layout">
        <section>
          <h2>Your posts</h2>
          ${combinedProfilePosts.length ? combinedProfilePosts.map(postCard).join("") : `<div class="empty-state compact"><p>No posts yet. Create your first update from the feed.</p></div>`}
        </section>
        <aside class="activity-panel">
          <h2>Activity</h2>
          ${data.activity
            .map(
              (item) => `
                <div class="activity-item">
                  <strong>${escapeHtml(item.label)}</strong>
                  <p>${escapeHtml(item.detail)}</p>
                  <span>${timeAgo(item.createdAt)}</span>
                </div>
              `
            )
            .join("")}
          <button class="profile-link-copy danger" type="button" data-action="logout">Sign out</button>
        </aside>
      </div>
    `
  );
}

async function renderPublicProfile(userId) {
  activeProfileId = String(userId || "");
  const signedInUser = currentUser();
  if (signedInUser && String(signedInUser.id) === activeProfileId) {
    await renderProfile();
    return;
  }

  let data;
  try {
    data = await requestApi(`/api/users/${encodeURIComponent(activeProfileId)}/profile`);
  } catch (error) {
    showPage(
      "public-profile",
      `
        <div class="empty-state">
          <h1>Profile not found</h1>
          <p>This Quash profile is not available yet.</p>
          <button class="page-action" type="button" data-route="feed">Back to feed</button>
        </div>
      `
    );
    return;
  }

  const profileUser = data.user || {};
  const posts = [...(data.posts || [])].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const stats = data.stats || { posts: posts.length, followers: profileUser.followers || 0, following: 0 };
  const canFollow = String(signedInUser?.id || "") !== String(profileUser.id || "");
  const canMessage = canFollow && /^\d+$/.test(String(profileUser.id || ""));
  const followLabel = profileUser.following ? "Following" : "Follow";

  showPage(
    "public-profile",
    `
      <section class="profile-page-hero public-profile-hero">
        <img src="${escapeHtml(avatarUrlFor(profileUser))}" alt="">
        <div>
          <p class="eyebrow dark">Public profile</p>
          <h1>${escapeHtml(profileUser.fullName || "Quash user")}</h1>
          <p>@${escapeHtml(profileUser.username || "quashuser")} · ${escapeHtml(profileUser.bio || "Sharing thoughts, news, and daily updates on Quash.")}</p>
        </div>
        ${canFollow
          ? `<div class="profile-action-row">
              <button class="page-action profile-follow-action" type="button" data-action="follow-user" data-user-id="${escapeHtml(profileUser.id)}">${followLabel}</button>
              ${canMessage ? `<button class="profile-link-copy" type="button" data-action="open-chat" data-user-id="${escapeHtml(profileUser.id)}">Message</button>` : ""}
            </div>`
          : ""}
      </section>
      <div class="profile-dashboard">
        <article><strong>${compactNumber(stats.posts)}</strong><span>Posts</span></article>
        <article><strong>${compactNumber(stats.followers)}</strong><span>Followers</span></article>
        <article><strong>${compactNumber(stats.following)}</strong><span>Following</span></article>
      </div>
      <div class="profile-layout">
        <section>
          <h2>Posts by @${escapeHtml(profileUser.username || "quashuser")}</h2>
          ${posts.length ? posts.map(postCard).join("") : `<div class="empty-state compact"><p>No public posts yet.</p></div>`}
        </section>
        <aside class="activity-panel">
          <h2>Activity</h2>
          ${(data.activity || [])
            .map(
              (item) => `
                <div class="activity-item">
                  <strong>${escapeHtml(item.label)}</strong>
                  <p>${escapeHtml(item.detail)}</p>
                  <span>${timeAgo(item.createdAt)}</span>
                </div>
              `
            )
            .join("")}
          <button class="profile-link-copy" type="button" data-action="copy-profile-link" data-user-id="${escapeHtml(profileUser.id)}">Copy profile link</button>
        </aside>
      </div>
    `
  );
}

async function renderMessages(selectedUserId = "") {
  const signedInUser = currentUser();
  if (!signedInUser) {
    showPage(
      "messages",
      `
        <div class="empty-state">
          <h1>Messages</h1>
          <p>Create an account or sign in to send private messages to other Quash users.</p>
          <button class="page-action" type="button" data-action="login">Sign in</button>
        </div>
      `
    );
    return;
  }

  activeChatUserId = String(selectedUserId || activeChatUserId || "");

  let inbox = { conversations: [], contacts: [] };
  try {
    inbox = await requestApi("/api/messages");
  } catch (error) {
    showPage(
      "messages",
      `
        <div class="empty-state">
          <h1>Messages unavailable</h1>
          <p>${escapeHtml(error.message)}</p>
          <button class="page-action" type="button" data-route="feed">Back to feed</button>
        </div>
      `
    );
    return;
  }

  const contactRows = mergeChatContacts(inbox.conversations, inbox.contacts);
  if (!activeChatUserId && contactRows.length) {
    activeChatUserId = String(contactRows[0].user.id);
  }

  let activeThread = null;
  if (activeChatUserId) {
    try {
      activeThread = await requestApi(`/api/messages/${encodeURIComponent(activeChatUserId)}`);
    } catch (error) {
      activeThread = null;
    }
  }

  const activeUser = activeThread?.user || contactRows.find((row) => String(row.user.id) === activeChatUserId)?.user || null;
  const messages = activeThread?.messages || [];
  const contactsMarkup = contactRows.length
    ? contactRows.map((conversation) => chatContactButton(conversation, activeChatUserId)).join("")
    : `<div class="empty-note chat-empty-note">Search people or open a public profile to start a message.</div>`;

  showPage(
    "messages",
    `
      <div class="page-head">
        <div>
          <p class="eyebrow dark">Messages</p>
          <h1>Chat with Quash users</h1>
          <p>Send private text messages, continue conversations, and connect from public profiles.</p>
        </div>
        <button class="page-action" type="button" data-action="focus-search">Find people</button>
      </div>
      <section class="chat-shell">
        <aside class="chat-sidebar" aria-label="Conversations">
          <div class="chat-sidebar-head">
            <h2>Inbox</h2>
            <span>${compactNumber(contactRows.length)} people</span>
          </div>
          <div class="chat-contact-list">
            ${contactsMarkup}
          </div>
        </aside>
        <section class="chat-panel" aria-label="Message thread">
          ${activeUser
            ? `
              <div class="chat-thread-head">
                <button class="chat-user-button" type="button" data-action="open-profile" data-user-id="${escapeHtml(activeUser.id)}">
                  <img src="${escapeHtml(avatarUrlFor(activeUser))}" alt="">
                  <span>
                    <strong>${escapeHtml(activeUser.fullName || "Quash user")}</strong>
                    <small>@${escapeHtml(activeUser.username || "quashuser")} · ${compactNumber(activeUser.followers || 0)} followers</small>
                  </span>
                </button>
                <button class="profile-link-copy" type="button" data-action="follow-user" data-user-id="${escapeHtml(activeUser.id)}">${activeUser.following ? "Following" : "Follow"}</button>
              </div>
              <div class="chat-message-list">
                ${messages.length
                  ? messages.map(chatMessageBubble).join("")
                  : `<div class="empty-note chat-empty-note">No messages yet. Say hello and start the conversation.</div>`}
              </div>
              <form class="chat-form" data-user-id="${escapeHtml(activeUser.id)}">
                <input name="body" maxlength="1200" placeholder="Message @${escapeHtml(activeUser.username || "quashuser")}">
                <button type="submit">Send</button>
              </form>
            `
            : `
              <div class="empty-state compact chat-start-state">
                <h2>Choose someone to message</h2>
                <p>Follow people, open public profiles, or search creators to begin a chat.</p>
                <button class="page-action" type="button" data-action="focus-search">Find people</button>
              </div>
            `}
        </section>
      </section>
    `
  );
}

async function renderSearch(query) {
  if (!query) return;
  let data = { users: [], posts: [] };
  try {
    data = await requestApi(`/api/search?q=${encodeURIComponent(query)}`);
  } catch (error) {
    data.posts = [];
  }

  showPage(
    "feed",
    `
      <div class="page-head">
        <div>
          <p class="eyebrow dark">Search</p>
          <h1>Results for ${escapeHtml(query)}</h1>
          <p>Search across posts, creators, topics, and communities.</p>
        </div>
      </div>
      <section class="search-results">
        <h2>People</h2>
        <div class="people-grid">
          ${data.users.length
            ? data.users
                .map(
                  (user) => `
                    <article class="person-card">
                      <button class="person-profile-button" type="button" data-action="open-profile" data-user-id="${escapeHtml(user.id)}" aria-label="Open ${escapeHtml(user.fullName)} profile">
                        <img src="${escapeHtml(avatarUrlFor(user))}" alt="">
                        <span>
                          <h3>${escapeHtml(user.fullName)}</h3>
                          <p>@${escapeHtml(user.username)} · ${compactNumber(user.followers)} followers</p>
                        </span>
                      </button>
                      <div class="person-card-actions">
                        ${String(currentUser()?.id || "") !== String(user.id || "") ? `<button type="button" data-action="open-chat" data-user-id="${escapeHtml(user.id)}">Message</button>` : ""}
                        <button type="button" data-action="follow-user" data-user-id="${escapeHtml(user.id)}">${user.following ? "Following" : "Follow"}</button>
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<div class="empty-state compact"><p>No matching people yet.</p></div>`}
        </div>
        <h2>Posts</h2>
        <div class="page-grid single">
          ${data.posts.length ? data.posts.map(postCard).join("") : `<div class="empty-state compact"><p>No matching posts yet.</p></div>`}
        </div>
      </section>
    `
  );
}

async function refreshCurrentPage() {
  if (activeRoute === "profile") {
    await renderProfile();
  } else if (activeRoute === "public-profile" && activeProfileId) {
    await renderPublicProfile(activeProfileId);
  } else if (activeRoute === "reels") {
    await renderReels();
  } else if (activeRoute === "messages") {
    await renderMessages(activeChatUserId);
  } else if (activeRoute === "feed") {
    await renderFeed();
  } else if (activeTopic) {
    await renderTopic(activeTopic);
  }
}

async function navigate(route) {
  if (!currentUser() || !currentToken()) {
    setGateTab("login");
    setAuthLocked(true);
    return;
  }
  activeTopic = "";
  activeProfileId = "";
  if (route === "feed") {
    await renderFeed();
    return;
  }
  if (route === "trending") renderTrending();
  if (route === "reels") await renderReels();
  if (route === "communities") renderCommunities();
  if (route === "groups") renderGroups();
  if (route === "messages") await renderMessages();
  if (route === "profile") await renderProfile();
}

function setComposerMode(mode) {
  toolButtons.forEach((item) => item.classList.toggle("selected", item.dataset.mode === mode));
  const lower = mode.toLowerCase();
  const article = lower === "image" ? "an" : "a";
  textarea.placeholder = `Create ${article} ${lower} update for Quash`;
  syncComposerUploadUi(mode);
  if (["Image", "Video", "Reel"].includes(mode)) {
    mediaUrlInput.focus();
  } else {
    textarea.focus();
  }
}

async function createPost() {
  if (!requireUser()) return;
  const selectedMode = document.querySelector(".tool-button.selected").dataset.mode;
  const message = textarea.value.trim();
  const mediaUrl = mediaUrlInput.value.trim();
  const hasUpload = Boolean(uploadedComposerMedia?.file);
  if (!message && !mediaUrl && !hasUpload) {
    postButton.textContent = "Add update";
    window.setTimeout(() => (postButton.textContent = "Notify"), 1500);
    return;
  }

  postButton.textContent = "Saving...";
  try {
    let finalMediaUrl = mediaUrl;
    if (hasUpload) {
      postButton.textContent = uploadedComposerMedia.kind === "image" ? "Optimizing..." : "Checking file...";
      const uploadFile = await prepareUploadFile(uploadedComposerMedia.file, uploadedComposerMedia.kind);
      postButton.textContent = "Uploading 0%";
      const uploaded = await uploadComposerMedia(uploadFile, (progress) => {
        postButton.textContent = `Uploading ${progress}%`;
      });
      finalMediaUrl = uploaded.mediaUrl || "";
    }

    await requestApi("/api/posts", {
      method: "POST",
      body: JSON.stringify({ postType: selectedMode, body: message, mediaUrl: finalMediaUrl })
    });

    if (hasUpload) {
      localStorage.removeItem(LOCAL_UPLOADED_POSTS_KEY);
    }
    textarea.value = "";
    mediaUrlInput.value = "";
    clearComposerUpload();
    postButton.textContent = "Notified";
    await renderFeed();
  } catch (error) {
    postButton.textContent = error.message;
  }
  window.setTimeout(() => {
    postButton.textContent = "Notify";
  }, 1800);
}

async function logout() {
  try {
    await requestApi("/api/logout", { method: "POST", body: "{}" });
  } catch (error) {
    // A missing server should not block clearing the local session.
  }
  clearSession();
  applyGuest();
  window.location.reload();
}

async function refreshNotifications() {
  if (!currentUser()) {
    notificationDot.classList.remove("visible");
    return;
  }
  try {
    const data = await requestApi("/api/notifications");
    notificationDot.classList.toggle("visible", data.unreadCount > 0);
    notificationList.innerHTML = data.notifications.length
      ? data.notifications
          .map(
            (notification) => `
              <article class="notification-item ${notification.isRead ? "" : "unread"}">
                <strong>${escapeHtml(notification.message)}</strong>
                <span>${timeAgo(notification.createdAt)}</span>
              </article>
            `
          )
          .join("")
      : `<p class="empty-note">No notifications yet. Likes, comments, shares, and follows will appear here.</p>`;
  } catch (error) {
    notificationList.innerHTML = `<p class="empty-note">Notifications are unavailable until the local server is running.</p>`;
  }
}

function openNotifications() {
  notificationPanel.classList.add("open");
  notificationPanel.setAttribute("aria-hidden", "false");
  refreshNotifications();
  requestApi("/api/notifications/read", { method: "POST", body: "{}" }).catch(() => {});
  notificationDot.classList.remove("visible");
}

function closeNotifications() {
  notificationPanel.classList.remove("open");
  notificationPanel.setAttribute("aria-hidden", "true");
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setComposerMode(button.dataset.mode));
});

if (mediaPickerButton && mediaPickerInput) {
  mediaPickerButton.addEventListener("click", () => {
    mediaPickerInput.click();
  });
}

if (mediaClearButton) {
  mediaClearButton.addEventListener("click", clearComposerUpload);
}

if (mediaPickerInput) {
  mediaPickerInput.addEventListener("change", () => {
    const file = mediaPickerInput.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      postButton.textContent = "File too large";
      if (mediaHint) mediaHint.textContent = `Choose a file under ${formatBytes(MAX_UPLOAD_BYTES)}.`;
      window.setTimeout(() => (postButton.textContent = "Notify"), 1800);
      mediaPickerInput.value = "";
      return;
    }

    const inferredKind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "";
    if (!inferredKind) {
      postButton.textContent = "Unsupported file";
      window.setTimeout(() => (postButton.textContent = "Notify"), 1400);
      mediaPickerInput.value = "";
      return;
    }

    const selectedMode = document.querySelector(".tool-button.selected")?.dataset.mode || "Text";
    const expectedKind = mediaKindForMode(selectedMode);
    if (!expectedKind) {
      setComposerMode(inferredKind === "image" ? "Image" : "Video");
    } else if (expectedKind !== inferredKind) {
      postButton.textContent = expectedKind === "image" ? "Choose image file" : "Choose video file";
      window.setTimeout(() => (postButton.textContent = "Notify"), 1400);
      mediaPickerInput.value = "";
      return;
    }

    setComposerUpload(file, inferredKind);
  });
}

syncComposerUploadUi("Text");

setInterval(() => {
  tickerIndex = (tickerIndex + 1) % tickerUpdates.length;
  tickerText.textContent = tickerUpdates[tickerIndex];
}, 3200);

postButton.addEventListener("click", createPost);

authOpenButton.addEventListener("click", () => {
  const user = currentUser();
  if (user) {
    navigate("profile");
    return;
  }
  openAuth("login");
});

loginOpenButton.addEventListener("click", () => {
  if (loginOpenButton.dataset.action === "logout") {
    logout();
    return;
  }
  openAuth("login");
});

authCloseButton.addEventListener("click", closeAuth);
authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuth();
});
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthTab(tab.dataset.authTab));
});

gateAuthTabs.forEach((tab) => {
  tab.addEventListener("click", () => setGateTab(tab.dataset.gateTab));
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitLoginForm(loginForm, authMessage);
});

gateLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitLoginForm(gateLoginForm, gateAuthMessage);
});

document.addEventListener("submit", async (event) => {
  const chatForm = event.target.closest(".chat-form");
  if (chatForm) {
    event.preventDefault();
    if (!requireUser()) return;
    const userId = chatForm.dataset.userId;
    const input = chatForm.querySelector("input[name='body']");
    const body = input.value.trim();
    if (!body) return;
    const sendButton = chatForm.querySelector("button");
    sendButton.textContent = "Sending...";
    try {
      await requestApi(`/api/messages/${encodeURIComponent(userId)}`, {
        method: "POST",
        body: JSON.stringify({ body })
      });
      input.value = "";
      await renderMessages(userId);
      refreshNotifications();
    } catch (error) {
      input.placeholder = error.message;
    } finally {
      sendButton.textContent = "Send";
    }
    return;
  }

  const form = event.target.closest(".comment-form");
  if (!form) return;
  event.preventDefault();
  if (!requireUser()) return;
  const postId = form.dataset.postId;
  const input = form.querySelector("input");
  const body = input.value.trim();
  if (!body) return;
  if (form.closest("[data-demo='true']")) {
    const list = form.closest(".comment-section").querySelector(".comment-list");
    list.insertAdjacentHTML(
      "beforeend",
      `<div class="comment-item"><img src="${escapeHtml(avatarUrlFor(currentUser()))}" alt=""><div><strong>${escapeHtml(currentUser().fullName)}</strong><p>${escapeHtml(body)}</p></div></div>`
    );
    input.value = "";
    return;
  }
  try {
    await requestApi(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body })
    });
    input.value = "";
    await refreshCurrentPage();
    refreshNotifications();
  } catch (error) {
    input.placeholder = error.message;
  }
});

document.addEventListener("click", async (event) => {
  const routeLink = event.target.closest("[href^='#'], [data-route]");
  if (routeLink) {
    const route = routeLink.dataset.route || routeLink.getAttribute("href").replace("#", "");
    if (["feed", "trending", "reels", "communities", "groups", "messages", "profile"].includes(route)) {
      event.preventDefault();
      await navigate(route);
      history.replaceState(null, "", `#${route}`);
      return;
    }
  }

  const actionTarget = event.target.closest("[data-action]");
  const action = actionTarget?.dataset.action;
  if (!action) return;

  if (action === "social-login") {
    await startSocialLogin(actionTarget.dataset.provider || "google");
    return;
  }

  if (action === "open-profile") {
    const userId = actionTarget.dataset.userId;
    if (!userId) return;
    activeTopic = "";
    await renderPublicProfile(userId);
    const signedInUser = currentUser();
    history.replaceState(null, "", signedInUser && String(signedInUser.id) === String(userId) ? "#profile" : profileHashFor(userId));
    return;
  }
  if (action === "open-chat") {
    if (!requireUser()) return;
    const userId = actionTarget.dataset.userId;
    if (!userId) return;
    activeTopic = "";
    activeProfileId = "";
    await renderMessages(userId);
    history.replaceState(null, "", chatHashFor(userId));
    return;
  }
  if (action === "focus-search") {
    await navigate("feed");
    searchInput.focus();
    searchInput.placeholder = "Search people by name or username";
    return;
  }
  if (action === "compose-home" || action === "compose") {
    showHome();
    document.querySelector("#composer").scrollIntoView({ behavior: "smooth" });
    textarea.focus();
    return;
  }
  if (action === "compose-reel") {
    showHome();
    setComposerMode("Reel");
    document.querySelector("#composer").scrollIntoView({ behavior: "smooth" });
    textarea.focus();
    return;
  }
  if (action === "compose-topic") {
    showHome();
    const trend = trends.find((item) => item.slug === actionTarget.dataset.topic);
    textarea.value = `${trend?.tag || `#${actionTarget.dataset.topic}`} `;
    document.querySelector("#composer").scrollIntoView({ behavior: "smooth" });
    textarea.focus();
    return;
  }
  if (action === "login") {
    openAuth("login");
    return;
  }
  if (action === "logout") {
    await logout();
    return;
  }
  if (action === "open-topic") {
    await renderTopic(actionTarget.dataset.topic);
    history.replaceState(null, "", `#topic-${actionTarget.dataset.topic}`);
    return;
  }
  if (action === "back-trending") {
    activeTopic = "";
    renderTrending();
    return;
  }
  if (action === "toggle-comments") {
    const commentSection = actionTarget.closest(".post-card")?.querySelector(".comment-section");
    if (commentSection) {
      commentSection.classList.toggle("open");
      if (actionTarget.closest(".reel-card-vertical") && commentSection.classList.contains("open")) {
        commentSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    return;
  }
  if (action === "like") {
    if (!requireUser()) return;
    const card = actionTarget.closest(".post-card");
    if (card.dataset.demo === "true") {
      const currentCount = actionTarget.querySelector(".reel-action-count, span")?.textContent || "";
      setActionButtonState(actionTarget, "Liked", currentCount, true);
      return;
    }
    const data = await requestApi(`/api/posts/${actionTarget.dataset.postId}/like`, { method: "POST", body: "{}" });
    setActionButtonState(actionTarget, data.liked ? "Liked" : "Like", compactNumber(data.likeCount), data.liked);
    refreshNotifications();
    return;
  }
  if (action === "share") {
    if (!requireUser()) return;
    const card = actionTarget.closest(".post-card");
    const postText = card.querySelector(".reel-caption-text, .post-text")?.textContent.trim() || "Quash update";
    const shareTitle = card.querySelector(".reel-author-name, .post-author h3")?.textContent.trim() || "Quash";
    const postId = actionTarget.dataset.postId;
    const shareLabel = actionTarget.querySelector(".reel-action-label")?.textContent || actionTarget.textContent;
    const alreadyShared = shareLabel.trim().toLowerCase().startsWith("shared");
    shareContext = {
      postId,
      isDemo: card.dataset.demo === "true",
      button: actionTarget,
      alreadyShared,
      title: shareTitle,
      text: postText
    };
    openShareDialog({
      url: postShareUrl(postId),
      title: shareTitle,
      text: postText
    });
    return;
  }
  if (action === "save-reel") {
    if (!requireUser()) return;
    const saved = toggleSavedReel(actionTarget.dataset.postId);
    setActionButtonState(actionTarget, saved ? "Saved" : "Save", undefined, saved);
    return;
  }
  if (action === "follow-user") {
    if (!requireUser()) return;
    const userId = actionTarget.dataset.userId;
    const data = await requestApi(`/api/users/${userId}/follow`, { method: "POST", body: "{}" });
    actionTarget.textContent = data.following ? "Following" : "Follow";
    refreshNotifications();
    return;
  }
  if (action === "copy-profile-link") {
    const userId = actionTarget.dataset.userId;
    try {
      await navigator.clipboard.writeText(publicProfileUrl(userId));
      actionTarget.textContent = "Profile link copied";
    } catch (error) {
      actionTarget.textContent = publicProfileUrl(userId);
    }
    return;
  }
  if (action === "follow-topic") {
    if (!requireUser()) return;
    const topic = actionTarget.dataset.topic;
    const data = await requestApi(`/api/topics/${topic}/follow`, { method: "POST", body: "{}" });
    actionTarget.textContent = `${data.following ? "Following" : "Follow topic"} · ${compactNumber(data.followers)}`;
    return;
  }
  if (action === "create-community") {
    createCommunity();
    return;
  }
  if (action === "create-group") {
    createGroup();
    return;
  }
  if (action === "join-community") {
    if (!requireUser()) return;
    const joined = toggleJoined(JOINED_COMMUNITIES_KEY, actionTarget.dataset.communityId);
    actionTarget.textContent = joined ? "Joined" : "Join";
    return;
  }
  if (action === "join-group") {
    if (!requireUser()) return;
    const joined = toggleJoined(JOINED_GROUPS_KEY, actionTarget.dataset.groupId);
    actionTarget.textContent = joined ? "Joined" : "Join group";
  }
});

createButton.addEventListener("click", async () => {
  showHome();
  document.querySelector("#composer").scrollIntoView({ behavior: "smooth" });
  textarea.focus();
});

avatarButton.addEventListener("click", () => navigate("profile"));
notificationButton.addEventListener("click", openNotifications);
notificationClose.addEventListener("click", closeNotifications);
shareClose.addEventListener("click", closeShareDialog);
shareModal.addEventListener("click", (event) => {
  if (event.target === shareModal) closeShareDialog();
});

shareCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareInput.value);
    await trackShareIntent("copy");
    shareMessage.textContent = "Link copied.";
  } catch (error) {
    shareInput.focus();
    shareInput.select();
    shareMessage.textContent = "Select the link and copy it.";
  }
});

shareNative.addEventListener("click", async () => {
  const text = shareSummary.textContent;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Quash", text, url: shareInput.value });
      await trackShareIntent("native");
      shareMessage.textContent = "Shared.";
    } catch (error) {
      shareMessage.textContent = "Share was cancelled.";
    }
  } else {
    shareMessage.textContent = "Native share is not available in this browser.";
  }
});

sharePlatformLinks.forEach((link) => {
  link.addEventListener("click", () => {
    trackShareIntent("platform");
  });
});

async function trackShareIntent(method) {
  if (!shareContext || shareContext.alreadyShared) {
    return;
  }

  if (shareContext.isDemo) {
    shareContext.alreadyShared = true;
    const currentCount = shareContext.button.querySelector(".reel-action-count, span")?.textContent || "0";
    setActionButtonState(shareContext.button, "Shared", currentCount, true);
    return;
  }

  try {
    const data = await requestApi(`/api/posts/${shareContext.postId}/share`, {
      method: "POST",
      body: JSON.stringify({ method })
    });
    shareContext.alreadyShared = true;
    setActionButtonState(shareContext.button, "Shared", compactNumber(data.shareCount), true);
    refreshNotifications();
  } catch (error) {
    shareMessage.textContent = "Could not track share. Try again.";
  }
}

function runSearch() {
  const query = searchInput.value.trim();
  if (query) {
    renderSearch(query);
    history.replaceState(null, "", `#search-${encodeURIComponent(query)}`);
  }
}

searchButton.addEventListener("click", runSearch);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runSearch();
  }
});

async function bootstrapApp() {
  hydrateLocalUploadedPosts();
  consumeOauthSessionFromHash();

  const storedUser = currentUser();
  const storedToken = currentToken();
  if (storedUser && storedToken) {
    setAuthLocked(true);
  } else {
    clearSession();
    applyGuest();
  }

  await syncSession();

  if (!currentUser() || !currentToken()) {
    setAuthLocked(true);
    return;
  }

  await migrateLocalUploadedPostsToServer();

  if (await renderRouteFromHash()) return;
  await renderFeed();
  history.replaceState(null, "", "#feed");
}

async function renderRouteFromHash() {
  if (!currentUser() || !currentToken()) {
    setAuthLocked(true);
    return true;
  }
  const initialRoute = window.location.hash.replace("#", "");
  if (initialRoute.startsWith("topic-")) {
    await renderTopic(initialRoute.replace("topic-", ""));
    return true;
  }
  if (initialRoute.startsWith("user-")) {
    await renderPublicProfile(decodeURIComponent(initialRoute.replace("user-", "")));
    return true;
  }
  if (initialRoute.startsWith("search-")) {
    await renderSearch(decodeURIComponent(initialRoute.replace("search-", "")));
    return true;
  }
  if (initialRoute.startsWith("messages-")) {
    await renderMessages(decodeURIComponent(initialRoute.replace("messages-", "")));
    return true;
  }
  if (["feed", "trending", "reels", "communities", "groups", "messages", "profile"].includes(initialRoute)) {
    await navigate(initialRoute);
    return true;
  }
  return false;
}

window.addEventListener("hashchange", () => {
  renderRouteFromHash();
});

bootstrapApp();
