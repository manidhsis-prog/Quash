(() => {
  const SAVED_REELS_KEY = "quashSavedReels";

  function readSavedReels() {
    const user = currentUser?.();
    const key = `${SAVED_REELS_KEY}:${user?.id || "guest"}`;
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return { key, saved: new Set(Array.isArray(value) ? value.map(String) : []) };
    } catch (error) {
      return { key, saved: new Set() };
    }
  }

  function isSaved(postId) {
    return readSavedReels().saved.has(String(postId));
  }

  function toggleSaved(postId) {
    const { key, saved } = readSavedReels();
    const id = String(postId);
    if (saved.has(id)) {
      saved.delete(id);
    } else {
      saved.add(id);
    }
    localStorage.setItem(key, JSON.stringify([...saved]));
    return saved.has(id);
  }

  function reelMedia(post) {
    if (!post.mediaUrl) {
      return `<div class="reel-text-backdrop"><span>Quash Reel</span></div>`;
    }
    const mediaUrl = escapeHtml(post.mediaUrl);
    const isVideo = ["Video", "Reel"].includes(post.postType) || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(post.mediaUrl);
    if (isVideo) {
      return `<video class="reel-media" src="${mediaUrl}" controls muted loop playsinline preload="metadata"></video>`;
    }
    return `<img class="reel-media" src="${mediaUrl}" alt="">`;
  }

  function reelIcon(action) {
    const icons = {
      like: `<svg viewBox="0 0 24 24" focusable="false"><path d="M20.8 4.6c-1.7-1.7-4.4-1.7-6.1 0L12 7.3 9.3 4.6c-1.7-1.7-4.4-1.7-6.1 0s-1.7 4.5 0 6.2L12 19.6l8.8-8.8c1.7-1.7 1.7-4.5 0-6.2Z"></path></svg>`,
      "toggle-comments": `<svg viewBox="0 0 24 24" focusable="false"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.8 9.8 0 0 1-4.1-.9L3 20l1.2-4.2a8.1 8.1 0 0 1-1-4.3 8.4 8.4 0 0 1 9-8.4 8.5 8.5 0 0 1 8.8 8.4Z"></path></svg>`,
      share: `<svg viewBox="0 0 24 24" focusable="false"><path d="M22 3 10.5 14.5"></path><path d="m22 3-7 19-4.5-7.5L3 10l19-7Z"></path></svg>`,
      "save-reel": `<svg viewBox="0 0 24 24" focusable="false"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"></path></svg>`
    };
    return icons[action] || "";
  }

  function reelAction({ action, postId, label, count, active = false }) {
    return `
      <button class="reel-action ${active ? "is-active" : ""}" type="button" data-action="${action}" data-post-id="${escapeHtml(postId)}">
        <span class="reel-action-icon" aria-hidden="true">${reelIcon(action)}</span>
        <span class="reel-action-label">${escapeHtml(label)}</span>
        ${count !== undefined ? `<span>${escapeHtml(count)}</span>` : ""}
      </button>
    `;
  }

  function reelCard(post) {
    const saved = isSaved(post.id);
    const canFollow = currentUser?.()?.id !== post.author.id;
    const followLabel = post.author.following ? "Following" : "Follow";
    return `
      <article class="reel-card-vertical post-card" id="post-${escapeHtml(post.id)}" data-post-id="${escapeHtml(post.id)}" ${post.isDemo ? "data-demo='true'" : ""}>
        <div class="reel-hidden-meta post-author">
          <h3>${escapeHtml(post.author.fullName)}</h3>
        </div>
        <div class="reel-phone-frame">
          <div class="reel-stage">
            ${reelMedia(post)}
            <div class="reel-shadow"></div>
            <div class="reel-caption-panel">
              <div class="reel-author-row">
                <button class="reel-author-button" type="button" data-action="open-profile" data-user-id="${escapeHtml(post.author.id)}" aria-label="Open ${escapeHtml(post.author.fullName)} profile">
                  <img src="${escapeHtml(avatarUrlFor(post.author))}" alt="">
                  <span>
                    <strong>${escapeHtml(post.author.fullName)}</strong>
                    <small>@${escapeHtml(post.author.username)} · ${timeAgo(post.createdAt)}</small>
                  </span>
                </button>
                ${canFollow ? `<button class="reel-follow-button" type="button" data-action="follow-user" data-user-id="${escapeHtml(post.author.id)}">${followLabel}</button>` : ""}
              </div>
              <p class="reel-caption-text post-text">${escapeHtml(post.body)}</p>
            </div>
            <div class="reel-actions-rail" aria-label="Reel actions">
              ${reelAction({ action: "like", postId: post.id, label: post.likedByMe ? "Liked" : "Like", count: compactNumber(post.likeCount), active: post.likedByMe })}
              ${reelAction({ action: "toggle-comments", postId: post.id, label: "Comment", count: compactNumber(post.commentCount || (post.comments || []).length) })}
              ${reelAction({ action: "share", postId: post.id, label: post.sharedByMe ? "Shared" : "Share", count: compactNumber(post.shareCount), active: post.sharedByMe })}
              ${reelAction({ action: "save-reel", postId: post.id, label: saved ? "Saved" : "Save", active: saved })}
            </div>
          </div>
          ${commentsMarkup(post)}
        </div>
      </article>
    `;
  }

  async function renderVerticalReels() {
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

  function renderVerticalReelsSoon() {
    if (window.location.hash !== "#reels") return;
    window.setTimeout(renderVerticalReels, 0);
    window.setTimeout(renderVerticalReels, 80);
    window.setTimeout(renderVerticalReels, 250);
  }

  window.renderReels = renderVerticalReels;
  try {
    renderReels = renderVerticalReels;
  } catch (error) {
    // Older browser bindings can ignore direct global reassignment.
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='save-reel']");
    if (!button) return;
    if (!currentUser?.() || !currentToken?.()) {
      openAuth("signup");
      return;
    }
    const saved = toggleSaved(button.dataset.postId);
    button.classList.toggle("is-active", saved);
    const label = button.querySelector(".reel-action-label");
    if (label) label.textContent = saved ? "Saved" : "Save";
  });

  document.addEventListener("click", (event) => {
    const routeTarget = event.target.closest("a[href='#reels'], [data-route='reels']");
    if (routeTarget) renderVerticalReelsSoon();
  });

  window.addEventListener("hashchange", renderVerticalReelsSoon);
  renderVerticalReelsSoon();
})();

