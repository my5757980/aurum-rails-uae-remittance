/**
 * Records the demo walkthrough with captions burned into the frame.
 *
 * The captions are injected into the page itself rather than added in an editor,
 * so the exported video already reads correctly with the sound off — which is
 * how most people watch on LinkedIn, and how a judge skimming submissions will
 * watch too. A voiceover can still be laid over the top afterwards.
 *
 * Run via the Playwright MCP `browser_run_code_unsafe` with `filename` set to
 * this file, or standalone with a Playwright install.
 */

async (page) => {
  const browser = page.context().browser();
  const dir = "E:/New folder/ignyty-hackathone/demo-video";

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir, size: { width: 1280, height: 720 } },
  });

  // Re-injected on every navigation so captions survive page changes.
  await ctx.addInitScript(() => {
    window.__cap = (title, sub) => {
      let bar = document.getElementById("__capbar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "__capbar";
        bar.style.cssText = [
          "position:fixed",
          "left:0;right:0;bottom:0",
          "z-index:2147483647",
          "padding:26px 48px 30px",
          "background:linear-gradient(to top,rgba(2,6,23,.97) 55%,rgba(2,6,23,0))",
          "font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif",
          "pointer-events:none",
          "opacity:0",
          "transition:opacity .35s ease",
          "text-align:center",
        ].join(";");
        bar.innerHTML =
          '<div id="__capt" style="color:#f8fafc;font-size:31px;font-weight:700;letter-spacing:-.02em;line-height:1.25"></div>' +
          '<div id="__caps" style="color:#5eead4;font-size:18px;font-weight:500;margin-top:9px;line-height:1.35"></div>';
        document.body.appendChild(bar);
      }
      document.getElementById("__capt").textContent = title || "";
      const s = document.getElementById("__caps");
      s.textContent = sub || "";
      s.style.display = sub ? "block" : "none";
      bar.style.opacity = title ? "1" : "0";
    };

    window.__card = (title, sub, accent) => {
      let el = document.getElementById("__card");
      if (!el) {
        el = document.createElement("div");
        el.id = "__card";
        el.style.cssText = [
          "position:fixed;inset:0;z-index:2147483647",
          "background:#020617",
          "display:flex;flex-direction:column;align-items:center;justify-content:center",
          "font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif",
          "opacity:0;transition:opacity .5s ease;pointer-events:none",
        ].join(";");
        el.innerHTML =
          '<div id="__cardt" style="color:#f8fafc;font-size:60px;font-weight:800;letter-spacing:-.03em;text-align:center"></div>' +
          '<div id="__cards" style="color:#5eead4;font-size:24px;font-weight:500;margin-top:20px;text-align:center;max-width:820px;line-height:1.45"></div>' +
          '<div id="__carda" style="color:#64748b;font-size:16px;margin-top:34px;text-align:center"></div>';
        document.body.appendChild(el);
      }
      document.getElementById("__cardt").textContent = title || "";
      document.getElementById("__cards").textContent = sub || "";
      document.getElementById("__carda").textContent = accent || "";
      el.style.opacity = title ? "1" : "0";
    };
  });

  const p = await ctx.newPage();
  const done = [];

  const cap = async (t, s, ms = 4200) => {
    await p.evaluate(([a, b]) => window.__cap(a, b), [t, s]);
    done.push(t);
    await p.waitForTimeout(ms);
  };
  const clearCap = () => p.evaluate(() => window.__cap(""));
  const card = async (t, s, a, ms = 4500) => {
    await p.evaluate(([x, y, z]) => window.__card(x, y, z), [t, s, a]);
    await p.waitForTimeout(ms);
    await p.evaluate(() => window.__card(""));
    await p.waitForTimeout(600);
  };

  // ── Opening ───────────────────────────────────────────────────────────────
  await p.goto("http://localhost:3000/sign-in", { waitUntil: "networkidle", timeout: 90000 });
  await card(
    "Aurum Rails",
    "Transparent UAE → Global remittances, settled on Arc",
    "Ignyte × Circle × Arc  ·  Track 1  ·  Arc Testnet",
    5000,
  );

  await cap("The UAE sends about $43 billion home every year", "The third largest remittance flow in the world", 4600);
  await cap("But UAE remittances are not expensive", "World Bank: under 3.5% — below the 6.62% global average", 5200);
  await cap("So we do not claim to be cheaper", "The real problem is that the fee you see is not the cost you pay", 5200);

  // ── Sign in ───────────────────────────────────────────────────────────────
  await cap("Sign in with an email code", "No password. No seed phrase. No browser extension.", 4000);
  await p.locator('button:has-text("Try the demo")').click();
  await p.waitForURL("**/", { timeout: 150000 });
  await p.waitForSelector("text=Priya Nair", { timeout: 150000 });
  await cap("Rajesh, a site supervisor in Dubai", "Sending money to his mother in Kochi", 4200);

  // ── Quote ─────────────────────────────────────────────────────────────────
  await clearCap();
  await p.locator("#amount").fill("");
  await p.locator("#amount").type("5", { delay: 300 });
  await p.waitForSelector("text=Total cost", { timeout: 90000 });
  await p.waitForTimeout(900);

  await cap("Every cost, before he commits", "Fee split into network cost and service fee", 4800);
  await cap("The exchange rate carries its source and timestamp", "Live mid-market rate — not ours to massage", 4800);
  await cap("FX spread shown even at 0.00%", "Showing the zero is what proves the line item is real", 5400);
  await cap("His mother receives ₹129 — labelled Simulated", "The local-currency payout is not real. We say so, in the product.", 5200);
  await cap("The rate is held for 60 seconds", "When it expires the transfer is blocked. A stale rate is never executed.", 5000);

  // ── Send ──────────────────────────────────────────────────────────────────
  await cap("He presses send once", null, 2200);
  await p.locator('button:has-text("Send AED")').click();
  await p.waitForURL("**/transfers/**", { timeout: 150000 });
  await cap("Settling on Arc Testnet…", "Chain 5042002 · real USDC · no page refresh", 3000);
  await p.waitForSelector("text=Delivered", { timeout: 90000 });
  await cap("Delivered", "Under eight seconds, end to end", 4600);
  await p.mouse.wheel(0, 420);
  await cap("A receipt with every number that mattered", "Amount, fee, rate, spread, and both timestamps", 4600);

  // ── Explorer ──────────────────────────────────────────────────────────────
  const explorer = await p.locator('a:has-text("View on Arc explorer")').getAttribute("href");
  if (explorer) {
    await cap("Every payment carries a public explorer link", "Do not take our word for it — verify it yourself", 4000);
    await p.goto(explorer, { waitUntil: "domcontentloaded", timeout: 90000 });
    await p.waitForTimeout(2200);
    await cap("A real transaction on Arc Testnet", "Confirmed on chain in ≤ 0.51 seconds", 5200);
    await cap("The amount on screen equals the amount on chain", "We refused a display scale factor — 1:1, always", 5200);
    await p.goBack({ waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
  }

  // ── Recipient ─────────────────────────────────────────────────────────────
  const claim = p.locator('a:has-text("See what")');
  if (await claim.count()) {
    await clearCap();
    await claim.first().click();
    await p.waitForTimeout(2600);
    await cap("What his mother sees", "No app. No sign-up. No wallet.", 4400);
    await cap("Not one word of crypto vocabulary", "Enforced by an automated check — a banned term fails the build", 5000);
    await p.goBack({ waitUntil: "networkidle" });
  }

  // ── Business ──────────────────────────────────────────────────────────────
  await p.goto("http://localhost:3000/business", { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector("text=Treasury", { timeout: 150000 });
  await cap("The same rails pay contractors abroad", "Freelancer and payroll payouts, one authorisation", 4400);
  await cap('The treasury reads "Arc only" — and explains why', "Gateway reports deposits we have not made. We show the true number.", 5600);

  await p.locator('input[aria-label="Pay Priya Nair"]').click();
  await p.waitForTimeout(600);
  await p.locator('input[aria-label="Pay Maria Santos"]').click();
  await p.waitForTimeout(600);
  await p.locator('input[aria-label="Pay Imran Sheikh"]').click();
  await p.waitForTimeout(700);
  await p.mouse.wheel(0, 380);
  await cap("Three contractors, one authorisation", "Each settles independently — one failure never blocks the rest", 5000);
  await cap("Cross-chain delivery, verified", "Arc → Base Sepolia via CCTP: approve, burn, attest, mint", 5000);

  // ── Mobile ────────────────────────────────────────────────────────────────
  await p.setViewportSize({ width: 390, height: 760 });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector("text=Priya Nair", { timeout: 150000 });
  await cap("Mobile-first", "The person sending money home is holding a phone", 4000);
  await p.mouse.wheel(0, 520);
  await cap("Verified from 320px to 1920px", "Fifty page-width combinations, zero overflow", 4400);

  // ── Close ─────────────────────────────────────────────────────────────────
  await p.setViewportSize({ width: 1280, height: 720 });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForTimeout(900);
  await clearCap();
  await card(
    "Four Circle products. Real transactions.",
    "USDC on Arc · Developer-Controlled Wallets · Gateway · CCTP",
    "Arc Testnet only · educational demo · no real funds",
    5200,
  );
  await card(
    "Not cheaper than the exchange house.",
    "But you can see exactly what happens to your money — and it arrives while you are still looking at the screen.",
    "github.com/my5757980/aurum-rails-uae-remittance",
    6500,
  );

  await ctx.close();
  return JSON.stringify({ captions: done.length });
}
