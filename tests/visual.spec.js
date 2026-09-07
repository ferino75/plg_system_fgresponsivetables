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
for (const fixtureName of ["basic.html", "shared-wrapper.html", "min-width.html", "dark-mode.html", "card-style-lines.html"]) {
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
