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
const authTabs = document.querySelectorAll(".auth-tab");
const authPanels = document.querySelectorAll("[data-auth-panel]");
const authMessage = document.querySelector(".auth-message");
const signupForm = document.querySelector(".signup-form");
const loginForm = document.querySelector(".login-form");
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
const CUSTOM_COMMUNITIES_KEY = "quashCustomCommunities";
const CUSTOM_GROUPS_KEY = "quashCustomGroups";
const JOINED_COMMUNITIES_KEY = "quashJoinedCommunities";
const JOINED_GROUPS_KEY = "quashJoinedGroups";
let shareContext = null;
let uploadedComposerMedia = null;

const tickerUpdates = [
  "Fashion Week street looks are rising across global style circles",
  "Community reporters are sharing verified local weather alerts",
  "Short explainers are trending in technology and public policy",
  "Creators are forming groups around daily briefings and style drops"
];

const demoPosts = [
  {
    id: "demo-news",
    isDemo: true,
    postType: "News",
    body: "City climate teams are testing faster public alert routes for heat waves, floods, and transit delays. Local groups can now push verified updates. #LocalAlerts",
    mediaUrl: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80",
    createdAt: Date.now() / 1000 - 480,
    likeCount: 12400,
    commentCount: 3,
    shareCount: 840,
    likedByMe: false,
    comments: [
      { body: "This would help local communities move faster.", createdAt: Date.now() / 1000 - 180, author: { fullName: "Dev Rao", username: "devtoday", avatarUrl: "" } }
    ],
    author: { id: "demo-mira", fullName: "Mira Shah", username: "miradaily", avatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=120&q=80", following: false }
  },
  {
    id: "demo-reel",
    isDemo: true,
    postType: "Reel",
    body: "Three streetwear details showing up everywhere today: utility pockets, silver accents, and clean oversized tailoring. #NewSeasonStyle",
    mediaUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
    createdAt: Date.now() / 1000 - 1080,
    likeCount: 8600,
    commentCount: 5,
    shareCount: 430,
    likedByMe: false,
    comments: [],
    author: { id: "demo-arya", fullName: "Arya Lane", username: "aryastyle", avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80", following: false }
  }
];

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
    openAuth("signup");
    return null;
  }
  return user;
}

function openAuth(tabName = "signup") {
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read media file."));
    reader.readAsDataURL(file);
  });
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

