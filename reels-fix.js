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

  if (window.location.hash === "#reels") {
    window.setTimeout(renderVerticalReels, 0);
  }
})();
