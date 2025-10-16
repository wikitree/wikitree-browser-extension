import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("watchlistFilter").then((result) => {
    if (!result) return;

    if (window.location.href.includes("do_s=1")) return;

    const table = document.querySelector("table");
    if (!table) return;

    // --- Build filter bar ---
    const nextButton = document.querySelector("a.btn.btn-secondary, a[href*='start=']");
    const filterPanel = document.createElement("div");
    filterPanel.className =
        "mb-2 p-2 border border-success rounded d-flex flex-wrap align-items-center";
    filterPanel.innerHTML = `
    <div class="me-5">
      <strong>Management:</strong><br>
      <label><input type="radio" name="mgmt" value="all" checked> All</label>
      <label><input type="radio" name="mgmt" value="managed"> Managed</label>
      <label><input type="radio" name="mgmt" value="nonmanaged"> Non-Managed</label>
    </div>
    <div class="me-5">
      <strong>Gender:</strong><br>
      <label><input type="checkbox" value="male"> Male</label>
      <label><input type="checkbox" value="female"> Female</label>
      <label><input type="checkbox" value="nogender"> No Gender</label>
    </div>
    <div class="me-5">
      <strong>Content Rank:</strong><br>
      <label><input type="checkbox" value="cr0_3"> 0–3</label>
      <label><input type="checkbox" value="cr4_5"> 4–5</label>
      <label><input type="checkbox" value="cr6_7"> 6–7</label>
      <label><input type="checkbox" value="cr8_9"> 8–9</label>
      <label><input type="checkbox" value="cr10"> 10</label>
      <label><input type="checkbox" value="crNone"> No CR</label>
    </div>
  `;

    if (nextButton) { 
        filterPanel.innerHTML += `
            <div class="small mt-2">
                <em>* Filtering applies only to the profiles currently loaded on this page. Use "show all" to run the filter on the entire Watchlist.</em>
            </div>
        `;
    }

    table.before(filterPanel);

    // --- Preprocess rows: tag them with classes ---
    table.querySelectorAll("tr").forEach((row) => {
        if (row.querySelector("th")) return; // skip header

        row.classList.add("watchlist-row");

        const isManaged = !!row.querySelector('a[href*="Help:Profile_Manager"]');
        row.classList.add(isManaged ? "mgmt-managed" : "mgmt-nonmanaged");

        const personCell = row.querySelector("td");
        const genderClass = personCell ? personCell.className : "";
        if (genderClass.includes("person--male")) {
            row.classList.add("gender-male");
        } else if (genderClass.includes("person--female")) {
            row.classList.add("gender-female");
        } else {
            row.classList.add("gender-nogender");
        }

        const crBadge = row.querySelector(".cr-details");
        if (crBadge) {
            const match = crBadge.textContent.match(/CR:(\d+)/);
            if (match) {
                const val = parseInt(match[1], 10);
                if (val <= 3) row.classList.add("cr0_3");
                else if (val <= 5) row.classList.add("cr4_5");
                else if (val <= 7) row.classList.add("cr6_7");
                else if (val <= 9) row.classList.add("cr8_9");
                else if (val === 10) row.classList.add("cr10");
            }
        } else {
            row.classList.add("crNone");
        }
    });

    // --- Style element for rules ---
    const styleEl = document.createElement("style");
    document.head.appendChild(styleEl);

    function applyFilter() {
        const mgmt = filterPanel.querySelector("input[name=mgmt]:checked").value;
        const genders = Array.from(
            filterPanel.querySelectorAll(
                "input[value=male], input[value=female], input[value=nogender]"
            )
        )
            .filter((cb) => cb.checked)
            .map((cb) => `gender-${cb.value}`);
        const crs = Array.from(filterPanel.querySelectorAll("input[value^=cr]"))
            .filter((cb) => cb.checked)
            .map((cb) => cb.value);

        let mgmtSel =
            mgmt === "managed"
                ? ".mgmt-managed"
                : mgmt === "nonmanaged"
                    ? ".mgmt-nonmanaged"
                    : ".mgmt-managed, .mgmt-nonmanaged";

        let genderSel =
            genders.length > 0
                ? genders.map((g) => `.${g}`).join(", ")
                : ".gender-male, .gender-female, .gender-nogender";

        let crSel =
            crs.length > 0
                ? crs.map((c) => `.${c}`).join(", ")
                : ".cr0_3, .cr4_5, .cr6_7, .cr8_9, .cr10, .crNone";

        // Base: hide all rows
        let css = ".watchlist-row { display: none; }";

        // Combine selectors
        const selectors = [];
        mgmtSel.split(",").forEach((m) => {
            genderSel.split(",").forEach((g) => {
                crSel.split(",").forEach((c) => {
                    selectors.push(`tr.watchlist-row${m.trim()}${g.trim()}${c.trim()}`);
                });
            });
        });

        css += selectors.join(", ") + " { display: table-row; }";
        styleEl.textContent = css;
    }

    // Bind events
    filterPanel.querySelectorAll("input").forEach((input) =>
        input.addEventListener("change", applyFilter)
    );

    // Initial run
    applyFilter();
});
