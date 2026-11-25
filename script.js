/* =========================================================
   JIMIN IM — Still Photographer
   data/works.json → 작품 갤러리 · 작품 뷰어 · 필모그래피 탭
   ========================================================= */
(function () {
  "use strict";

  var CATEGORIES = {
    still: { ko: "스틸", en: "STILL" },
    performance: { ko: "공연", en: "STAGE" },
    behind: { ko: "비하인드", en: "BEHIND" },
    documentary: { ko: "다큐멘터리", en: "DOCUMENTARY" },
    event: { ko: "행사", en: "EVENT" },
    product: { ko: "제품", en: "PRODUCT" }
  };
  var CATEGORY_ORDER = [
    "still",
    "performance",
    "behind",
    "documentary",
    "event",
    "product"
  ];

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function catOf(key) {
    return CATEGORIES[key] || CATEGORIES.still;
  }

  /* ---------- Header: add background after scrolling ---------- */
  var header = document.getElementById("siteHeader");

  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) {
      el.classList.add("is-in");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );

    reveals.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------- Nav: highlight current section ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
  var sections = navLinks
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (link) {
      var match = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", match);
      if (match) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  if (sections.length) {
    var navTicking = false;

    var updateActive = function () {
      var line = window.scrollY + window.innerHeight * 0.35;
      var active = null;

      sections.forEach(function (section) {
        if (section.offsetTop <= line) active = section;
      });

      setActive(active ? active.id : "");
      navTicking = false;
    };

    window.addEventListener(
      "scroll",
      function () {
        if (navTicking) return;
        navTicking = true;
        window.requestAnimationFrame(updateActive);
      },
      { passive: true }
    );

    updateActive();
  }

  /* ---------- Works: data ---------- */
  var gallery = document.getElementById("gallery");
  var filterBar = document.getElementById("workFilters");
  var statusEl = document.getElementById("workStatus");

  var works = [];
  var activeFilter = "all";
  var galleryCols = 0;
  var openViewer = function () {};  // 아래 뷰어 블록에서 채운다

  function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.hidden = !message;
  }

  function normalizePhoto(photo) {
    if (typeof photo === "string") return { src: photo, caption: "" };
    if (!photo || !photo.src) return null;
    return {
      src: String(photo.src),
      caption: photo.caption ? String(photo.caption) : "",
      w: Number(photo.w) || 0,
      h: Number(photo.h) || 0
    };
  }

  function normalize(data) {
    var list = data && Array.isArray(data.works) ? data.works : [];

    return list
      .map(function (raw, index) {
        if (!raw || typeof raw !== "object") return null;

        var photos = (Array.isArray(raw.photos) ? raw.photos : [])
          .map(normalizePhoto)
          .filter(Boolean);

        var cover = raw.cover ? String(raw.cover) : photos[0] ? photos[0].src : "";

        /* 사진이 아직 없는 작품은 공개 목록(Selected Works · 카테고리 개수)에 넣지 않는다.
           /admin/ 목록에는 남아 있고, 사진을 올려 저장하면 그때부터 여기에 나타난다. */
        if (!cover && !photos.length) return null;

        if (cover && !photos.some(function (p) { return p.src === cover; })) {
          photos.unshift({ src: cover, caption: "", w: 0, h: 0 });
        }

        return {
          id: String(raw.id || "work-" + (index + 1)),
          year: raw.year ? String(raw.year).trim() : "",
          network: raw.network ? String(raw.network).trim() : "",
          title: raw.title ? String(raw.title).trim() : "제목 없음",
          contribution: raw.contribution ? String(raw.contribution).trim() : "",
          category: CATEGORIES[raw.category] ? raw.category : "still",
          cover: cover || photos[0].src,
          photos: photos
        };
      })
      .filter(Boolean);
  }

  function readFallback() {
    var tag = document.getElementById("worksFallback");
    if (!tag) return null;
    try {
      return JSON.parse(tag.textContent);
    } catch (error) {
      return null;
    }
  }

  function loadWorks() {
    var fallback = readFallback();
    var url = "data/works.json?v=" + Date.now();

    fetch(url, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        applyWorks(data);
      })
      .catch(function () {
        if (fallback) {
          applyWorks(fallback);
          return;
        }
        setStatus("작품 목록을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.");
      });
  }

  function applyWorks(data) {
    works = normalize(data);

    if (!works.length) {
      setStatus("아직 등록된 작품이 없습니다.");
      return;
    }

    setStatus("");
    renderFilters();
    renderGallery();
  }

  /* ---------- Works: filters ---------- */
  function renderFilters() {
    if (!filterBar) return;
    filterBar.innerHTML = "";
    filterBar.hidden = false;

    var counts = {};
    works.forEach(function (work) {
      counts[work.category] = (counts[work.category] || 0) + 1;
    });

    addFilter("all", "전체", works.length);

    /* 대표 카테고리 6개는 작품이 아직 없어도(개수 0) 모두 보여 준다.
       카테고리 구성이 한눈에 보이고, 눌렀을 때 빈 상태 안내가 나온다. */
    CATEGORY_ORDER.forEach(function (key) {
      addFilter(key, catOf(key).ko, counts[key] || 0);
    });

    function addFilter(key, label, count) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter" + (key === activeFilter ? " is-active" : "");
      btn.dataset.filter = key;
      btn.setAttribute("aria-pressed", key === activeFilter ? "true" : "false");
      btn.textContent = label + " ";

      var n = document.createElement("span");
      n.className = "filter__n";
      n.textContent = String(count);
      btn.appendChild(n);

      btn.addEventListener("click", function () {
        activeFilter = key;
        Array.prototype.forEach.call(filterBar.children, function (other) {
          var on = other === btn;
          other.classList.toggle("is-active", on);
          other.setAttribute("aria-pressed", on ? "true" : "false");
        });
        renderGallery();
      });

      filterBar.appendChild(btn);
    }
  }

  /* ---------- Works: gallery ---------- */
  function createCard(work) {
    var card = document.createElement("article");
    card.className = "work";
    card.dataset.workId = work.id;

    var open = document.createElement("button");
    open.type = "button";
    open.className = "work__open";
    open.setAttribute(
      "aria-label",
      work.title + (work.photos.length > 1 ? " 사진 " + work.photos.length + "장 보기" : " 사진 보기")
    );

    var frame = document.createElement("span");
    frame.className = "work__frame";

    var img = document.createElement("img");
    img.src = work.cover;
    img.alt = work.title + (work.photos[0].caption ? " — " + work.photos[0].caption : "");
    img.loading = "lazy";
    img.decoding = "async";

    var coverPhoto = work.photos.filter(function (p) { return p.src === work.cover; })[0] || work.photos[0];

    if (coverPhoto.w && coverPhoto.h) {
      img.width = coverPhoto.w;
      img.height = coverPhoto.h;
    }

    frame.appendChild(img);
    open.appendChild(frame);

    var cap = document.createElement("div");
    cap.className = "work__cap";

    var kicker = document.createElement("p");
    kicker.className = "work__kicker";

    /* 연도 · 방송사 · 분류 — 있는 것만 점(·)으로 이어 붙인다 */
    function addKickerPart(className, text) {
      if (kicker.childNodes.length) {
        var dot = document.createElement("span");
        dot.className = "work__dot";
        dot.setAttribute("aria-hidden", "true");
        dot.textContent = "·";
        kicker.appendChild(dot);
      }

      var part = document.createElement("span");
      part.className = className;
      part.textContent = text;
      kicker.appendChild(part);
    }

    if (work.year) addKickerPart("work__year", work.year);
    if (work.network) addKickerPart("work__network", work.network);
    addKickerPart("work__cat", catOf(work.category).en);

    var title = document.createElement("h3");
    title.className = "work__title";
    title.textContent = work.title;

    var foot = document.createElement("p");
    foot.className = "work__foot";

    var contribution = document.createElement("span");
    contribution.className = "work__contrib";
    contribution.textContent = work.contribution;
    foot.appendChild(contribution);

    if (work.photos.length > 1) {
      var count = document.createElement("span");
      count.className = "work__count";
      count.textContent = pad2(work.photos.length) + " PHOTOS";
      foot.appendChild(count);
    }

    cap.appendChild(kicker);
    cap.appendChild(title);
    cap.appendChild(foot);

    open.addEventListener("click", function () {
      var coverIndex = 0;
      work.photos.forEach(function (photo, k) {
        if (photo.src === work.cover) coverIndex = k;
      });
      openViewer(work, coverIndex);
    });

    card.appendChild(open);
    card.appendChild(cap);

    return card;
  }

  function renderGallery() {
    if (!gallery) return;

    var shown = works.filter(function (work) {
      return activeFilter === "all" || work.category === activeFilter;
    });

    gallery.innerHTML = "";
    galleryCols = galleryColumns();

    if (!shown.length) {
      setStatus("이 분류에는 아직 사진이 등록된 작품이 없습니다.");
      return;
    }

    setStatus("");

    var columns = [];
    for (var i = 0; i < galleryCols; i += 1) {
      var col = document.createElement("div");
      col.className = "gallery__col";
      gallery.appendChild(col);
      columns.push(col);
    }

    var cards = shown.map(createCard);

    /* 열 폭에서의 실제 카드 높이를 재고, 가장 낮은 열부터 차례로 쌓는다 */
    cards.forEach(function (card) {
      columns[0].appendChild(card);
    });

    var heights = cards.map(function (card) {
      return card.getBoundingClientRect().height;
    });

    var gap = parseFloat(window.getComputedStyle(gallery).rowGap) || 16;
    var loads = columns.map(function () { return 0; });

    cards.forEach(function (card, k) {
      var target = 0;
      for (var c = 1; c < columns.length; c += 1) {
        if (loads[c] < loads[target] - 0.5) target = c;
      }
      columns[target].appendChild(card);
      loads[target] += heights[k] + gap;
    });
  }

  function galleryColumns() {
    if (window.matchMedia("(min-width: 1200px)").matches) return 4;
    if (window.matchMedia("(min-width: 720px)").matches) return 3;
    return 2;
  }

  var galleryResizeTimer = null;

  window.addEventListener("resize", function () {
    if (!gallery) return;
    window.clearTimeout(galleryResizeTimer);
    galleryResizeTimer = window.setTimeout(function () {
      if (galleryColumns() !== galleryCols) renderGallery();
    }, 160);
  });

  /* ---------- Viewer (작품 상세) ---------- */
  var viewer = document.getElementById("viewer");

  if (viewer && gallery) {
    var els = {
      year: document.getElementById("viewerYear"),
      title: document.getElementById("viewerTitle"),
      contrib: document.getElementById("viewerContrib"),
      img: document.getElementById("viewerImg"),
      cap: document.getElementById("viewerCap"),
      thumbs: document.getElementById("viewerThumbs"),
      cur: document.getElementById("viewerCur"),
      total: document.getElementById("viewerTotal"),
      prev: document.getElementById("viewerPrev"),
      next: document.getElementById("viewerNext"),
      close: document.getElementById("viewerClose")
    };

    var current = null;
    var lastFocus = null;
    var closeTimer = null;
    var isOpen = false;
    var pointerStart = null;

    /* 활성 썸네일이 스크롤 영역 안으로 따라오게 한다.
       좁은 화면은 한 줄 가로 스크롤 → scrollIntoView(inline: center),
       넓은 화면은 레일 안 세로 목록 → 세로 위치를 직접 계산해 스크롤한다. */
    function followThumb(btn) {
      if (!btn) return;

      var box = els.thumbs;
      var behavior = reduceMotion ? "auto" : "smooth";
      var horizontal = box.scrollWidth > box.clientWidth + 1;
      var vertical = box.scrollHeight > box.clientHeight + 1;

      if (horizontal && !vertical) {
        try {
          btn.scrollIntoView({ behavior: behavior, block: "nearest", inline: "center" });
          return;
        } catch (error) {
          /* 아주 오래된 브라우저는 옵션 객체를 받지 않는다 */
        }
        box.scrollTo({
          left: btn.offsetLeft - box.clientWidth / 2 + btn.offsetWidth / 2,
          behavior: behavior
        });
        return;
      }

      if (vertical) {
        var boxRect = box.getBoundingClientRect();
        var btnRect = btn.getBoundingClientRect();
        var top =
          box.scrollTop +
          (btnRect.top + btnRect.height / 2) -
          (boxRect.top + boxRect.height / 2);
        box.scrollTo({ left: box.scrollLeft, top: Math.max(0, top), behavior: behavior });
      }
    }

    function renderPhoto(i) {
      if (!current) return;

      var photos = current.work.photos;
      if (!photos.length) return;

      current.index = (i + photos.length) % photos.length;
      var photo = photos[current.index];

      viewer.classList.remove("is-ready");
      els.img.src = photo.src;
      els.img.alt = photo.caption || current.work.title;
      els.cap.textContent = photo.caption || "";
      els.cap.hidden = !photo.caption;
      els.cur.textContent = pad2(current.index + 1);
      els.total.textContent = pad2(photos.length);

      Array.prototype.forEach.call(els.thumbs.children, function (btn, k) {
        var on = k === current.index;
        btn.classList.toggle("is-current", on);
        btn.setAttribute("aria-current", on ? "true" : "false");
        if (on) followThumb(btn);
      });

      var done = function () {
        if (!isOpen) return;

        /* 새 사진이 아직 들어오지 않았는데 decode()가 먼저 끝나는 경우가 있다.
           그때 페이드인해 버리면 이전 사진이 이전 크기 그대로 남아 작게 보이므로,
           currentSrc가 이번 사진으로 바뀐 뒤에만 화면에 올린다. */
        var shown = els.img.currentSrc || "";
        if (photo.src && shown.indexOf(photo.src.replace(/^\.\//, "")) === -1) return;

        viewer.classList.add("is-ready");
      };

      els.img.onload = done;
      els.img.onerror = function () {
        if (isOpen) viewer.classList.add("is-ready");
      };

      if (els.img.decode) {
        els.img.decode().then(done).catch(done);
      }

      [current.index + 1, current.index - 1].forEach(function (k) {
        var next = photos[(k + photos.length) % photos.length];
        if (next) {
          var preload = new Image();
          preload.src = next.src;
        }
      });
    }

    function buildThumbs(work) {
      els.thumbs.innerHTML = "";

      work.photos.forEach(function (photo, k) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "viewer__thumb";
        btn.setAttribute("aria-label", (k + 1) + "번째 사진" + (photo.caption ? " — " + photo.caption : ""));

        var img = document.createElement("img");
        img.src = photo.src;
        img.alt = "";
        img.loading = "lazy";

        btn.appendChild(img);
        btn.addEventListener("click", function () {
          renderPhoto(k);
        });
        els.thumbs.appendChild(btn);
      });

      window.requestAnimationFrame(syncThumbsScrollable);
    }

    /* 썸네일 영역이 스크롤되는지에 따라 아래쪽 흐림 표시를 켜고 끈다 */
    function syncThumbsScrollable() {
      if (!els.thumbs) return;
      var overflowing = els.thumbs.scrollHeight - els.thumbs.clientHeight > 2;
      els.thumbs.classList.toggle("is-scrollable", overflowing);
    }

    window.addEventListener("resize", function () {
      window.requestAnimationFrame(syncThumbsScrollable);
    });

    openViewer = function (work, index) {
      if (!work || !work.photos.length) return;

      current = { work: work, index: index || 0 };
      lastFocus = document.activeElement;
      clearTimeout(closeTimer);
      isOpen = true;

      var viewerKicker = [work.year, work.network, catOf(work.category).en]
        .filter(Boolean)
        .join(" · ");

      els.year.textContent = viewerKicker;
      els.year.hidden = !viewerKicker;
      els.title.textContent = work.title;
      els.contrib.textContent = work.contribution;
      els.contrib.hidden = !work.contribution;

      buildThumbs(work);

      var multi = work.photos.length > 1;
      els.prev.hidden = !multi;
      els.next.hidden = !multi;
      els.thumbs.hidden = !multi;

      viewer.hidden = false;
      document.body.classList.add("is-locked");

      document.querySelectorAll("header, main, footer").forEach(function (el) {
        if ("inert" in el) el.inert = true;
      });

      renderPhoto(current.index);

      requestAnimationFrame(function () {
        viewer.classList.add("is-open");
      });

      window.setTimeout(function () {
        els.close.focus({ preventScroll: true });
      }, 40);
    };

    function closeViewer() {
      if (!isOpen) return;
      isOpen = false;

      viewer.classList.remove("is-open", "is-ready");
      document.body.classList.remove("is-locked");

      document.querySelectorAll("header, main, footer").forEach(function (el) {
        if ("inert" in el) el.inert = false;
      });

      closeTimer = window.setTimeout(function () {
        viewer.hidden = true;
        els.img.removeAttribute("src");
      }, reduceMotion ? 0 : 340);

      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    function step(delta) {
      if (!current) return;
      renderPhoto(current.index + delta);
    }

    function focusables() {
      return [els.close, els.prev, els.next]
        .concat(Array.prototype.slice.call(els.thumbs.children))
        .filter(function (el) {
          return el && !el.hidden;
        });
    }

    els.close.addEventListener("click", closeViewer);
    els.prev.addEventListener("click", function () { step(-1); });
    els.next.addEventListener("click", function () { step(1); });

    document.addEventListener("keydown", function (event) {
      if (!isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeViewer();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "Tab") {
        var list = focusables();
        if (!list.length) return;

        var first = list[0];
        var last = list[list.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    /* 좌우 스와이프 */
    els.img.parentNode.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse") return;
      pointerStart = { x: event.clientX, y: event.clientY };
    });

    els.img.parentNode.addEventListener("pointerup", function (event) {
      if (!pointerStart) return;

      var dx = event.clientX - pointerStart.x;
      var dy = event.clientY - pointerStart.y;
      pointerStart = null;

      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
      }
    });

    els.img.parentNode.addEventListener("pointercancel", function () {
      pointerStart = null;
    });
  }

  /* ---------- Filmography: data ---------- */
  var filmoBody = document.getElementById("filmographyBody");

  function fillFilmographyBody(el, text) {
    /* 첫 번째 따옴표로 묶인 작품명을 살짝 눌러 준다 */
    var match = /(['‘])([^'’]{1,60})(['’])/.exec(text);
    if (!match) {
      el.textContent = text;
      return;
    }

    el.appendChild(document.createTextNode(text.slice(0, match.index) + match[1]));

    var name = document.createElement("span");
    name.className = "fo-name";
    name.textContent = match[2];
    el.appendChild(name);

    el.appendChild(document.createTextNode(match[3] + text.slice(match.index + match[0].length)));
  }

  function renderFilmography(data) {
    if (!filmoBody) return;

    var cats = data && Array.isArray(data.categories)
      ? data.categories.filter(function (cat) {
          return cat && cat.label && Array.isArray(cat.items);
        })
      : [];

    if (!cats.length) return;

    filmoBody.innerHTML = "";

    var tabs = document.createElement("div");
    tabs.className = "tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "필모그래피 카테고리");

    cats.forEach(function (cat, i) {
      var slug = String(cat.id || "cat-" + i).replace(/[^a-z0-9-]/gi, "") || "cat-" + i;
      var on = i === 0;

      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tab" + (on ? " is-active" : "");
      tab.setAttribute("role", "tab");
      tab.id = "tab-" + slug;
      tab.setAttribute("aria-controls", "panel-" + slug);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.setAttribute("tabindex", on ? "0" : "-1");
      tab.dataset.tab = slug;
      tab.textContent = cat.label + " ";

      var n = document.createElement("span");
      n.className = "tab__n";
      n.textContent = String(cat.items.length);
      tab.appendChild(n);
      tabs.appendChild(tab);

      var panel = document.createElement("div");
      panel.className = "fo-panel";
      panel.setAttribute("role", "tabpanel");
      panel.id = "panel-" + slug;
      panel.setAttribute("aria-labelledby", "tab-" + slug);
      panel.dataset.panel = slug;
      panel.hidden = !on;

      var list = document.createElement("ol");
      list.className = "fo-list";

      cat.items.forEach(function (item) {
        var year = item && item.year ? String(item.year) : "";
        var text = item && item.text ? String(item.text) : "";

        var row = document.createElement("li");
        row.className = "fo-row";

        var y = document.createElement("span");
        y.className = "fo-year";
        y.textContent = year;

        var body = document.createElement("span");
        body.className = "fo-body";
        fillFilmographyBody(body, text);

        row.appendChild(y);
        row.appendChild(body);
        list.appendChild(row);
      });

      panel.appendChild(list);

      if (i === 0) filmoBody.appendChild(tabs);
      filmoBody.appendChild(panel);
    });
  }

  function loadFilmography() {
    if (!filmoBody) return;

    fetch("data/filmography.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(renderFilmography)
      .catch(function () {
        /* 실패하면 index.html 에 들어 있는 목록을 그대로 보여 준다 */
      });
  }

  /* ---------- Filmography: tabs ---------- */
  function activateTab(tab, focus) {
    if (!filmoBody) return;

    var slug = tab.getAttribute("data-tab");

    Array.prototype.forEach.call(filmoBody.querySelectorAll("[role='tab'][data-tab]"), function (t) {
      var on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.setAttribute("tabindex", on ? "0" : "-1");
    });

    Array.prototype.forEach.call(filmoBody.querySelectorAll("[data-panel]"), function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== slug;
    });

    if (focus) tab.focus();
  }

  if (filmoBody) {
    filmoBody.addEventListener("click", function (event) {
      var tab = event.target.closest("[role='tab'][data-tab]");
      if (tab) activateTab(tab, false);
    });

    filmoBody.addEventListener("keydown", function (event) {
      var tab = event.target.closest("[role='tab'][data-tab]");
      if (!tab) return;

      var tabs = Array.prototype.slice.call(filmoBody.querySelectorAll("[role='tab'][data-tab]"));
      var i = tabs.indexOf(tab);
      var next = null;

      if (event.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (event.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (event.key === "Home") next = tabs[0];
      else if (event.key === "End") next = tabs[tabs.length - 1];

      if (next) {
        event.preventDefault();
        activateTab(next, true);
      }
    });
  }

  /* ---------- Start ---------- */
  loadWorks();
  loadFilmography();
})();
