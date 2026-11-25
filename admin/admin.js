/* =========================================================
   JIMIN IM — 작품 관리자
   GitHub Contents API 로 data/works.json · 사진 · 필모그래피를 직접 커밋
   ========================================================= */
(function () {
  "use strict";

  var OWNER = "jimin-storylog";
  var REPO = "jimin-storylog.github.io";
  var API = "https://api.github.com/repos/" + OWNER + "/" + REPO;
  var SITE = "https://jimin-storylog.github.io/";
  var TOKEN_KEY = "jiminAdminToken";
  var MAX_SIDE = 1600;
  var QUALITY = 0.85;

  var CATS = { still: "스틸", performance: "공연", behind: "비하인드", documentary: "다큐" };

  /* 방송사·플랫폼 — 자주 쓰는 것만 목록에 두고, 나머지는 직접 입력 */
  var NETWORKS = [
    "SBS", "KBS", "MBC", "tvN", "JTBC", "ENA", "OCN",
    "Netflix", "Disney+", "TVING", "Coupang Play"
  ];
  var NETWORK_CUSTOM = "__custom";

  var ICONS = {
    up: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 14l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 10l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };


  var state = {
    mode: "preview",
    token: "",
    login: "",
    works: [],
    worksSha: null,
    filmography: null,
    filmographySha: null,
    dirtyWorks: false,
    dirtyFilmo: false,
    editing: null,
    editingIndex: null,
    busy: false,
    view: "works",
    listFilter: "all",   /* all | ready | empty — 사진 등록 상태로 거르기 */
    query: ""            /* 제목 검색어 */
  };

  var ids = [
    "loginView", "appView", "loginForm", "tokenInput", "loginBtn", "loginMsg", "previewBtn", "logoutBtn",
    "connState", "workCount", "workList", "worksEmpty", "worksEmptyText", "addWorkBtn", "worksHint",
    "filterAll", "filterReady", "filterEmpty", "countAll", "countReady", "countEmpty", "workSearch",
    "photoWait",
    "tabWorks", "tabFilmo", "worksView", "filmographyView", "filmoCats",
    "editorView", "editorTitle", "editorBack", "deleteWorkBtn", "coverPreview", "coverInput",
    "fYear", "fCategory", "fTitle", "fContribution", "fNetwork", "fNetworkCustom", "photoCount", "photosInput", "photoList",
    "photosEmpty", "editorDone", "editorCancel", "editorMsg",
    "saveBar", "saveBtn", "saveState", "toast", "doneBox", "doneClose"
  ];

  var dom = {};
  ids.forEach(function (id) {
    dom[id] = document.getElementById(id);
  });

  /* ---------- 작은 도구들 ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function slugId(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "work";
  }

  function encodePath(path) {
    return String(path).split("/").map(encodeURIComponent).join("/");
  }

  function assetUrl(src) {
    if (!src) return "";
    if (/^(blob:|data:|https?:)/i.test(src)) return src;
    return "../" + String(src).replace(/^\.?\//, "");
  }

  function photoUrl(photo) {
    if (!photo) return "";
    return photo.preview || assetUrl(photo.src);
  }

  function coverOf(work) {
    if (!work) return null;
    var found = work.photos.filter(function (photo) {
      return photo.key === work.coverKey;
    })[0];
    return found || work.photos[0] || null;
  }

  var toastTimer = null;

  function toast(message, kind) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.className = "toast is-on" + (kind ? " is-" + kind : "");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      dom.toast.className = "toast";
    }, kind === "error" ? 8000 : 4500);
  }

  function setLoginMsg(message, isError) {
    dom.loginMsg.textContent = message || "";
    dom.loginMsg.className = "msg" + (isError ? " is-error" : "");
  }

  function setEditorMsg(message, isError) {
    dom.editorMsg.textContent = message || "";
    dom.editorMsg.className = "msg" + (isError ? " is-error" : "");
  }

  function setConn(text, kind) {
    dom.connState.textContent = text;
    dom.connState.className = "conn" + (kind ? " is-" + kind : "");
  }

  function setSaveState(text) {
    dom.saveState.textContent = text;
  }

  function updateSaveBar() {
    if (state.busy) {
      dom.saveBar.hidden = false;
      dom.saveBar.classList.add("is-busy");
      dom.saveBtn.disabled = true;
      return;
    }

    dom.saveBar.classList.remove("is-busy");

    var dirty = state.dirtyWorks || state.dirtyFilmo;
    var inEditor = !dom.editorView.hidden;

    if (!dirty || inEditor) {
      dom.saveBar.hidden = true;
      return;
    }

    dom.saveBar.hidden = false;
    dom.saveBtn.disabled = false;

    if (state.mode !== "github") {
      setSaveState("미리보기 모드 — 토큰으로 로그인하면 저장할 수 있습니다");
      return;
    }

    if (state.dirtyWorks && state.dirtyFilmo) setSaveState("작품 · 필모그래피 변경 사항이 있습니다");
    else if (state.dirtyWorks) setSaveState("작품 변경 사항이 있습니다");
    else setSaveState("필모그래피 변경 사항이 있습니다");
  }

  function markDirty(kind) {
    if (kind === "works") state.dirtyWorks = true;
    if (kind === "filmo") state.dirtyFilmo = true;
    updateSaveBar();
  }

  /* ---------- 날짜/숫자 ---------- */
  function nowYear() {
    return String(new Date().getFullYear());
  }

  /* ---------- 화면 전환 ---------- */
  function showLogin() {
    dom.loginView.hidden = false;
    dom.appView.hidden = true;
    dom.saveBar.hidden = true;
    dom.logoutBtn.hidden = true;
  }

  function showApp() {
    dom.loginView.hidden = true;
    dom.appView.hidden = false;
    dom.logoutBtn.hidden = state.mode !== "github";
    if (state.mode === "github") {
      dom.worksHint.textContent = "사진이 없는 작품은 공개 사이트에 나오지 않습니다.";
    }
  }

  function setView(view) {
    state.view = view;

    var isWorks = view === "works";

    dom.tabWorks.classList.toggle("is-active", isWorks);
    dom.tabFilmo.classList.toggle("is-active", !isWorks);
    dom.tabWorks.setAttribute("aria-selected", isWorks ? "true" : "false");
    dom.tabFilmo.setAttribute("aria-selected", isWorks ? "false" : "true");

    if (dom.editorView.hidden) {
      dom.worksView.hidden = !isWorks;
      dom.filmographyView.hidden = isWorks;
    }

    updateSaveBar();
  }

  /* ---------- Base64 ---------- */
  function utf8ToBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = "";
    var chunk = 0x8000;

    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }

    return btoa(binary);
  }

  function base64ToUtf8(base64) {
    var binary = atob(String(base64).replace(/\s/g, ""));
    var bytes = new Uint8Array(binary.length);

    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new TextDecoder().decode(bytes);
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        resolve(result.slice(result.indexOf(",") + 1));
      };
      reader.onerror = function () {
        reject(new Error("사진을 읽지 못했습니다."));
      };
      reader.readAsDataURL(blob);
    });
  }

  /* ---------- GitHub API ---------- */
  function describeError(error) {
    if (!error) return "알 수 없는 문제가 생겼습니다.";
    if (error.status === 401) return "토큰이 만료되었거나 올바르지 않습니다. 로그아웃 후 다시 로그인해 주세요.";
    if (error.status === 403) return "이 저장소에 쓸 권한이 없습니다. 토큰에 repo 권한이 있는지 확인해 주세요.";
    if (error.status === 404) return "GitHub에서 파일을 찾지 못했습니다. (저장소 이름이나 권한을 확인해 주세요.)";
    if (error.status === 422) return "GitHub가 저장을 거절했습니다. 같은 이름의 사진이 이미 있는지 확인해 주세요.";
    if (error.status >= 500) return "GitHub 서버가 잠시 응답하지 않습니다. 잠시 뒤 다시 시도해 주세요.";
    return error.message || "알 수 없는 문제가 생겼습니다.";
  }

  function ghFetch(path, options) {
    options = options || {};

    var headers = {
      Authorization: "Bearer " + state.token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    if (options.body) headers["Content-Type"] = "application/json";

    return fetch(API + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body
    }).then(function (response) {
      return response.text().then(function (text) {
        var body = null;

        if (text) {
          try {
            body = JSON.parse(text);
          } catch (error) {
            body = { message: text };
          }
        }

        if (!response.ok) {
          var error = new Error((body && body.message) || "HTTP " + response.status);
          error.status = response.status;
          error.body = body;
          throw error;
        }

        return body;
      });
    });
  }

  function apiGetFile(path) {
    return ghFetch("/contents/" + encodePath(path) + "?ref=main").then(function (body) {
      if (!body || !body.content) throw new Error("파일 내용이 비어 있습니다.");
      return { text: base64ToUtf8(body.content), sha: body.sha };
    });
  }

  function putFile(path, contentBase64, message, sha) {
    function send(knownSha) {
      var body = { message: message, content: contentBase64, branch: "main" };
      if (knownSha) body.sha = knownSha;

      return ghFetch("/contents/" + encodePath(path), {
        method: "PUT",
        body: JSON.stringify(body)
      });
    }

    return send(sha).catch(function (error) {
      /* 다른 곳에서 먼저 저장해 sha 가 바뀐 경우 한 번만 다시 시도 */
      if ((error.status === 409 || error.status === 422) && sha) {
        return apiGetFile(path).then(function (fresh) {
          return send(fresh.sha);
        });
      }
      throw error;
    });
  }

  function putJson(path, data, sha, message) {
    return putFile(path, utf8ToBase64(JSON.stringify(data, null, 2) + "\n"), message, sha);
  }

  /* ---------- 로그인 ---------- */
  function signIn(token) {
    setLoginMsg("확인 중…");
    dom.loginBtn.disabled = true;

    fetch("https://api.github.com/user", {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json"
      }
    }).then(function (response) {
      if (response.status === 401) throw new Error("토큰이 올바르지 않거나 만료되었습니다. 새로 만들어 주세요.");
      if (!response.ok) throw new Error("GitHub 확인에 실패했습니다. (HTTP " + response.status + ")");

      var scopes = response.headers.get("x-oauth-scopes") || "";

      return response.json().then(function (user) {
        return { user: user, scopes: scopes };
      });
    }).then(function (result) {
      state.token = token;
      state.login = result.user.login;
      state.mode = "github";

      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch (error) {
        /* 저장이 막힌 브라우저에서는 이번 방문 동안만 사용한다 */
      }

      dom.tokenInput.value = "";
      setLoginMsg("");
      showApp();
      setConn("연결됨 · @" + state.login, "live");

      if (result.scopes && result.scopes.indexOf("repo") === -1 && result.scopes.indexOf("public_repo") === -1) {
        toast("토큰에 repo 권한이 없는 것 같습니다. 저장할 때 권한 오류가 날 수 있습니다.", "error");
      }

      return loadAll();
    }).catch(function (error) {
      state.token = "";
      state.mode = "preview";

      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch (e) {}

      showLogin();
      setLoginMsg(error.message, true);
    }).then(function () {
      dom.loginBtn.disabled = false;
    });
  }

  function signOut() {
    state.token = "";
    state.login = "";
    state.mode = "preview";
    state.works = [];
    state.filmography = null;
    state.worksSha = null;
    state.filmographySha = null;
    state.dirtyWorks = false;
    state.dirtyFilmo = false;

    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (error) {}

    showLogin();
    setLoginMsg("로그아웃했습니다.");
  }

  /* ---------- 데이터 불러오기 ---------- */
  function loadAll() {
    return Promise.all([loadWorksFile(), loadFilmographyFile()]);
  }

  function loadWorksFile() {
    return apiGetFile("data/works.json").then(function (file) {
      applyWorks(JSON.parse(file.text).works || [], file.sha);
    }).catch(function (error) {
      if (error.status === 404) {
        applyWorks([], null);
        return;
      }
      toast("작품 목록을 불러오지 못했습니다. " + describeError(error), "error");
      applyWorks([], null);
    });
  }

  function loadFilmographyFile() {
    return apiGetFile("data/filmography.json").then(function (file) {
      applyFilmography(JSON.parse(file.text), file.sha);
    }).catch(function (error) {
      if (error.status === 404) {
        applyFilmography(null, null);
        return;
      }
      toast("필모그래피를 불러오지 못했습니다. " + describeError(error), "error");
      applyFilmography(null, null);
    });
  }

  function loadPreviewData() {
    fetch("../data/works.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        applyWorks(data.works || [], null);
      })
      .catch(function () {
        applyWorks([], null);
        toast("미리 볼 작품 목록을 불러오지 못했습니다.", "error");
      });

    fetch("../data/filmography.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        applyFilmography(data, null);
      })
      .catch(function () {
        applyFilmography(null, null);
      });
  }

  function startPreview() {
    state.mode = "preview";
    state.token = "";
    showApp();
    setConn("미리보기 모드 · 저장 불가", "preview");
    dom.worksHint.textContent = "미리보기입니다. 저장하려면 토큰으로 로그인하세요.";
    loadPreviewData();
  }

  /* ---------- 작품 모델 ---------- */
  function applyWorks(list, sha) {
    state.worksSha = sha || null;
    state.works = (Array.isArray(list) ? list : []).map(normalizeWork);
    state.dirtyWorks = false;
    renderWorks();
    updateSaveBar();
  }

  function normalizeWork(raw) {
    raw = raw || {};

    var photos = (Array.isArray(raw.photos) ? raw.photos : []).map(function (photo) {
      return {
        key: uid(),
        src: photo && photo.src ? String(photo.src) : "",
        caption: photo && photo.caption ? String(photo.caption) : "",
        w: (photo && Number(photo.w)) || 0,
        h: (photo && Number(photo.h)) || 0,
        blob: null,
        preview: ""
      };
    }).filter(function (photo) {
      return photo.src;
    });

    var cover = raw.cover ? String(raw.cover) : "";
    var coverPhoto = photos.filter(function (photo) {
      return photo.src === cover;
    })[0];

    if (cover && !coverPhoto) {
      coverPhoto = { key: uid(), src: cover, caption: "", w: 0, h: 0, blob: null, preview: "" };
      photos.unshift(coverPhoto);
    }

    if (!coverPhoto && photos.length) coverPhoto = photos[0];

    return {
      id: raw.id ? String(raw.id) : "work-" + uid(),
      year: raw.year ? String(raw.year) : "",
      network: raw.network ? String(raw.network).trim() : "",
      title: raw.title ? String(raw.title) : "",
      contribution: raw.contribution ? String(raw.contribution) : "",
      category: CATS[raw.category] ? raw.category : "still",
      photos: photos,
      coverKey: coverPhoto ? coverPhoto.key : ""
    };
  }

  function blankWork() {
    return {
      id: "work-" + uid(),
      year: nowYear(),
      network: "",
      title: "",
      contribution: "",
      category: "still",
      photos: [],
      coverKey: ""
    };
  }

  function serializeWork(work) {
    var cover = coverOf(work);

    return {
      id: work.id,
      year: work.year,
      network: work.network || "",
      title: work.title,
      contribution: work.contribution,
      category: work.category,
      cover: cover ? cover.src : "",
      photos: work.photos.map(function (photo) {
        return {
          src: photo.src,
          caption: photo.caption || "",
          w: photo.w || 0,
          h: photo.h || 0
        };
      })
    };
  }

  /* ---------- 작품 목록 ---------- */
  function hasPhotos(work) {
    return !!(work && work.photos && work.photos.length);
  }

  function listFiltering() {
    return state.listFilter !== "all" || state.query.trim() !== "";
  }

  function matchesList(work) {
    if (state.listFilter === "ready" && !hasPhotos(work)) return false;
    if (state.listFilter === "empty" && hasPhotos(work)) return false;
    return matchesQuery(work);
  }

  function matchesQuery(work) {
    var q = state.query.trim().toLowerCase();
    if (!q) return true;

    var hay = [work.title, work.year, work.network, work.contribution]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    /* 띄어쓰기를 달리 적어도 찾히도록 공백을 지운 문자열도 함께 본다 */
    return hay.indexOf(q) !== -1 || hay.replace(/\s+/g, "").indexOf(q.replace(/\s+/g, "")) !== -1;
  }

  function renderWorkFilter() {
    var ready = 0;

    state.works.forEach(function (work) {
      if (hasPhotos(work)) ready += 1;
    });

    dom.countAll.textContent = String(state.works.length);
    dom.countReady.textContent = String(ready);
    dom.countEmpty.textContent = String(state.works.length - ready);

    [dom.filterAll, dom.filterReady, dom.filterEmpty].forEach(function (btn) {
      var on = btn.getAttribute("data-filter") === state.listFilter;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function renderWorks() {
    dom.workCount.textContent = String(state.works.length);
    renderWorkFilter();

    dom.workList.innerHTML = "";

    var locked = listFiltering();
    var shown = 0;

    state.works.forEach(function (work, index) {
      if (!matchesList(work)) return;
      dom.workList.appendChild(workRow(work, index, locked));
      shown += 1;
    });

    dom.worksEmpty.hidden = shown > 0;

    if (!shown) {
      dom.worksEmptyText.innerHTML = state.works.length
        ? "조건에 맞는 작품이 없습니다. 필터를 바꾸거나 검색어를 지워 보세요."
        : "아직 작품이 없습니다. <b>+ 새 작품</b>으로 첫 작품을 만들어 보세요.";
    }
  }

  function workRow(work, index, lockedOrder) {
    var row = el("li", "workrow" + (hasPhotos(work) ? "" : " is-waiting"));

    var thumb = el("div", "workrow__thumb");
    var cover = coverOf(work);

    if (cover && photoUrl(cover)) {
      var img = document.createElement("img");
      img.src = photoUrl(cover);
      img.alt = "";
      img.loading = "lazy";
      thumb.appendChild(img);
    } else {
      /* 사진을 아직 올리지 않은 작품 — 빈 썸네일 대신 자리를 잡아 둔다 */
      thumb.appendChild(el("span", "workrow__ph", "사진 대기"));
    }

    var body = el("div", "workrow__body");
    var meta = [work.year, work.network, CATS[work.category]].filter(Boolean).join(" · ");

    var metaEl = el("p", "workrow__meta", meta);
    if (!hasPhotos(work)) metaEl.appendChild(el("span", "badge", "사진 미등록"));
    body.appendChild(metaEl);

    body.appendChild(el("p", "workrow__title", work.title || "(제목 없음)"));

    var sub = work.contribution || "기여도 없음";
    sub += hasPhotos(work) ? " · 사진 " + work.photos.length + "장" : " · 사진 없음";
    body.appendChild(el("p", "workrow__sub", sub));

    var acts = el("div", "workrow__acts");

    var up = el("button", "iconbtn");
    up.innerHTML = ICONS.up;
    up.type = "button";
    up.title = lockedOrder ? "정렬은 전체 보기에서 바꿀 수 있습니다" : "위로";
    up.setAttribute("aria-label", work.title + " 위로 이동");
    up.disabled = lockedOrder || index === 0;
    up.addEventListener("click", function () {
      moveWork(index, -1);
    });

    var down = el("button", "iconbtn");
    down.innerHTML = ICONS.down;
    down.type = "button";
    down.title = lockedOrder ? "정렬은 전체 보기에서 바꿀 수 있습니다" : "아래로";
    down.setAttribute("aria-label", work.title + " 아래로 이동");
    down.disabled = lockedOrder || index === state.works.length - 1;
    down.addEventListener("click", function () {
      moveWork(index, 1);
    });

    var edit = el("button", "iconbtn");
    edit.innerHTML = ICONS.edit;
    edit.type = "button";
    edit.title = hasPhotos(work) ? "수정" : "사진 올리기 · 수정";
    edit.setAttribute("aria-label", work.title + " 수정");
    edit.addEventListener("click", function () {
      openEditor(index);
    });

    acts.appendChild(up);
    acts.appendChild(down);
    acts.appendChild(edit);

    /* 목록의 글자를 눌러도 편집 화면으로 — 70여 개 중 원하는 작품을 바로 연다 */
    [thumb, body].forEach(function (cell) {
      cell.classList.add("workrow__cell");
      cell.addEventListener("click", function () {
        openEditor(index);
      });
    });

    row.appendChild(thumb);
    row.appendChild(body);
    row.appendChild(acts);

    return row;
  }

  function moveWork(index, direction) {
    var target = index + direction;
    if (target < 0 || target >= state.works.length) return;

    var moved = state.works.splice(index, 1)[0];
    state.works.splice(target, 0, moved);

    markDirty("works");
    renderWorks();
  }

  /* ---------- 사진 처리 ---------- */
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();

      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("이 사진을 브라우저에서 열 수 없습니다. 아이폰 HEIC 사진이면 JPEG로 변환해 올려 주세요."));
      };

      img.src = url;
    });
  }

  function processImage(file) {
    if (!file || !/^image\//.test(file.type)) {
      return Promise.reject(new Error("이미지 파일만 올릴 수 있습니다."));
    }

    return loadImage(file).then(function (img) {
      var w0 = img.naturalWidth || img.width;
      var h0 = img.naturalHeight || img.height;

      if (!w0 || !h0) throw new Error("사진 크기를 읽지 못했습니다.");

      var scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
      var w = Math.max(1, Math.round(w0 * scale));
      var h = Math.max(1, Math.round(h0 * scale));

      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error("사진 변환에 실패했습니다."));
            return;
          }
          resolve({ blob: blob, w: w, h: h });
        }, "image/jpeg", QUALITY);
      });
    });
  }

  function addFiles(files, asCover) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length || !state.editing) return;

    var work = state.editing;
    var chain = Promise.resolve();

    list.forEach(function (file, i) {
      chain = chain.then(function () {
        setEditorMsg("사진 준비 중… " + (i + 1) + " / " + list.length);
        return processImage(file).then(function (result) {
          var photo = {
            key: uid(),
            src: "",
            caption: "",
            w: result.w,
            h: result.h,
            blob: result.blob,
            preview: URL.createObjectURL(result.blob)
          };

          if (asCover) {
            work.photos.unshift(photo);
            work.coverKey = photo.key;
          } else {
            work.photos.push(photo);
            if (!work.coverKey) work.coverKey = photo.key;
          }
        }).catch(function (error) {
          toast((file.name ? file.name + " — " : "") + error.message, "error");
        });
      });
    });

    chain.then(function () {
      setEditorMsg("");
      dom.coverInput.value = "";
      dom.photosInput.value = "";
      renderEditor();
    });
  }

  /* ---------- 편집 화면 ---------- */
  function openEditor(index) {
    state.editingIndex = index == null ? null : index;
    state.editing = index == null ? blankWork() : cloneWork(state.works[index]);

    dom.worksView.hidden = true;
    dom.filmographyView.hidden = true;
    dom.editorView.hidden = false;
    dom.editorTitle.textContent = index == null ? "새 작품" : "작품 편집";
    dom.deleteWorkBtn.hidden = index == null;

    dom.fYear.value = state.editing.year;
    dom.fCategory.value = state.editing.category;
    dom.fTitle.value = state.editing.title;
    dom.fContribution.value = state.editing.contribution;
    setNetworkField(state.editing.network);

    setEditorMsg("");
    renderEditor();
    updateSaveBar();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cloneWork(work) {
    return {
      id: work.id,
      year: work.year,
      network: work.network || "",
      title: work.title,
      contribution: work.contribution,
      category: work.category,
      coverKey: work.coverKey,
      photos: work.photos.map(function (photo) {
        return {
          key: photo.key,
          src: photo.src,
          caption: photo.caption,
          w: photo.w,
          h: photo.h,
          blob: photo.blob,
          preview: photo.preview
        };
      })
    };
  }

  function closeEditor() {
    state.editing = null;
    state.editingIndex = null;
    dom.editorView.hidden = true;
    setView(state.view);
  }

  /* ---------- 방송사 / 플랫폼 ---------- */
  function updateNetworkCustom() {
    var custom = dom.fNetwork.value === NETWORK_CUSTOM;
    dom.fNetworkCustom.hidden = !custom;
  }

  function setNetworkField(value) {
    var network = String(value || "").trim();
    var preset = NETWORKS.indexOf(network) !== -1;

    dom.fNetwork.value = !network ? "" : preset ? network : NETWORK_CUSTOM;
    dom.fNetworkCustom.value = preset || !network ? "" : network;
    updateNetworkCustom();
  }

  function readNetworkField() {
    if (dom.fNetwork.value === NETWORK_CUSTOM) return dom.fNetworkCustom.value.trim();
    return dom.fNetwork.value || "";
  }

  function renderEditor() {
    var work = state.editing;
    if (!work) return;

    var cover = coverOf(work);

    dom.coverPreview.innerHTML = "";

    if (cover && photoUrl(cover)) {
      var img = document.createElement("img");
      img.src = photoUrl(cover);
      img.alt = "";
      dom.coverPreview.appendChild(img);
    } else {
      dom.coverPreview.appendChild(el("span", null, "사진 대기"));
    }

    dom.photoCount.textContent = "· " + work.photos.length + "장";
    dom.photosEmpty.hidden = work.photos.length > 0;
    dom.photoWait.hidden = work.photos.length > 0;
    dom.photoList.innerHTML = "";

    work.photos.forEach(function (photo, index) {
      dom.photoList.appendChild(photoRow(work, photo, index));
    });
  }

  function photoRow(work, photo, index) {
    var row = el("li", "photo" + (photo.key === work.coverKey ? " is-cover" : ""));

    var thumb = el("div", "photo__thumb");

    if (photoUrl(photo)) {
      var img = document.createElement("img");
      img.src = photoUrl(photo);
      img.alt = "";
      thumb.appendChild(img);
    }

    if (photo.key === work.coverKey) {
      thumb.appendChild(el("span", "photo__badge", "대표"));
    }

    var body = el("div", "photo__body");

    var input = document.createElement("input");
    input.className = "photo__cap";
    input.type = "text";
    input.placeholder = "사진 설명 (선택)";
    input.value = photo.caption || "";
    input.addEventListener("input", function () {
      photo.caption = input.value;
    });

    var acts = el("div", "photo__acts");

    var coverBtn = el("button", "chip", "대표로");
    coverBtn.type = "button";
    coverBtn.addEventListener("click", function () {
      /* 대표로 고른 사진을 목록 맨 앞으로 옮겨, 사이트에서도 첫 사진이 대표가 되게 한다 */
      var at = work.photos.indexOf(photo);
      if (at > 0) work.photos.splice(0, 0, work.photos.splice(at, 1)[0]);
      work.coverKey = photo.key;
      renderEditor();
    });

    var up = el("button", "chip", "↑");
    up.type = "button";
    up.title = "앞으로";
    up.disabled = index === 0;
    up.addEventListener("click", function () {
      if (index === 0) return;
      work.photos.splice(index - 1, 0, work.photos.splice(index, 1)[0]);
      renderEditor();
    });

    var down = el("button", "chip", "↓");
    down.type = "button";
    down.title = "뒤로";
    down.disabled = index === work.photos.length - 1;
    down.addEventListener("click", function () {
      if (index === work.photos.length - 1) return;
      work.photos.splice(index + 1, 0, work.photos.splice(index, 1)[0]);
      renderEditor();
    });

    var remove = el("button", "chip chip--danger", "삭제");
    remove.type = "button";
    remove.addEventListener("click", function () {
      work.photos.splice(index, 1);
      if (work.coverKey === photo.key) {
        work.coverKey = work.photos.length ? work.photos[0].key : "";
      }
      renderEditor();
    });

    acts.appendChild(coverBtn);
    acts.appendChild(up);
    acts.appendChild(down);
    acts.appendChild(remove);

    body.appendChild(input);
    body.appendChild(acts);

    row.appendChild(thumb);
    row.appendChild(body);

    return row;
  }

  function commitEditor() {
    var work = state.editing;
    if (!work) return;

    var title = dom.fTitle.value.trim();

    if (!title) {
      setEditorMsg("제목을 입력해 주세요.", true);
      dom.fTitle.focus();
      return;
    }

    /* 사진 없이도 저장할 수 있다 — 그동안은 공개 사이트에 나오지 않고 이 목록에만 머문다 */
    var noPhoto = !work.photos.length;

    work.title = title;
    work.year = dom.fYear.value.trim();
    work.contribution = dom.fContribution.value.trim();
    work.category = dom.fCategory.value;
    work.network = readNetworkField();

    if (noPhoto) {
      work.coverKey = "";
    } else if (!coverOf(work)) {
      work.coverKey = work.photos[0].key;
    }

    if (state.editingIndex == null) {
      state.works.push(work);
    } else {
      state.works[state.editingIndex] = work;
    }

    closeEditor();
    markDirty("works");
    renderWorks();

    if (noPhoto) {
      toast("사진이 없어 공개 사이트에는 나오지 않습니다. 사진을 올려 저장하면 그때 나타납니다.");
    }
  }

  function deleteWork() {
    if (state.editingIndex == null) return;

    var work = state.works[state.editingIndex];
    var label = work.title || "이 작품";

    if (!window.confirm("‘" + label + "’을(를) 목록에서 지울까요?\n(사진 파일은 GitHub에 그대로 남습니다. 저장을 눌러야 사이트에 반영됩니다.)")) {
      return;
    }

    state.works.splice(state.editingIndex, 1);
    closeEditor();
    markDirty("works");
    renderWorks();
    toast("목록에서 지웠습니다. 저장을 눌러 사이트에 반영하세요.");
  }

  /* ---------- 필모그래피 ---------- */
  function applyFilmography(data, sha) {
    state.filmographySha = sha || null;
    state.filmography = data && Array.isArray(data.categories) ? data : { categories: [] };
    state.dirtyFilmo = false;
    renderFilmography();
    updateSaveBar();
  }

  function renderFilmography() {
    var data = state.filmography;

    dom.filmoCats.innerHTML = "";

    if (!data || !data.categories.length) {
      dom.filmoCats.appendChild(el("p", "empty", "필모그래피를 불러오지 못했습니다."));
      return;
    }

    data.categories.forEach(function (category) {
      if (!Array.isArray(category.items)) category.items = [];

      var block = el("section", "filmocat");

      var head = el("div", "filmocat__head");
      var titleWrap = el("div");
      titleWrap.appendChild(el("span", "filmocat__title", category.label || "목록"));
      titleWrap.appendChild(el("span", "filmocat__n", String(category.items.length)));
      head.appendChild(titleWrap);

      var add = el("button", "chip", "+ 행 추가");
      add.type = "button";
      add.addEventListener("click", function () {
        category.items.unshift({ year: nowYear(), text: "" });
        markDirty("filmo");
        renderFilmography();
      });
      head.appendChild(add);

      block.appendChild(head);

      category.items.forEach(function (item, index) {
        block.appendChild(filmographyRow(category, item, index));
      });

      dom.filmoCats.appendChild(block);
    });
  }

  function filmographyRow(category, item, index) {
    var row = el("div", "filmorow");

    var year = document.createElement("input");
    year.className = "filmorow__year";
    year.type = "text";
    year.inputMode = "numeric";
    year.maxLength = 4;
    year.value = item.year || "";
    year.setAttribute("aria-label", "연도");
    year.addEventListener("input", function () {
      item.year = year.value.trim();
      markDirty("filmo");
    });

    var text = document.createElement("input");
    text.type = "text";
    text.value = item.text || "";
    text.placeholder = "작업 내용 (예: tvN '해오름달 열이레')";
    text.setAttribute("aria-label", "작업 내용");
    text.addEventListener("input", function () {
      item.text = text.value;
      markDirty("filmo");
    });

    var remove = el("button", "iconbtn");
    remove.innerHTML = ICONS.close;
    remove.type = "button";
    remove.title = "행 삭제";
    remove.setAttribute("aria-label", "행 삭제");
    remove.addEventListener("click", function () {
      category.items.splice(index, 1);
      markDirty("filmo");
      renderFilmography();
    });

    row.appendChild(year);
    row.appendChild(text);
    row.appendChild(remove);

    return row;
  }

  /* ---------- 저장 ---------- */
  function saveWorks() {
    var uploads = [];

    state.works.forEach(function (work) {
      work.photos.forEach(function (photo) {
        if (photo.blob) uploads.push({ work: work, photo: photo });
      });
    });

    var stamp = Date.now();
    var chain = Promise.resolve();

    uploads.forEach(function (item, index) {
      chain = chain.then(function () {
        var path = "assets/uploads/" + slugId(item.work.id) + "-" + stamp + "-" + (index + 1) + ".jpg";
        setSaveState("사진 " + (index + 1) + " / " + uploads.length + " 올리는 중…");

        return blobToBase64(item.photo.blob).then(function (base64) {
          return putFile(path, base64, "admin: add photo " + path, null);
        }).then(function () {
          item.photo.src = path;
          item.photo.blob = null;
        });
      });
    });

    return chain.then(function () {
      setSaveState("작품 목록 저장 중…");

      var payload = {
        updated: new Date().toISOString(),
        works: state.works.map(serializeWork)
      };

      return putJson("data/works.json", payload, state.worksSha, "admin: update works").then(function (response) {
        state.worksSha = response && response.content ? response.content.sha : state.worksSha;
      });
    });
  }

  function saveFilmography() {
    setSaveState("필모그래피 저장 중…");

    var payload = {
      updated: new Date().toISOString(),
      categories: state.filmography.categories
    };

    return putJson("data/filmography.json", payload, state.filmographySha, "admin: update filmography").then(function (response) {
      state.filmographySha = response && response.content ? response.content.sha : state.filmographySha;
    });
  }

  function save() {
    if (state.busy) return;

    if (state.mode !== "github") {
      toast("미리보기 모드입니다. 토큰으로 로그인하면 사이트에 저장할 수 있습니다.", "error");
      return;
    }

    if (!state.dirtyWorks && !state.dirtyFilmo) {
      toast("저장할 변경 사항이 없습니다.");
      return;
    }

    state.busy = true;
    dom.doneBox.hidden = true;
    setSaveState("저장 준비 중…");
    updateSaveBar();

    var job = Promise.resolve();
    if (state.dirtyWorks) job = job.then(saveWorks);
    if (state.dirtyFilmo) job = job.then(saveFilmography);

    job.then(function () {
      state.dirtyWorks = false;
      state.dirtyFilmo = false;
      dom.doneBox.hidden = false;
      toast("사이트에 반영했습니다. 1~2분 뒤 사이트에서 확인해 보세요.", "ok");
      renderWorks();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(function (error) {
      toast("저장하지 못했습니다. " + describeError(error), "error");
    }).then(function () {
      state.busy = false;
      dom.saveBtn.disabled = false;
      updateSaveBar();
    });
  }

  /* ---------- 이벤트 ---------- */
  function bind() {
    dom.loginForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var token = dom.tokenInput.value.trim();
      if (!token) {
        setLoginMsg("토큰을 붙여 넣어 주세요.", true);
        return;
      }

      signIn(token);
    });

    dom.previewBtn.addEventListener("click", startPreview);
    dom.logoutBtn.addEventListener("click", signOut);

    dom.tabWorks.addEventListener("click", function () {
      setView("works");
    });

    dom.tabFilmo.addEventListener("click", function () {
      setView("filmography");
    });

    dom.addWorkBtn.addEventListener("click", function () {
      openEditor(null);
    });

    [dom.filterAll, dom.filterReady, dom.filterEmpty].forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.listFilter = btn.getAttribute("data-filter") || "all";
        renderWorks();
      });
    });

    dom.workSearch.addEventListener("input", function () {
      state.query = dom.workSearch.value;
      renderWorks();
    });

    dom.editorBack.addEventListener("click", function () {
      if (state.editing && (state.editing.photos.length || state.editing.title)) {
        if (!window.confirm("이 작품의 수정 내용을 버릴까요?")) return;
      }
      closeEditor();
    });

    dom.editorCancel.addEventListener("click", function () {
      if (state.editing && (state.editing.photos.length || state.editing.title)) {
        if (!window.confirm("이 작품의 수정 내용을 버릴까요?")) return;
      }
      closeEditor();
    });

    dom.editorDone.addEventListener("click", commitEditor);
    dom.deleteWorkBtn.addEventListener("click", deleteWork);

    dom.fNetwork.addEventListener("change", function () {
      updateNetworkCustom();

      if (dom.fNetwork.value === NETWORK_CUSTOM) {
        dom.fNetworkCustom.focus();
      }
    });

    dom.coverInput.addEventListener("change", function () {
      addFiles(dom.coverInput.files, true);
    });

    dom.photosInput.addEventListener("change", function () {
      addFiles(dom.photosInput.files, false);
    });

    dom.saveBtn.addEventListener("click", save);

    dom.doneClose.addEventListener("click", function () {
      dom.doneBox.hidden = true;
    });

    window.addEventListener("beforeunload", function (event) {
      if (state.dirtyWorks || state.dirtyFilmo) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
  }

  /* ---------- 시작 ---------- */
  function boot() {
    bind();

    var saved = null;
    try {
      saved = localStorage.getItem(TOKEN_KEY);
    } catch (error) {}

    if (saved) {
      signIn(saved);
    } else {
      showLogin();
    }
  }

  boot();
})();
