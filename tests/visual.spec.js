// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");

const VIEWPORTS = [320, 360, 600, 768, 1200];
const STACK_BREAKPOINT = 600; // plugin default

function fixture(name) {
  return "file://" + path.join(__dirname, "fixtures", name);
}

/**
 * Screenshots for every viewport, on every fixture -- captured as CI
 * artifacts for human review. Not diffed against a baseline yet: no
 * baseline exists (would need a human to review and approve the
 * first generated set as "known good" -- see README in this folder).
 * The functional assertions below are the actual regression net;
 * these screenshots are the visual evidence layer the same way the
 * external review used them to catch the four P1 bugs.
 */
for (const fixtureName of ["basic.html", "shared-wrapper.html", "min-width.html", "dark-mode.html", "card-style-lines.html", "rtl.html", "scroll-only.html"]) {
  test.describe(`screenshots: ${fixtureName}`, () => {
    for (const width of VIEWPORTS) {
      test(`${fixtureName} @ ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(fixture(fixtureName));
        await page.waitForTimeout(250);
        await page.screenshot({
          path: `test-results/screenshots/${fixtureName.replace(".html", "")}-${width}.png`,
          fullPage: true,
        });
      });
    }
  });
}

test.describe("basic.html — functional regression checks", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1200 });
    await page.goto(fixture("basic.html"));
    await page.waitForTimeout(250);
  });

  test("simple table stacks below the breakpoint", async ({ page }) => {
    const wrap = page.locator("#t-simple").locator("xpath=ancestor::div[contains(@class,'rwd-table-wrap')]");
    await expect(wrap).toHaveClass(/is-stacked/);
  });

  test("long-label card has no horizontal overflow (v1.6.0/v2.0.2)", async ({ page }) => {
    const overflow = await page.locator("#t-long-label").evaluate((table) => {
      const wrap = table.closest(".rwd-table-wrap");
      return wrap.scrollWidth - wrap.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("long value wraps instead of overflowing the card (v2.0.2)", async ({ page }) => {
    const overflow = await page.locator("#t-long-value").evaluate((table) => {
      const wrap = table.closest(".rwd-table-wrap");
      return wrap.scrollWidth - wrap.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("rwd-nowrap value never wraps regardless of the value column width", async ({ page }) => {
    const whiteSpace = await page.locator("#t-nowrap td.rwd-nowrap .rwd-value").evaluate(
      (el) => getComputedStyle(el).whiteSpace
    );
    expect(whiteSpace).toBe("nowrap");
  });

  test("colspan/rowspan header resolves to the correct leaf labels (v1.7.0)", async ({ page }) => {
    const labels = await page.locator("#t-colspan-header tbody tr").first().evaluate((row) =>
      Array.from(row.cells).map((c) => c.getAttribute("data-label"))
    );
    expect(labels).toEqual(["Stroj", "hodina", "km"]);
  });

  test("rowspan in the body doesn't shift the following row's labels (v2.0.5)", async ({ page }) => {
    const labels = await page.locator("#t-rowspan-body tbody tr").nth(1).evaluate((row) =>
      Array.from(row.cells).map((c) => c.getAttribute("data-label"))
    );
    expect(labels).toEqual(["Stroj", "Cena"]);
  });

  test("th[scope=row] in tbody becomes a full-width block, not a table-cell strip (v2.0.3)", async ({ page }) => {
    const info = await page.locator("#t-th-scope-row tbody th").first().evaluate((th) => {
      const wrap = th.closest(".rwd-table-wrap");
      return {
        display: getComputedStyle(th).display,
        widthRatio: th.getBoundingClientRect().width / wrap.clientWidth,
      };
    });
    expect(info.display).toBe("block");
    expect(info.widthRatio).toBeGreaterThan(0.9);
  });

  test("table with no <thead> hides its in-body header row and gives it column-header roles (v2.0.4)", async ({ page }) => {
    const info = await page.locator("#t-no-thead").evaluate((table) => {
      const headRow = table.querySelector("tr.rwd-headrow");
      if (!headRow) return null;
      return {
        position: getComputedStyle(headRow).position,
        roles: Array.from(headRow.querySelectorAll("th")).map((th) => th.getAttribute("role")),
      };
    });
    expect(info).not.toBeNull();
    expect(info.position).toBe("absolute");
    expect(info.roles).toEqual(["columnheader", "columnheader", "columnheader"]);
  });

  test("caption text becomes the scrollable region's accessible name when scrollable", async ({ page }) => {
    // This fixture's caption table isn't wide enough to scroll at
    // 320px on its own, so this just confirms the caption is present
    // and untouched -- the full role=region+aria-label behavior is
    // covered by min-width.html below, where scrolling is guaranteed.
    const captionText = await page.locator("#t-caption caption").innerText();
    expect(captionText).toContain("Cenník");
  });

  test("nested table is completely untouched by the outer table's processing (v1.8.0)", async ({ page }) => {
    const info = await page.locator("#t-inner-nested").evaluate((inner) => ({
      role: inner.getAttribute("role"),
      ready: inner.getAttribute("data-rwd-ready"),
      thRoles: Array.from(inner.querySelectorAll("th")).map((th) => th.getAttribute("role")),
    }));
    expect(info.role).toBeNull();
    expect(info.ready).toBeNull();
    expect(info.thRoles.every((r) => r === null)).toBe(true);
  });

  test("author-supplied role=table still gets its descendants processed (v1.9.0)", async ({ page }) => {
    const info = await page.locator("#t-authored-role").evaluate((table) => ({
      tableRole: table.getAttribute("role"),
      theadRole: table.tHead && table.tHead.getAttribute("role"),
      thRole: table.querySelector("th").getAttribute("role"),
    }));
    expect(info.tableRole).toBe("table");
    expect(info.theadRole).toBe("rowgroup");
    expect(info.thRole).toBe("columnheader");
  });

  test("role=presentation is fully respected -- no roles added at all (v1.9.0)", async ({ page }) => {
    const info = await page.locator("#t-presentation").evaluate((table) => ({
      theadRole: table.tHead && table.tHead.getAttribute("role"),
      thRole: table.querySelector("th").getAttribute("role"),
    }));
    expect(info.theadRole).toBeNull();
    expect(info.thRole).toBeNull();
  });
});

test.describe("shared-wrapper.html — v2.0.8", () => {
  test("two tables sharing one .table-wrapper each get their own independent wrap", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 600 });
    await page.goto(fixture("shared-wrapper.html"));
    await page.waitForTimeout(250);

    const info = await page.evaluate(() => {
      const t1 = document.getElementById("t1");
      const t2 = document.getElementById("t2");
      const sharedWrapper = t1.closest(".table-wrapper");
      return {
        sharedWrapperHasRwdClass: sharedWrapper.classList.contains("rwd-table-wrap"),
        sameWrap: t1.closest(".rwd-table-wrap") === t2.closest(".rwd-table-wrap"),
      };
    });
    expect(info.sharedWrapperHasRwdClass).toBe(false);
    expect(info.sameWrap).toBe(false);
  });

  test("a single table in its own .table-wrapper still recycles it", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 600 });
    await page.goto(fixture("shared-wrapper.html"));
    await page.waitForTimeout(250);

    const info = await page.evaluate(() => {
      const t = document.getElementById("t-solo");
      const parent = t.parentElement;
      return { isSameElement: parent === t.closest(".rwd-table-wrap"), hasClass: parent.classList.contains("table-wrapper") };
    });
    expect(info.isSameElement).toBe(true);
    expect(info.hasClass).toBe(true);
  });
});

test.describe("min-width.html — v2.0.6 / v2.0.7 / v2.0.10", () => {
  test("min-width forces scroll instead of squeezed columns, and the scroll region gets role=region + aria-label", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 600 });
    await page.goto(fixture("min-width.html"));
    await page.waitForTimeout(250);

    const info = await page.evaluate(() => {
      const wrap = document.querySelector(".rwd-table-wrap");
      return {
        isStacked: wrap.classList.contains("is-stacked"),
        overflow: wrap.scrollWidth - wrap.clientWidth,
        tabindex: wrap.getAttribute("tabindex"),
        role: wrap.getAttribute("role"),
        ariaLabel: wrap.getAttribute("aria-label"),
      };
    });
    expect(info.isStacked).toBe(false);
    expect(info.overflow).toBeGreaterThan(0);
    expect(info.tabindex).toBe("0");
    expect(info.role).toBe("region");
    expect(info.ariaLabel).toBeTruthy();
  });

  test("a scrollable table with its own <caption> uses aria-labelledby pointing to it, not aria-label (v2.0.34)", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 600 });
    await page.goto(fixture("min-width.html"));
    await page.waitForTimeout(250);

    const info = await page.evaluate(() => {
      const table = document.getElementById("t-scroll-caption");
      const wrap = table.closest(".rwd-table-wrap");
      const labelledbyId = wrap.getAttribute("aria-labelledby");
      return {
        ariaLabelledby: labelledbyId,
        ariaLabel: wrap.getAttribute("aria-label"),
        captionId: table.caption ? table.caption.id : null,
        pointsToRealElement: labelledbyId ? !!document.getElementById(labelledbyId) : false,
      };
    });
    expect(info.ariaLabelledby).toBeTruthy();
    expect(info.ariaLabel).toBeNull();
    expect(info.ariaLabelledby).toBe(info.captionId);
    expect(info.pointsToRealElement).toBe(true);
  });
});

test.describe("dark-mode.html — v2.0.13", () => {
  test("data-bs-theme=dark on <body> applies the dark palette", async ({ page }) => {
    await page.goto(fixture("dark-mode.html"));
    const color = await page.locator("table.responsiv").evaluate((t) => getComputedStyle(t).color);
    // --rwd-ink dark value is #d5d8db == rgb(213, 216, 219)
    expect(color).toBe("rgb(213, 216, 219)");
  });
});

test.describe("card-style-lines.html", () => {
  test("'lines' card style removes the card border/shadow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto(fixture("card-style-lines.html"));
    await page.waitForTimeout(250);

    const info = await page.locator("#t-lines tbody tr").first().evaluate((tr) => ({
      boxShadow: getComputedStyle(tr).boxShadow,
      borderRadius: getComputedStyle(tr).borderRadius,
    }));
    expect(info.boxShadow).toBe("none");
    expect(["0px", "0px 0px 0px 0px"]).toContain(info.borderRadius);
  });
});

test.describe("rtl.html — dir=rtl support (v2.0.35)", () => {
  test("desktop header text-align resolves logically (start), not hardcoded left", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 300 });
    await page.goto(fixture("rtl.html"));
    const textAlign = await page.locator("#t-rtl th").first().evaluate((th) => getComputedStyle(th).textAlign);
    expect(textAlign).toBe("start");
  });

  test("stacked card's grid mirrors under RTL: the value sits on the visual left, not the right", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 300 });
    await page.goto(fixture("rtl.html"));
    await page.waitForTimeout(250);

    const info = await page.evaluate(() => {
      const td = document.querySelector("#t-rtl td[data-label]");
      const value = td.querySelector(".rwd-value");
      const tdRect = td.getBoundingClientRect();
      const valueRect = value.getBoundingClientRect();
      return {
        textAlign: getComputedStyle(value).textAlign,
        // In RTL the value column should sit near the LEFT edge of
        // its cell (mirrored from LTR, where it sits near the right).
        distanceFromLeftEdge: valueRect.left - tdRect.left,
        distanceFromRightEdge: tdRect.right - valueRect.right,
      };
    });
    expect(info.textAlign).toBe("end");
    expect(info.distanceFromLeftEdge).toBeLessThan(info.distanceFromRightEdge);
  });
});

test.describe("rwdTables:enhanced custom event (v2.0.37)", () => {
  test("does not re-fire for already-enhanced tables on a repeated enhance() call", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1200 });
    await page.goto(fixture("basic.html"));
    await page.evaluate(() => {
      window.__events = [];
      document.addEventListener("rwdTables:enhanced", (e) => {
        window.__events.push({ id: e.detail.table.id, wasReady: e.detail.table.getAttribute("data-rwd-ready") });
      });
    });
    // basic.html's own script already ran before this listener was
    // attached; re-running enhance() should be a no-op for these
    // already-processed tables (data-rwd-ready guard) — exactly the
    // behaviour under test.
    await page.evaluate(() => window.rwdTablesEnhance());
    await page.waitForTimeout(100);
    const events = await page.evaluate(() => window.__events);
    expect(events.length).toBe(0);
  });

  test("fires exactly once for a newly-added table, with detail.table already fully processed", async ({ page }) => {
    await page.goto(fixture("shared-wrapper.html"));
    const events = await page.evaluate(() => {
      const seen = [];
      document.addEventListener("rwdTables:enhanced", (e) => {
        seen.push({ id: e.detail.table.id, wasReady: e.detail.table.getAttribute("data-rwd-ready") });
      });
      const t = document.createElement("table");
      t.className = "responsiv";
      t.id = "t-fresh";
      t.innerHTML = "<thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody>";
      document.body.appendChild(t);
      window.rwdTablesEnhance();
      return seen;
    });
    expect(events.length).toBe(1);
    expect(events[0].id).toBe("t-fresh");
    expect(events[0].wasReady).toBe("1");
  });
});

test.describe("scroll-only.html — rwd-scroll-only opt-in (v2.0.36)", () => {
  test("a table with rwd-scroll-only never stacks and scrolls horizontally instead, even below the breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 500 });
    await page.goto(fixture("scroll-only.html"));
    await page.waitForTimeout(250);

    const info = await page.evaluate(() => {
      const wrap = document.getElementById("t-matrix").closest(".rwd-table-wrap");
      return {
        isStacked: wrap.classList.contains("is-stacked"),
        overflow: wrap.scrollWidth - wrap.clientWidth,
        tabindex: wrap.getAttribute("tabindex"),
        role: wrap.getAttribute("role"),
      };
    });
    expect(info.isStacked).toBe(false);
    expect(info.overflow).toBeGreaterThan(0);
    expect(info.tabindex).toBe("0");
    expect(info.role).toBe("region");
  });

  test("an ordinary table on the same page still stacks normally (the class is per-table, not global)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 500 });
    await page.goto(fixture("scroll-only.html"));
    await page.waitForTimeout(250);

    const isStacked = await page.evaluate(() => {
      const wrap = document.getElementById("t-normal").closest(".rwd-table-wrap");
      return wrap.classList.contains("is-stacked");
    });
    expect(isStacked).toBe(true);
  });
});
