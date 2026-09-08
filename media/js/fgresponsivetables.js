/**
 * Fero — enhance tables on the frontend.
 *
 * - Optionally add class `responsiv` to content tables
 * - Fill missing `data-label` from thead / first header row
 * - Wrap tables so stacked layout can follow column width, not just viewport
 * - Toggle `.is-stacked` via ResizeObserver using the plugin breakpoint
 */
(function () {
  "use strict";

  var DEFAULTS = {
    selector: "table.responsiv",
    autoLabels: true,
    autoClass: false,
    wrap: true,
    breakpoint: 600,
    ariaRoles: true,
    cardStyle: "card",
    clearFloats: false,
    minWidth: 0,
    scrollLabel: "Scrollable table",
    watchDom: false,
    autoClassSelector: "article table, .com-content table, .item-page table, .blog table, .category table",
    multiLevelLabels: false,
    multiLevelSeparator: " › ",
    exclude: "table.no-responsiv, .no-responsiv table",
  };

  function getOptions() {
    if (window.Joomla && typeof window.Joomla.getOptions === "function") {
      return Object.assign({}, DEFAULTS, window.Joomla.getOptions("plg_system_fgresponsivetables", {}) || {});
    }
    return Object.assign({}, DEFAULTS, window.rwdTablesOptions || {});
  }

  function matchesExclude(table, exclude) {
    if (!exclude) {
      return table.classList.contains("no-responsiv");
    }
    if (table.classList.contains("no-responsiv")) {
      return true;
    }
    try {
      if (table.matches(exclude)) {
        return true;
      }
    } catch (e) {
      /* invalid selector — ignore */
    }
    return !!(table.closest && table.closest(".no-responsiv"));
  }

  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  /**
   * table.querySelectorAll("tr"/"td"/"th"/...) traverses the FULL
   * subtree, so a nested <table> inside a cell would leak its own
   * rows/cells into the outer table's processing (wrong data-label,
   * wrong ARIA roles, etc. applied to a table that isn't this one).
   * table.rows / row.cells / table.tHead / table.tBodies are native
   * DOM properties that are inherently shallow — per spec they only
   * ever contain this exact table's own direct rows/cells — so using
   * them instead is immune to nested tables by construction, no
   * `closest()` / ownership check needed anywhere else in this file.
   */
  function ownRows(table) {
    return Array.prototype.slice.call(table.rows);
  }

  function ownCells(table) {
    var cells = [];
    ownRows(table).forEach(function (row) {
      Array.prototype.forEach.call(row.cells, function (cell) {
        cells.push(cell);
      });
    });
    return cells;
  }

  /**
   * Resolve one label per *visual* table column, not per header cell.
   * A plain header row (no colspan/rowspan) has visual column i ==
   * header cell i, which is all the previous simple index-based
   * version assumed — it breaks on a grouped header like:
   *   <tr><th rowspan="2">Stroj</th><th colspan="2">Cena</th></tr>
   *   <tr><th>hodina</th><th>km</th></tr>
   * (3 visual columns: Stroj / hodina / km — not 2 header cells).
   *
   * This walks all `thead` rows into a small virtual grid (grid[row]
   * [col] = text), letting a rowspan/colspan cell occupy every grid
   * position it actually covers, same idea as a browser's own table
   * layout. The label finally used per column is whatever occupies
   * that column in the LAST header row — the most specific (leaf)
   * heading, e.g. "hodina"/"km" rather than the group "Cena".
   */
  /**
   * By default returns just the LEAF label for each column — for a
   * grouped header like "Cena" (colspan 2) over "hodina"/"km", that's
   * "hodina"/"km" alone, with no indication either belongs under
   * "Cena". Optionally (multiLevel), composes the full path through
   * every header row that column passes through instead, joined by
   * separator — "Cena › hodina" / "Cena › km" — so the mobile card's
   * label doesn't lose the grouping context. A column under a single
   * ungrouped header row is unaffected either way (its path is just
   * one segment, same as the leaf).
   */
  function headerLabels(table, multiLevel, separator) {
    var headRows = table.tHead ? Array.prototype.slice.call(table.tHead.rows) : [];
    if (!headRows.length) {
      var first = table.rows[0];
      if (!first) {
        return [];
      }
      var cells = Array.prototype.filter.call(first.cells, function (cell) {
        return cell.tagName === "TH";
      });
      return cells.map(function (cell) {
        return cleanText(cell.textContent);
      });
    }

    var grid = [];
    // paths[column] collects each spanned column's header text once
    // per originating cell (not once per rowspan-duplicated row),
    // in top-to-bottom order — exactly the "Group › Subgroup" path.
    var paths = [];
    headRows.forEach(function (row, r) {
      grid[r] = grid[r] || [];
      var colIndex = 0;
      Array.prototype.forEach.call(row.cells, function (cell) {
        while (grid[r][colIndex] !== undefined) {
          colIndex++;
        }
        var colspan = parseInt(cell.getAttribute("colspan"), 10) || 1;
        var rowspan = parseInt(cell.getAttribute("rowspan"), 10) || 1;
        var text = cleanText(cell.textContent);
        for (var rr = 0; rr < rowspan; rr++) {
          grid[r + rr] = grid[r + rr] || [];
          for (var cc = 0; cc < colspan; cc++) {
            grid[r + rr][colIndex + cc] = text;
          }
        }
        for (var pc = 0; pc < colspan; pc++) {
          paths[colIndex + pc] = paths[colIndex + pc] || [];
          paths[colIndex + pc].push(text);
        }
        colIndex += colspan;
      });
    });

    if (multiLevel) {
      return paths.map(function (path) {
        return path.join(separator);
      });
    }

    var lastRow = grid[grid.length - 1] || [];
    return lastRow.slice();
  }

  /**
   * headerLabels() already has a fallback for a table with no real
   * <thead> — common straight out of TinyMCE, where the author just
   * types `<tr><th>...</th></tr>` as the first row inside <tbody>.
   * That fallback correctly reads labels from it, but nothing told
   * the CSS this row is a header, so in stacked mode it rendered as
   * its own empty-looking card (two <th> cells side by side) — and
   * nothing told applyAriaRoles() either, so those cells got
   * role="rowheader"/scope="row" (a row header) instead of the
   * column-header role they actually are. Mark it once here so both
   * the CSS (.rwd-headrow, hidden the same way as a real thead) and
   * applyAriaRoles() (checked via this class) can treat it correctly.
   * A real <thead> needs none of this — it's already handled on its
   * own throughout.
   */
  function markHeaderRow(table) {
    if (table.tHead) {
      return;
    }
    var first = table.rows[0];
    if (!first || !first.cells.length) {
      return;
    }
    var allTh = Array.prototype.every.call(first.cells, function (cell) {
      return cell.tagName === "TH";
    });
    if (allTh) {
      first.classList.add("rwd-headrow");
    }
  }


  /**
   * Tracks an "occupied" grid across rows — same idea headerLabels()
   * already uses for the header — instead of a fresh colIndex per
   * row. Without this, a <td rowspan="2"> in one row silently shifted
   * every later cell in the FOLLOWING row one column to the left (no
   * cell there to advance past), so that row's cells got the wrong
   * label entirely — not a cosmetic misalignment: a real price could
   * end up captioned with the wrong column name on mobile. Confirmed
   * before this fix: <tr><td rowspan="2">Pondelok</td><td>AD08</td>
   * <td>60 €</td></tr><tr><td>AD20</td><td>70 €</td></tr> labelled
   * the second row's cells "Deň"/"Stroj" instead of "Stroj"/"Cena".
   */
  function applyLabels(table, multiLevel, separator) {
    var labels = headerLabels(table, multiLevel, separator);
    if (!labels.length) {
      return;
    }
    var occupied = {};
    ownRows(table).forEach(function (row, rowIndex) {
      if (row.parentElement && row.parentElement.tagName === "THEAD") {
        return;
      }
      var hasTd = Array.prototype.some.call(row.cells, function (c) {
        return c.tagName === "TD";
      });
      if (!hasTd) {
        return;
      }
      var colIndex = 0;
      Array.prototype.forEach.call(row.cells, function (cell) {
        while (occupied[rowIndex + ":" + colIndex]) {
          colIndex++;
        }
        var colspan = parseInt(cell.getAttribute("colspan"), 10) || 1;
        var rowspan = parseInt(cell.getAttribute("rowspan"), 10) || 1;
        for (var rr = 0; rr < rowspan; rr++) {
          for (var cc = 0; cc < colspan; cc++) {
            occupied[(rowIndex + rr) + ":" + (colIndex + cc)] = true;
          }
        }
        if (cell.tagName === "TD" && !cell.hasAttribute("data-label") && labels[colIndex]) {
          cell.setAttribute("data-label", labels[colIndex]);
        }
        colIndex += colspan;
      });
    });
  }

  /**
   * Wrap each td[data-label]'s actual content in a <span>, so the
   * stacked-card CSS can lay out the label (::before) and the value
   * as two real grid items — a genuine two-column `label | value`
   * grid, not the earlier float trick. A long label (e.g. "Cena za
   * 1 hod. nad paušál (min. 3 hod.)") can now wrap onto its own line
   * within its own column without ever touching the value, which
   * always stays in its own column on the right, regardless of label
   * length. (An earlier flexbox attempt at this — v1.3.4 — had a
   * real rendering regression and was reverted in v1.3.5; this pass
   * was verified with headless-browser screenshots at several widths
   * — 260/280/300/320/360/400px — before shipping, including with
   * the "lines only" card style.)
   */
  function wrapCellValues(table) {
    var cells = ownCells(table).filter(function (cell) {
      return cell.tagName === "TD" && cell.hasAttribute("data-label");
    });
    cells.forEach(function (cell) {
      if (cell.getAttribute("data-rwd-wrapped") === "1") {
        return;
      }
      var span = document.createElement("span");
      span.className = "rwd-value";
      while (cell.firstChild) {
        span.appendChild(cell.firstChild);
      }
      cell.appendChild(span);
      cell.setAttribute("data-rwd-wrapped", "1");
    });
  }

  /**
   * Setting `display: block` on tr/td (for the stacked card layout)
   * makes some assistive technology (notably Safari/VoiceOver) drop
   * the table's native row/cell semantics, because they derive the
   * accessibility role from computed CSS display. Explicit `role`
   * attributes always win over that, so add them back regardless of
   * display — this restores normal table navigation for screen
   * reader users on the stacked/mobile layout, and is harmless on
   * desktop where display stays table-like anyway.
   *
   * Three cases for the table's own `role`, not two: an author who
   * wrote role="presentation"/"none" is explicitly opting the whole
   * table OUT of table semantics — respect that and touch nothing.
   * An author who wrote role="table" (or the value we set on a
   * previous run) still needs its DESCENDANTS handled, since those
   * are what actually compensate for display:block — only skipping
   * the table's own role would silently defeat the whole feature for
   * any table an author (or another script) had already role="table".
   * No role at all: set it, then continue the same way.
   */
  function applyAriaRoles(table) {
    var tableRole = table.getAttribute("role");
    if (tableRole === "presentation" || tableRole === "none") {
      return;
    }
    if (!tableRole) {
      table.setAttribute("role", "table");
    }

    var groups = [];
    if (table.tHead) {
      groups.push(table.tHead);
    }
    Array.prototype.forEach.call(table.tBodies, function (tb) {
      groups.push(tb);
    });
    if (table.tFoot) {
      groups.push(table.tFoot);
    }
    groups.forEach(function (group) {
      if (!group.hasAttribute("role")) {
        group.setAttribute("role", "rowgroup");
      }
    });

    var rows = ownRows(table);
    rows.forEach(function (row) {
      if (!row.hasAttribute("role")) {
        row.setAttribute("role", "row");
      }

      var inHead = row.parentElement === table.tHead || row.classList.contains("rwd-headrow");
      Array.prototype.forEach.call(row.cells, function (cell) {
        if (cell.tagName === "TH") {
          if (!cell.hasAttribute("role")) {
            cell.setAttribute("role", inHead ? "columnheader" : "rowheader");
          }
          if (!cell.hasAttribute("scope")) {
            // A header spanning several columns/rows describes the
            // whole group, not a single column/row — scope="col" on
            // a colspan="2" header is technically wrong per the HTML
            // spec; "colgroup"/"rowgroup" is the correct value there.
            var colspan = parseInt(cell.getAttribute("colspan"), 10) || 1;
            var rowspan = parseInt(cell.getAttribute("rowspan"), 10) || 1;
            if (inHead) {
              cell.setAttribute("scope", colspan > 1 ? "colgroup" : "col");
            } else {
              cell.setAttribute("scope", rowspan > 1 ? "rowgroup" : "row");
            }
          }
        } else if (cell.tagName === "TD") {
          if (!cell.hasAttribute("role")) {
            cell.setAttribute("role", "cell");
          }
        }
      });
    });
  }

  function ensureWrap(table) {
    var parent = table.parentElement;
    if (!parent) {
      // Detached from the document (e.g. built in memory by another
      // script, or picked up mid-move by the opt-in MutationObserver)
      // — nothing to wrap it into yet. Returning the table itself
      // instead of throwing keeps this one bad table from breaking
      // the forEach it's called from and every table after it.
      return table;
    }
    if (parent.classList.contains("rwd-table-wrap")) {
      return parent;
    }
    if (
      parent.classList.contains("table-wrapper") &&
      parent.getElementsByTagName("table").length === 1
    ) {
      parent.classList.add("rwd-table-wrap");
      return parent;
    }
    var wrap = document.createElement("div");
    wrap.className = "rwd-table-wrap";
    parent.insertBefore(wrap, table);
    wrap.appendChild(table);
    return wrap;
  }

  /**
   * Toggle .can-scroll-left / .can-scroll-right so CSS can show a thin
   * inset shadow only on the side(s) that still have hidden columns —
   * a hint that the table scrolls horizontally, on tables wide enough
   * that they have not stacked into cards.
   */
  function updateScrollShadow(target) {
    var canLeft = target.scrollLeft > 1;
    var canRight = target.scrollLeft + target.clientWidth < target.scrollWidth - 1;
    target.classList.toggle("can-scroll-left", canLeft);
    target.classList.toggle("can-scroll-right", canRight);
  }

  /**
   * Keyboard focus (tabindex="0") should land on the wrap only when
   * there's actually something to scroll — a stacked card or a table
   * that already fits needs no scroll region, and an unconditional
   * tabindex on every wrap would be an empty, pointless Tab stop for
   * keyboard users on most tables. Only ever add/remove the tabindex
   * WE set (tracked via data-rwd-tabindex) — an author-supplied one
   * is left alone either way.
   *
   * A focusable scroll region with no accessible name is its own
   * problem: a screen reader announces the Tab stop with nothing to
   * identify it by. The recommended pattern for a scrollable table is
   * role="region" plus a name. When the table has its own <caption>,
   * point aria-labelledby at it (assigning it an id if it doesn't
   * already have one, and never overwriting an existing one) rather
   * than copying its text into aria-label — a live reference survives
   * any formatting inside the caption and stays in sync if it ever
   * changes, instead of a one-time flattened copy. Falls back to
   * aria-label with a translated string passed in from PHP when there
   * is no caption (frontend has no language file of its own to pull
   * from; see the PHP-side loadLanguage()/Text::_() call that
   * produces it).
   */
  var rwdCaptionIdCounter = 0;

  function updateFocusability(target, table, scrollLabel) {
    var scrollable = target.scrollWidth > target.clientWidth + 1 && !target.classList.contains("is-stacked");
    if (scrollable) {
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "0");
        target.setAttribute("data-rwd-tabindex", "1");
      }
      if (target.getAttribute("data-rwd-tabindex") === "1") {
        target.setAttribute("role", "region");
        if (table.caption) {
          if (!table.caption.id) {
            rwdCaptionIdCounter++;
            table.caption.id = "rwd-caption-" + rwdCaptionIdCounter;
          }
          target.setAttribute("aria-labelledby", table.caption.id);
          target.removeAttribute("aria-label");
        } else {
          target.setAttribute("aria-label", scrollLabel || "Scrollable table");
          target.removeAttribute("aria-labelledby");
        }
      }
    } else if (target.getAttribute("data-rwd-tabindex") === "1") {
      target.removeAttribute("tabindex");
      target.removeAttribute("data-rwd-tabindex");
      target.removeAttribute("role");
      target.removeAttribute("aria-label");
      target.removeAttribute("aria-labelledby");
    }
  }

  function observeWidth(target, table, breakpoint, scrollLabel) {
    if (target.getAttribute("data-rwd-observed") === "1") {
      return;
    }
    target.setAttribute("data-rwd-observed", "1");

    /**
     * A ResizeObserver holds a strong internal reference to every
     * target it observes, and a `window.addEventListener("resize",
     * apply)` fallback listener is never automatically removed
     * either — on a page that dynamically swaps tables in and out
     * (an editor, an AJAX-refreshed panel), that's a growing memory
     * leak plus pointless callback work for elements no longer on
     * the page. Neither mechanism tells us when the target is
     * removed, so this opportunistically checks `target.isConnected`
     * whenever `apply` next runs (a later resize/observation) and
     * tears itself down at that point — not instant, but correct,
     * and simpler than tracking removals separately (e.g. via a
     * second MutationObserver) for what should be a rare case.
     */
    var ro = null;
    var resizeHandler = null;

    var apply = function () {
      if (!target.isConnected) {
        if (ro) {
          ro.disconnect();
        }
        if (resizeHandler) {
          window.removeEventListener("resize", resizeHandler);
        }
        return;
      }
      var width = target.getBoundingClientRect().width;
      var isStacked = width > 0 && width <= breakpoint;
      if (isStacked) {
        // Wrapping every td[data-label]'s content in span.rwd-value
        // is a real DOM mutation — it can break a template's or a
        // third-party script's own selectors (td > a, td > img:first
        // -child, td:empty) and changes childNodes for anyone else
        // reading the cell. Doing this unconditionally for every
        // table, including ones that live at a width where they
        // never actually stack into cards, mutates DOM that never
        // needed to change. wrapCellValues() only wraps a given cell
        // once (data-rwd-wrapped guard), so calling it here on every
        // pass that's already stacked is a safe no-op after the
        // first time.
        wrapCellValues(table);
      }
      target.classList.toggle("is-stacked", isStacked);
      updateScrollShadow(target);
      updateFocusability(target, table, scrollLabel);
    };
    apply();
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(apply);
      ro.observe(target);
    } else {
      resizeHandler = apply;
      window.addEventListener("resize", resizeHandler);
    }
    target.addEventListener(
      "scroll",
      function () {
        updateScrollShadow(target);
      },
      { passive: true }
    );
  }

  function collectTables(opts) {
    var found = [];
    try {
      found = Array.prototype.slice.call(document.querySelectorAll(opts.selector));
    } catch (e) {
      found = Array.prototype.slice.call(document.querySelectorAll("table.responsiv"));
    }

    if (opts.autoClass) {
      var extras = [];
      try {
        extras = document.querySelectorAll(opts.autoClassSelector);
      } catch (e) {
        // An invalid custom selector shouldn't break the rest of the
        // page's tables — just skip the autoClass pass this run.
        extras = [];
      }
      Array.prototype.forEach.call(extras, function (table) {
        if (matchesExclude(table, opts.exclude)) {
          return;
        }
        if (!table.classList.contains("responsiv")) {
          table.classList.add("responsiv");
        }
        if (found.indexOf(table) === -1) {
          found.push(table);
        }
      });
    }

    return found;
  }

  function enhance() {
    var opts = getOptions();
    var breakpoint = parseInt(opts.breakpoint, 10) || 600;
    var tables = collectTables(opts);

    tables.forEach(function (table) {
      if (table.getAttribute("data-rwd-ready") === "1") {
        return;
      }
      if (matchesExclude(table, opts.exclude)) {
        return;
      }
      table.setAttribute("data-rwd-ready", "1");

      markHeaderRow(table);

      if (opts.autoLabels !== false) {
        applyLabels(table, opts.multiLevelLabels, opts.multiLevelSeparator);
      }

      if (opts.ariaRoles !== false) {
        applyAriaRoles(table);
      }

      table.classList.toggle("rwd-style-lines", opts.cardStyle === "lines");

      var target = table;
      if (opts.wrap !== false) {
        target = ensureWrap(table);
      }
      if (opts.clearFloats) {
        target.classList.add("rwd-clear-floats");
      }
      var minWidth = parseInt(opts.minWidth, 10) || 0;
      if (minWidth > 0) {
        target.style.setProperty("--rwd-min-width", minWidth + "px");
      }
      observeWidth(target, table, breakpoint, opts.scrollLabel);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }

  window.rwdTablesEnhance = enhance;

  /**
   * Off by default. enhance() only ever runs once (DOMContentLoaded)
   * plus whenever a page calls window.rwdTablesEnhance() itself —
   * fine for ordinary content, but a table injected later by AJAX
   * (Regular Labs Tabs/Accordion lazy load, SP Page Builder, a custom
   * fetch) is never touched unless whoever built that integration
   * happens to know about the manual escape hatch. A MutationObserver
   * on the whole document catches that automatically, at the cost of
   * watching document.body on every single page even where nothing
   * ever loads dynamically — worth it for sites that need it, not a
   * sensible default for every install. Turned on via the plugin's
   * "Watch for dynamically added tables" setting. data-rwd-ready
   * already makes repeated enhance() calls safe (a no-op for tables
   * already processed), so this can call it as often as it likes.
   */
  if (getOptions().watchDom && typeof MutationObserver !== "undefined") {
    var watchDomTimer = null;
    var scheduleEnhance = function () {
      if (watchDomTimer) {
        clearTimeout(watchDomTimer);
      }
      // A page builder or framework can insert a lot of content in
      // one go, firing many mutation records back to back — without
      // this, each one would separately schedule its own enhance()
      // call. Debouncing collapses a whole burst into a single call
      // once things settle, instead of many redundant ones.
      watchDomTimer = setTimeout(function () {
        watchDomTimer = null;
        if (window.requestIdleCallback) {
          requestIdleCallback(enhance);
        } else {
          enhance();
        }
      }, 50);
    };
    var mo = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType === 1 && (node.tagName === "TABLE" || node.querySelector("table"))) {
            scheduleEnhance();
            return;
          }
        }
      }
    });
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        mo.observe(document.body, { childList: true, subtree: true });
      });
    }
  }
})();
