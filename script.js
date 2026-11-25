/* =========================================================
   JIMIN IM — Still Photographer
   Header state · reveal · filters · filmography tabs · lightbox
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    reveals.forEach(function (el) { el.classList.add("is-in"); });
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

    reveals.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Nav: highlight current section ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute("href")); })
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
      var current = null;

      sections.forEach(function (section) {
        if (section.offsetTop <= line) current = section;
      });

      setActive(current ? current.id : "");
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

  /* ---------- Work: category filter ---------- */
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll(".filter"));
  var figures = Array.prototype.slice.call(document.querySelectorAll("[data-still]"));

  function applyFilter(cat) {
    filterButtons.forEach(function (btn) {
      var on = btn.getAttribute("data-filter") === cat;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    figures.forEach(function (fig) {
      var match = cat === "all" || fig.getAttribute("data-cat") === cat;
      fig.classList.toggle("is-hidden", !match);
    });

    refreshSet();
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyFilter(btn.getAttribute("data-filter"));
    });
  });

  /* ---------- Filmography: tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[role='tab'][data-tab]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));

  function activateTab(tab, focus) {
    var slug = tab.getAttribute("data-tab");

    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.setAttribute("tabindex", on ? "0" : "-1");
    });

    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== slug;
    });

    if (focus) tab.focus();
  }

  if (tabs.length) {
    tabs.forEach(function (tab, i) {
      tab.setAttribute("tabindex", tab.classList.contains("is-active") ? "0" : "-1");

      tab.addEventListener("click", function () { activateTab(tab, false); });

      tab.addEventListener("keydown", function (event) {
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
    });

    activateTab(tabs[0], false);
  }

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");

  if (!lightbox || !figures.length) return;

  var lbImg = lightbox.querySelector(".lb-img");
  var lbNo = lightbox.querySelector(".lb-no");
  var lbTitle = lightbox.querySelector(".lb-title");
  var lbMeta = lightbox.querySelector(".lb-meta");
  var lbCur = lightbox.querySelector(".lb-cur");
  var lbTotal = lightbox.querySelector(".lb-total");
  var btnClose = lightbox.querySelector(".lb-close");
  var btnPrev = lightbox.querySelector(".lb-prev");
  var btnNext = lightbox.querySelector(".lb-next");

  var items = figures.map(function (fig) {
    var img = fig.querySelector("img");
    return {
      figure: fig,
      src: img.getAttribute("src"),
      alt: img.getAttribute("alt") || "",
      no: (fig.querySelector(".still__no") || {}).textContent || "",
      title: (fig.querySelector(".still__title") || {}).textContent || "",
      meta: (fig.querySelector(".still__meta") || {}).textContent || "",
      trigger: fig.querySelector(".still__open")
    };
  });

  var set = items.slice();  // 현재 필터에서 보이는 이미지들
  var index = 0;
  var lastFocus = null;
  var closeTimer = null;
  var isOpen = false;

  function refreshSet() {
    set = items.filter(function (item) {
      return !item.figure.classList.contains("is-hidden");
    });
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function preload(i) {
    if (!set.length) return;
    var item = set[(i + set.length) % set.length];
    if (!item) return;
    var img = new Image();
    img.src = item.src;
  }

  function render(i) {
    if (!set.length) return;

    index = (i + set.length) % set.length;
    var item = set[index];

    lightbox.classList.remove("is-ready");
    lbImg.src = item.src;
    lbImg.alt = item.alt;
    lbNo.textContent = item.no.trim();
    lbTitle.textContent = item.title.trim();
    lbMeta.textContent = item.meta.trim();
    lbCur.textContent = pad(index + 1);
    lbTotal.textContent = pad(set.length);

    if (lbImg.decode) {
      lbImg.decode().then(ready).catch(ready);
    } else {
      lbImg.onload = ready;
    }

    preload(index + 1);
    preload(index - 1);
  }

  function ready() {
    if (isOpen) lightbox.classList.add("is-ready");
  }

  function open(i) {
    lastFocus = document.activeElement;
    isOpen = true;
    clearTimeout(closeTimer);

    lightbox.hidden = false;
    document.body.classList.add("is-locked");
    render(i);

    requestAnimationFrame(function () {
      lightbox.classList.add("is-open");
    });

    document.querySelectorAll("header, main, footer").forEach(function (el) {
      if ("inert" in el) el.inert = true;
    });

    window.setTimeout(function () { btnClose.focus({ preventScroll: true }); }, 40);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;

    lightbox.classList.remove("is-open", "is-ready");
    document.body.classList.remove("is-locked");

    document.querySelectorAll("header, main, footer").forEach(function (el) {
      if ("inert" in el) el.inert = false;
    });

    closeTimer = window.setTimeout(function () {
      lightbox.hidden = true;
      lbImg.removeAttribute("src");
    }, reduceMotion ? 0 : 360);

    if (lastFocus && lastFocus.focus) {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function next() { render(index + 1); }
  function prev() { render(index - 1); }

  items.forEach(function (item) {
    if (!item.trigger) return;
    item.trigger.addEventListener("click", function () {
      var i = set.indexOf(item);
      open(i < 0 ? 0 : i);
    });
  });

  btnClose.addEventListener("click", close);
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", next);

  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) close();
  });

  document.addEventListener("keydown", function (event) {
    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    } else if (event.key === "Tab") {
      var focusables = [btnClose, btnPrev, btnNext];
      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------- Swipe (touch / pen) ---------- */
  var startX = 0;
  var startY = 0;
  var tracking = false;

  lightbox.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse") return;
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
  });

  lightbox.addEventListener("pointerup", function (event) {
    if (!tracking) return;
    tracking = false;

    var dx = event.clientX - startX;
    var dy = event.clientY - startY;

    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
  });

  lightbox.addEventListener("pointercancel", function () { tracking = false; });
})();