(() => {
  const SHORT_REEL_MAX_SECONDS = 90;
  const VIDEO_FILE_RE = /\.(mp4|webm|ogg|ogv|mov)(\?|$)/i;
  const originalLoadPosts = loadPosts;
  const originalCreatePost = createPost;

  function selectedComposerMode() {
    return document.querySelector(".tool-button.selected")?.dataset.mode || "Text";
  }

  function isFiniteDuration(value) {
    return Number.isFinite(value) && value > 0;
  }

  function secondsLabel(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return minutes ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
  }

  function readVideoDuration(file, objectUrl) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const source = objectUrl || URL.createObjectURL(file);
      const shouldRevoke = !objectUrl;
      let settled = false;

      const done = (callback, value) => {
        if (settled) return;
        settled = true;
        video.removeAttribute("src");
        video.load();
        if (shouldRevoke) URL.revokeObjectURL(source);
        callback(value);
      };

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.addEventListener("loadedmetadata", () => {
        done(resolve, Number(video.duration || 0));
      });
      video.addEventListener("error", () => {
        done(reject, new Error("Could not read video length. Try another video file."));
      });
      window.setTimeout(() => {
        done(reject, new Error("Could not read video length. Try another video file."));
      }, 6000);
      video.src = source;
    });
  }

  async function ensureComposerVideoDuration() {
    if (!uploadedComposerMedia?.file || uploadedComposerMedia.kind !== "video") return null;
    if (isFiniteDuration(uploadedComposerMedia.durationSeconds)) {
      return uploadedComposerMedia.durationSeconds;
    }

    const duration = await readVideoDuration(uploadedComposerMedia.file, uploadedComposerMedia.url);
    uploadedComposerMedia.durationSeconds = duration;
    return duration;
  }

  function finalPostTypeForUpload(selectedMode, durationSeconds) {
    if (uploadedComposerMedia?.kind === "video" && isFiniteDuration(durationSeconds)) {
      return durationSeconds <= SHORT_REEL_MAX_SECONDS ? "Reel" : selectedMode;
    }
    return selectedMode;
  }

  async function updateShortVideoHint() {
    if (!uploadedComposerMedia?.file || uploadedComposerMedia.kind !== "video") return;
    try {
      const duration = await ensureComposerVideoDuration();
      if (!isFiniteDuration(duration)) return;

      if (duration <= SHORT_REEL_MAX_SECONDS) {
        if (mediaHint) {
          mediaHint.textContent = `${secondsLabel(duration)} video selected. It will publish as a Reel and also appear in the home feed.`;
        }
        setComposerMode("Reel");
      } else if (selectedComposerMode() === "Reel") {
        if (mediaHint) {
          mediaHint.textContent = `This video is ${secondsLabel(duration)}. Reels can be 1:30 max, so choose Video or trim it.`;
        }
      } else if (mediaHint) {
        mediaHint.textContent = `${secondsLabel(duration)} video selected. It will publish as a regular feed video.`;
      }
    } catch (error) {
      if (mediaHint) mediaHint.textContent = error.message;
    }
  }

  window.isReelPost = function isReelPostWithShortVideoRule(post) {
    if (post?.postType === "Reel" || post?.reel || post?.isReel) return true;
    if (isFiniteDuration(Number(post?.durationSeconds))) {
      return Number(post.durationSeconds) <= SHORT_REEL_MAX_SECONDS && VIDEO_FILE_RE.test(post.mediaUrl || "");
    }
    return false;
  };
  try {
    isReelPost = window.isReelPost;
  } catch (error) {
    // Some browser bindings ignore direct reassignment.
  }

  function algorithmScore(post, surface) {
    const nowSeconds = Date.now() / 1000;
    const ageHours = Math.max(0, (nowSeconds - Number(post.createdAt || 0)) / 3600);
    const likes = Number(post.likeCount || 0);
    const comments = Number(post.commentCount || (post.comments || []).length || 0);
    const shares = Number(post.shareCount || 0);
    const engagement = Math.log1p(likes) * 8 + Math.log1p(comments) * 14 + Math.log1p(shares) * 18;
    const freshness = 90 / Math.pow(ageHours + 2, 0.82);
    const reelBoost = window.isReelPost(post) ? (surface === "reels" ? 36 : 10) : 0;
    const ownPostBoost = String(post.author?.id || "") === String(currentUser()?.id || "") ? 18 : 0;
    const demoPenalty = post.isDemo && !post.localPersistent ? -8 : 0;
    return engagement + freshness + reelBoost + ownPostBoost + demoPenalty;
  }

  function rankPosts(posts, surface = "feed") {
    return [...posts].sort((a, b) => {
      const scoreDelta = algorithmScore(b, surface) - algorithmScore(a, surface);
      if (Math.abs(scoreDelta) > 0.001) return scoreDelta;
      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    });
  }

  window.quashRankPosts = rankPosts;
  window.loadPosts = async function loadPostsWithAlgorithm(params = "") {
    const surface = window.location.hash === "#reels" ? "reels" : "feed";
    const posts = await originalLoadPosts(params);
    return rankPosts(posts, surface);
  };
  try {
    loadPosts = window.loadPosts;
  } catch (error) {
    // Some browser bindings ignore direct reassignment.
  }

  async function createPostWithShortVideoRules() {
    if (!requireUser()) return;
    const selectedMode = selectedComposerMode();
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
      let finalPostType = selectedMode;
      let durationSeconds = null;

      if (hasUpload && uploadedComposerMedia.kind === "video") {
        postButton.textContent = "Reading video...";
        durationSeconds = await ensureComposerVideoDuration();
        if (selectedMode === "Reel" && durationSeconds > SHORT_REEL_MAX_SECONDS) {
          throw new Error("Reels can be 1:30 max. Trim this video or choose Video.");
        }
        finalPostType = finalPostTypeForUpload(selectedMode, durationSeconds);
      }

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
        body: JSON.stringify({
          postType: finalPostType,
          body: message,
          mediaUrl: finalMediaUrl,
          durationSeconds: isFiniteDuration(durationSeconds) ? Math.round(durationSeconds) : undefined
        })
      });

      if (hasUpload) {
        localStorage.removeItem(LOCAL_UPLOADED_POSTS_KEY);
      }
      textarea.value = "";
      mediaUrlInput.value = "";
      clearComposerUpload();
      postButton.textContent = finalPostType === "Reel" ? "Reel posted" : "Notified";
      await renderFeed();
    } catch (error) {
      postButton.textContent = error.message;
    }
    window.setTimeout(() => {
      postButton.textContent = "Notify";
    }, 1800);
  }

  if (postButton) {
    postButton.removeEventListener("click", originalCreatePost);
    window.createPost = createPostWithShortVideoRules;
    try {
      createPost = createPostWithShortVideoRules;
    } catch (error) {
      // Some browser bindings ignore direct reassignment.
    }
    postButton.addEventListener("click", createPostWithShortVideoRules);
  }

  if (mediaPickerInput) {
    mediaPickerInput.addEventListener("change", () => {
      window.setTimeout(updateShortVideoHint, 0);
    });
  }
})();