async function uploadComposerMedia(file) {
  const formData = new FormData();
  formData.append("media", file, file.name || "upload");
  return requestApi("/api/media-upload", {
    method: "POST",
    body: formData
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
  refreshNotifications();
}

function applyGuest() {
  authOpenButton.classList.remove("profile-avatar-link");
  loginOpenButton.classList.remove("top-auth-hidden");
  authOpenButton.textContent = "Create account";
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

function demoProfileFor(userId) {
  const profilePosts = demoPosts.filter((post) => String(post.author?.id) === String(userId));
  const author = profilePosts[0]?.author;
  if (!author) return null;
  const followers = String(userId) === "demo-mira" ? 12800 : 9300;
  return {
    user: {
      ...author,
      bio: `${author.fullName} shares public updates, trends, and visual stories on Quash.`,
      followers,
      following: Boolean(author.following)
    },
    posts: profilePosts,
    activity: [
      {
        label: "Profile active",
        detail: `@${author.username} is sharing updates on Quash.`,
        createdAt: profilePosts[0]?.createdAt || Date.now() / 1000
      }
    ],
    stats: {
      posts: profilePosts.length,
      followers,
      following: String(userId) === "demo-mira" ? 84 : 61
    }
  };
}

function applyUser(user) {
  if (!user) return;
  const avatarUrl = avatarUrlFor(user);
  avatarImages.forEach((image) => {
    image.src = avatarUrl;
  });
  profileCard.querySelector("h2").textContent = user.fullName;
  profileCard.querySelector("p").textContent = user.bio || `@${user.username} is ready to share news, thoughts, reels, and community updates on Quash.`;
  authOpenButton.classList.add("profile-avatar-link");
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

async function loadPosts(params = "") {
  try {
    const data = await requestApi(`/api/posts${params}`);
    return [...data.posts, ...demoPosts].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  } catch (error) {
    return [...demoPosts].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
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
      <div class="page-grid single">${posts.map(postCard).join("")}</div>
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
          <p class="eyebrow dark">Reels page</p>
          <h1>Watch what creators are sharing now</h1>
          <p>Short videos, reel updates, and visual stories from people across Quash.</p>
        </div>
        <button class="page-action" type="button" data-action="compose-reel">Create reel</button>
      </div>
      <div class="page-grid single">
        ${reels.length ? reels.map(postCard).join("") : `<div class="empty-state compact"><p>No reels yet. Create the first reel update.</p></div>`}
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
    data.posts = demoPosts.filter((post) => post.body.toLowerCase().includes(trend.tag.toLowerCase()));
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

  let data = demoProfileFor(activeProfileId);
  if (!data) {
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
  }

  const profileUser = data.user || {};
  const posts = [...(data.posts || [])].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const stats = data.stats || { posts: posts.length, followers: profileUser.followers || 0, following: 0 };
  const canFollow = String(signedInUser?.id || "") !== String(profileUser.id || "");
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
        ${canFollow ? `<button class="page-action profile-follow-action" type="button" data-action="follow-user" data-user-id="${escapeHtml(profileUser.id)}">${followLabel}</button>` : ""}
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

async function renderSearch(query) {
  if (!query) return;
  let data = { users: [], posts: [] };
  try {
    data = await requestApi(`/api/search?q=${encodeURIComponent(query)}`);
  } catch (error) {
    data.posts = demoPosts.filter((post) => post.body.toLowerCase().includes(query.toLowerCase()));
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
                      <button type="button" data-action="follow-user" data-user-id="${escapeHtml(user.id)}">${user.following ? "Following" : "Follow"}</button>
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
  } else if (activeRoute === "feed") {
    await renderFeed();
  } else if (activeTopic) {
    await renderTopic(activeTopic);
  }
}

async function navigate(route) {
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
      postButton.textContent = "Uploading...";
      const uploaded = await uploadComposerMedia(uploadedComposerMedia.file);
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
  openAuth("signup");
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

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  showAuthMessage("Creating account...");
  try {
    const data = await requestApi("/api/register", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData))
    });
    saveSession(data);
    showAuthMessage("Account created. You are logged in.", "success");
    signupForm.reset();
    window.setTimeout(() => {
      closeAuth();
      renderProfile();
    }, 700);
  } catch (error) {
    showAuthMessage(error.message, "error");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  showAuthMessage("Signing in...");
  try {
    const data = await requestApi("/api/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData))
    });
    saveSession(data);
    showAuthMessage("Signed in.", "success");
    loginForm.reset();
    window.setTimeout(() => {
      closeAuth();
      renderProfile();
    }, 700);
  } catch (error) {
    showAuthMessage(error.message, "error");
  }
});

document.addEventListener("submit", async (event) => {
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
    if (["feed", "trending", "reels", "communities", "groups", "profile"].includes(route)) {
      event.preventDefault();
      await navigate(route);
      history.replaceState(null, "", `#${route}`);
      return;
    }
  }

  const actionTarget = event.target.closest("[data-action]");
  const action = actionTarget?.dataset.action;
  if (!action) return;

  if (action === "open-profile") {
    const userId = actionTarget.dataset.userId;
    if (!userId) return;
    activeTopic = "";
    await renderPublicProfile(userId);
    const signedInUser = currentUser();
    history.replaceState(null, "", signedInUser && String(signedInUser.id) === String(userId) ? "#profile" : profileHashFor(userId));
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
    actionTarget.closest(".post-card").querySelector(".comment-section").classList.toggle("open");
    return;
  }
  if (action === "like") {
    if (!requireUser()) return;
    const card = actionTarget.closest(".post-card");
    if (card.dataset.demo === "true") {
      actionTarget.textContent = "Liked";
      return;
    }
    const data = await requestApi(`/api/posts/${actionTarget.dataset.postId}/like`, { method: "POST", body: "{}" });
    actionTarget.innerHTML = `${data.liked ? "Liked" : "Like"} <span>${compactNumber(data.likeCount)}</span>`;
    refreshNotifications();
    return;
  }
  if (action === "share") {
    if (!requireUser()) return;
    const card = actionTarget.closest(".post-card");
    const postText = card.querySelector(".post-text")?.textContent.trim() || "Quash update";
    const shareTitle = card.querySelector(".post-author h3")?.textContent.trim() || "Quash";
    const postId = actionTarget.dataset.postId;
    const alreadyShared = actionTarget.textContent.trim().toLowerCase().startsWith("shared");
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
  if (action === "follow-user") {
    if (!requireUser()) return;
    const userId = actionTarget.dataset.userId;
    if (String(userId).startsWith("demo")) {
      actionTarget.textContent = actionTarget.textContent === "Following" ? "Follow" : "Following";
      return;
    }
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
    const currentCount = shareContext.button.querySelector("span")?.textContent || "0";
    shareContext.button.innerHTML = `Shared <span>${currentCount}</span>`;
    return;
  }

  try {
    const data = await requestApi(`/api/posts/${shareContext.postId}/share`, {
      method: "POST",
      body: JSON.stringify({ method })
    });
    shareContext.alreadyShared = true;
    shareContext.button.innerHTML = `Shared <span>${compactNumber(data.shareCount)}</span>`;
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

  const storedUser = currentUser();
  const storedToken = currentToken();
  if (storedUser && storedToken) {
    applyUser(storedUser);
  } else {
    clearSession();
    applyGuest();
  }

  await syncSession();
  await migrateLocalUploadedPostsToServer();

  if (await renderRouteFromHash()) return;
  setActiveRoute("feed");
}

async function renderRouteFromHash() {
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
  if (["feed", "trending", "reels", "communities", "groups", "profile"].includes(initialRoute)) {
    await navigate(initialRoute);
    return true;
  }
  return false;
}

window.addEventListener("hashchange", () => {
  renderRouteFromHash();
});

bootstrapApp();
