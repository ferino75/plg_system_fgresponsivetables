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
  function headerLabels(table) {
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
        colIndex += colspan;
      });
    });

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
  function applyLabels(table) {
    var labels = headerLabels(table);
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
    if (parent && parent.classList.contains("rwd-table-wrap")) {
      return parent;
    }
    if (parent && parent.classList.contains("table-wrapper")) {
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
   */
  function updateFocusability(target) {
    var scrollable = target.scrollWidth > target.clientWidth + 1 && !target.classList.contains("is-stacked");
    if (scrollable) {
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "0");
        target.setAttribute("data-rwd-tabindex", "1");
      }
    } else if (target.getAttribute("data-rwd-tabindex") === "1") {
      target.removeAttribute("tabindex");
      target.removeAttribute("data-rwd-tabindex");
    }
  }

  function observeWidth(target, breakpoint) {
    var apply = function () {
      var width = target.getBoundingClientRect().width;
      target.classList.toggle("is-stacked", width > 0 && width <= breakpoint);
      updateScrollShadow(target);
      updateFocusability(target);
    };
    apply();
    if (typeof ResizeObserver !== "undefined") {
      var ro = new ResizeObserver(apply);
      ro.observe(target);
    } else {
      window.addEventListener("resize", apply);
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
      var extras = document.querySelectorAll(
        "article table, .com-content table, .item-page table, .blog table, .category table"
      );
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
        applyLabels(table);
      }

      wrapCellValues(table);

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
      observeWidth(target, breakpoint);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }

  window.rwdTablesEnhance = enhance;
})();
