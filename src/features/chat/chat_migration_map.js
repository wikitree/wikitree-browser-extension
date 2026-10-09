// Ancestor migration map (2026-10-03, the "Wow!" visuals): a world map with a
// dot for each birthplace (sized by how many ancestors were born there) and an
// arc for each move (a parent born in one place, their child in another).
// Arcs draw in date order with a running year; an arrow mid-arc shows the
// direction (moving particles made the user dizzy, 2026-10-03).
// along them. Hover an arc or dot for who moved; wheel/drag to zoom and pan.
// The world outlines (world-atlas, ~110 KB) load only when the map opens.
// Data comes from chat_migration_data.js. Places start as countries/regions
// and become towns as chat_geocode looks them up (2026-10-03): the map redraws
// inside the same popup, without replaying, every few seconds and at the end.

import $ from "jquery";
import { select } from "d3-selection";
import "d3-transition";
import { geoNaturalEarth1, geoMercator, geoPath, geoCentroid, geoArea, geoGraticule10 } from "d3-geo";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { scaleSqrt, scaleSequential } from "d3-scale";
import { interpolateYlOrRd, interpolateBlues } from "d3-scale-chromatic";
import { easeCubicOut } from "d3-ease";
import { feature } from "topojson-client";
import { REGION_POINTS, SPLIT_COUNTRIES } from "./chat_migration_data";
import { cachedPoint, geocodeLocations, loadGeocodeCache, pendingLookups } from "./chat_geocode";
import { chartPopupControls, centrePopup, escapeText, injectChartStyles, raiseAboveOtherPopups, saveChart, toggleChartFullScreen } from "./chat_chart_common";

const WIDTH = 960;
const HEIGHT = 540;
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
// world-atlas names that differ from getCountryFromLocation's.
const ATLAS_NAMES = {
  "United States": "United States of America",
  "Czech Republic": "Czechia",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  England: "United Kingdom",
  Scotland: "United Kingdom",
  Wales: "United Kingdom",
  "Northern Ireland": "United Kingdom",
};
// A map background when the places are close together (the user's choice,
// 2026-10-03): Esri's pale World Topo Map tiles, credited in the corner. (CARTO's
// now need an API key.)
const TILE_URL = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`;
const TILE_CREDIT = `Tiles © <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> — Esri, HERE, Garmin, FAO, NOAA, USGS, Ordnance Survey, © OpenStreetMap contributors and the GIS User Community`;
// Local = everything within about this many degrees: map tiles, at any zoom. Once only the UK
// and Ireland; widened (the user, 2026-10-04: "make this map better like we did in England")
// so Ireland → Quebec gets the detailed coast too. Further than that (an emigration to
// Australia) stays on the world outlines, and so do the poles, where Mercator stretches.
// Widened again (the user, 2026-10-09: the Y-DNA map, with matches from Britain to the US and
// Australia, got the plain outlines and the other maps' tiles were better): any spread of towns
// now gets the tiles, the whole world included (the tile zoom follows the fit).
const LOCAL_SPAN = { lon: 350, lat: 125 };
const LOCAL_MAX_LAT = 70;
let worldPromise = null;
let chartCounter = 0;

function loadWorld() {
  if (!worldPromise) {
    worldPromise = import(/* webpackChunkName: "muse-world" */ "world-atlas/countries-110m.json")
      .then((module) => {
        const topology = module.default || module;
        return feature(topology, topology.objects.countries).features;
      })
      .catch((error) => {
        worldPromise = null;
        throw error;
      });
  }
  return worldPromise;
}

// A country's dot: the centroid of its largest polygon (France's isn't in the Atlantic).
function mainCentroid(countryFeature) {
  const geometry = countryFeature.geometry;
  if (geometry?.type !== "MultiPolygon") return geoCentroid(countryFeature);
  let best = null;
  geometry.coordinates.forEach((coordinates) => {
    const polygon = { type: "Polygon", coordinates };
    const area = geoArea(polygon);
    if (!best || area > best.area) best = { area, polygon };
  });
  return geoCentroid(best.polygon);
}

/**
 * migration: from buildMigration. options: {title, fileBase}.
 * Returns a promise for the popup (the outlines load first).
 */
export async function showMigrationMapPopup(firstMigration, options = {}) {
  const [countries] = await Promise.all([loadWorld(), loadGeocodeCache()]);
  // (built before the saved towns loaded: build again with them)
  let migration = firstMigration.refine ? firstMigration.refine(cachedPoint) : firstMigration;
  chartCounter += 1;
  const uid = `wbe-migration-${chartCounter}`;
  $("#wbe-migration-popup").remove();
  injectChartStyles();

  const countryByName = new Map(countries.map((country) => [country.properties.name, country]));
  const atlasCountry = (name) => countryByName.get(ATLAS_NAMES[name] || name);
  const pointOf = (place) => {
    if (place.point) return place.point;
    if (REGION_POINTS[place.key]) return REGION_POINTS[place.key];
    // Just "Canada" (or the US, Australia): its middle is no one's birthplace. Murray's map put a
    // dot in northern Manitoba and drew a move to it (2026-10-05); it counts as not on the map.
    if (SPLIT_COUNTRIES.has(place.key)) return null;
    const country = atlasCountry(place.country || place.key);
    return country ? mainCentroid(country) : null;
  };

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-migration-popup";
  popup.style.display = "flex";
  popup.style.width = "min(1000px, 96vw)";
  popup.style.height = "min(700px, 92vh)";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="replay" title="Play the moves again in date order">Replay</button>
        <button type="button" class="small" data-act="start" title="Zoom to where the earliest moves began">Zoom to the start</button>
        <button type="button" class="small" data-act="reset" title="Reset zoom">Reset</button>
        ${chartPopupControls()}
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        <span class="wbe-migration-year" style="font-size:20px;font-weight:700;min-width:64px;color:#b5452b"></span>
        <input type="range" class="wbe-migration-slider" step="1" title="Drag through the years: the map shows the places and moves up to then" hidden style="width:220px">
        <span class="wbe-migration-status" style="color:#1f4e79;font-weight:600"></span>
        <span class="wbe-chart-spacer"></span>
        <span style="opacity:.65">An arc = a parent born in one place, their child in another · hover for names · scroll to zoom</span>
      </div>
      <div class="wbe-chart-stage" style="background:linear-gradient(#eef4fa,#e3edf6);position:relative"><div class="wbe-chart-tip"></div><div class="wbe-migration-credit" hidden style="position:absolute;right:4px;bottom:2px;font-size:10px;background:rgba(255,255,255,.8);padding:1px 5px;border-radius:3px;color:#444"></div></div>
      <div class="wbe-chart-footer">
        <div class="wbe-chart-stats"></div>
        <div class="wbe-chart-legend"></div>
      </div>
    </div>`;
  document.body.appendChild(popup);
  centrePopup(popup);
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Ancestor migrations";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const yearLabel = popup.querySelector(".wbe-migration-year");
  const slider = popup.querySelector(".wbe-migration-slider");
  const credit = popup.querySelector(".wbe-migration-credit");
  // The current drawing's controls, for the header buttons.
  let view = null;
  let touched = false;
  let pinned = false;

  // Draws (or redraws) the map inside the popup; animate = the date-order reveal.
  function draw(animate) {
    if (view) view.stop();
    select(stage).select("svg").remove();
    pinned = false;
    tip.style.opacity = 0;
    tip.style.pointerEvents = "";
    const places = migration.places.map((place) => ({ ...place, point: pointOf(place) })).filter((place) => place.point);
    const placeByKey = new Map(places.map((place) => [place.key, place]));
    const flows = migration.flows.filter((flow) => placeByKey.has(flow.from) && placeByKey.has(flow.to));
    const unmapped = migration.places.length - places.length;
    const svg = select(stage)
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("font-family", FONT)
      .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    const viewport = svg.append("g");

    // Fit the projection to the places, with room around them, but never
    // closer than a region about the size of western Europe (countries) or a
    // county or two (towns, on map tiles).
    const lons = places.map((place) => place.point[0]);
    const lats = places.map((place) => place.point[1]);
    const hasTowns = migration.places.some((place) => place.point);
    const local =
      hasTowns &&
      places.length > 0 &&
      Math.max(...lons) - Math.min(...lons) < LOCAL_SPAN.lon &&
      Math.max(...lats) - Math.min(...lats) < LOCAL_SPAN.lat &&
      Math.max(...lats.map(Math.abs)) < LOCAL_MAX_LAT;
    const projection = local ? geoMercator() : geoNaturalEarth1();
    const focus = { type: "MultiPoint", coordinates: places.map((place) => place.point) };
    const [lon0, lat0] = places[0]?.point || [0, 0];
    projection.fitExtent(
      [
        [90, 70],
        [WIDTH - 90, HEIGHT - 70],
      ],
      places.length > 1 ? focus : local ? { type: "MultiPoint", coordinates: [[lon0 - 1.5, lat0 - 1], [lon0 + 1.5, lat0 + 1]] } : { type: "MultiPoint", coordinates: [[-30, 10], [40, 65]] }
    );
    // (tiles: about zoom level 11; towns on the world map: Wem → Birkenhead; countries: western Europe)
    const maxScale = local ? 50000 : hasTowns ? 7000 : 900;
    if (projection.scale() > maxScale) {
      const centre = geoCentroid(focus);
      projection.scale(maxScale);
      const [cx, cy] = projection(centre);
      const [tx, ty] = projection.translate();
      projection.translate([tx + WIDTH / 2 - cx, ty + HEIGHT / 2 - cy]);
    }
    const path = geoPath(projection);

    const countByCountry = new Map();
    places.forEach((place) => {
      const name = ATLAS_NAMES[place.country] || place.country;
      countByCountry.set(name, (countByCountry.get(name) || 0) + place.count);
    });
    const maxCountryCount = Math.max(1, ...countByCountry.values());
    const countryFill = scaleSequential((t) => interpolateBlues(0.18 + t * 0.5)).domain([0, maxCountryCount]);

    const tilesLayer = viewport.append("g").attr("pointer-events", "none");
    credit.innerHTML = local ? TILE_CREDIT : "";
    credit.hidden = !local;
    if (!local) viewport.append("path").attr("d", path(geoGraticule10())).attr("fill", "none").attr("stroke", "#c9d6e3").attr("stroke-width", 0.5);
    viewport
      .append("g")
      .attr("display", local ? "none" : null)
      .selectAll("path")
      .data(countries)
      .join("path")
      .attr("d", path)
      .attr("fill", (country) => (countByCountry.has(country.properties.name) ? countryFill(countByCountry.get(country.properties.name)) : "#f7f5f0"))
      .attr("stroke", "#b9c2cc")
      .attr("stroke-width", 0.5)
      .attr("vector-effect", "non-scaling-stroke");

    const arcsLayer = viewport.append("g").attr("fill", "none");
    const arrowsLayer = viewport.append("g").attr("pointer-events", "none");
    const dotsLayer = viewport.append("g");
    const labelsLayer = viewport.append("g").attr("pointer-events", "none");

    const years = flows.map((flow) => flow.firstYear).filter(Boolean);
    const colourYear = scaleSequential((t) => interpolateYlOrRd(0.35 + t * 0.6)).domain(
      years.length ? [Math.min(...years), Math.max(Math.max(...years), Math.min(...years) + 1)] : [0, 1]
    );
    const colourOf = (flow) => (flow.firstYear ? colourYear(flow.firstYear) : "#8a8a8a");
    const maxFlow = Math.max(1, ...flows.map((flow) => flow.count));
    const strokeOf = (flow) => 1.6 + (flow.count / maxFlow) * 4.5;
    const radius = scaleSqrt()
      .domain([0, Math.max(1, ...places.map((place) => place.count))])
      .range([0, 16]);

    // A curved arc, bulging to the left of the direction of travel.
    function arcPath(flow) {
      const [x1, y1] = projection(placeByKey.get(flow.from).point);
      const [x2, y2] = projection(placeByKey.get(flow.to).point);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const bend = Math.min(0.35, 60 / Math.max(1, Math.hypot(dx, dy)) + 0.18);
      const cx = (x1 + x2) / 2 - dy * bend;
      const cy = (y1 + y2) / 2 + dx * bend;
      return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
    }

    // A click pins the tip, so its names can be clicked through to the profiles.
    function placeTip(event, html, pin = false) {
      if (pinned && !pin) return;
      pinned = pin;
      tip.classList.toggle("wbe-chart-tip-pinned", pin);
      tip.style.pointerEvents = pin ? "auto" : "";
      tip.innerHTML = html + (pin ? `<div class="wbe-chart-tip-hint">Click a name to open the profile · click the map to close</div>` : "");
      const rect = stage.getBoundingClientRect();
      tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
      tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 130)}px`;
      tip.style.opacity = 1;
    }
    const hideTip = () => {
      if (!pinned) tip.style.opacity = 0;
    };
    const personLink = (label, wtid) =>
      wtid ? `<a href="/wiki/${encodeURIComponent(wtid)}" target="_blank" rel="noopener" title="Open ${escapeText(wtid)} in a new tab">${escapeText(label)}</a>` : escapeText(label);
    const flowTip = (flow, all) => {
      const shown = all ? flow.examples : flow.examples.slice(0, 4);
      return `<div class="wbe-chart-tip-rel">${flow.count} move${flow.count === 1 ? "" : "s"}${flow.firstYear ? ` · by ${flow.firstYear}` : ""}</div>
        <b>${escapeText(flow.from)} → ${escapeText(flow.to)}</b>
        ${shown.map((example) => `<div>${personLink(example.parent, example.parentWtid)} → ${personLink(example.child, example.childWtid)}</div>`).join("")}
        ${flow.count > shown.length ? `<div class="wbe-chart-tip-hint">…and ${flow.count - shown.length} more</div>` : ""}
        ${all ? "" : `<div class="wbe-chart-tip-hint">${escapeText(options.arcHint || "Parent → child born in the new place")} · click to pin</div>`}`;
    };
    const placeTipHtml = (place, all) => {
      const people = place.people?.length ? place.people : place.names.map((label) => ({ label, wtid: "" }));
      const shown = all ? people : people.slice(0, 6);
      return `<div class="wbe-chart-tip-rel">Birthplace</div><b>${escapeText(place.key)}</b>
        ${(place.locations || []).filter((text) => text && text !== place.key).map((text) => `<div class="wbe-chart-tip-hint">${escapeText(text)}</div>`).join("")}
        <div>${place.count} ${escapeText(options.peopleWord || "ancestor")}${place.count === 1 ? "" : "s"} born here:</div>
        ${shown.map((person) => `<div>${personLink(person.label, person.wtid)}</div>`).join("")}
        ${place.count > shown.length ? `<div class="wbe-chart-tip-hint">…and ${place.count - shown.length} more</div>` : ""}
        ${all ? "" : `<div class="wbe-chart-tip-hint">Click to pin · double-click to zoom in</div>`}`;
    };
    svg.on("click.unpin", () => {
      if (!pinned) return;
      pinned = false;
      tip.classList.remove("wbe-chart-tip-pinned");
      tip.style.pointerEvents = "";
      tip.style.opacity = 0;
    });

    const arcs = arcsLayer
      .selectAll("path")
      .data(flows)
      .join("path")
      .attr("d", arcPath)
      .attr("stroke", colourOf)
      .attr("stroke-width", strokeOf)
      .attr("stroke-linecap", "round")
      .attr("stroke-opacity", 0.85)
      .attr("vector-effect", "non-scaling-stroke")
      .style("cursor", "pointer")
      .on("mousemove", function (event, flow) {
        select(this).attr("stroke-opacity", 1).attr("stroke-width", strokeOf(flow) + 2.5);
        placeTip(event, flowTip(flow, false));
      })
      .on("click", (event, flow) => {
        event.stopPropagation();
        placeTip(event, flowTip(flow, true), true);
      })
      .on("mouseleave", function (event, flow) {
        select(this).attr("stroke-opacity", 0.85).attr("stroke-width", strokeOf(flow));
        hideTip();
      });

    let zoomK = 1;
    const state = { playTimer: null };
    const dotRadius = (place) => Math.max(3.5, radius(place.count)) / zoomK ** 0.75;
    dotsLayer
      .selectAll("circle")
      .data(places)
      .join("circle")
      .attr("cx", (place) => projection(place.point)[0])
      .attr("cy", (place) => projection(place.point)[1])
      .attr("r", dotRadius)
      .attr("vector-effect", "non-scaling-stroke")
      .style("cursor", "pointer")
      .on("click", (event, place) => {
        event.stopPropagation();
        placeTip(event, placeTipHtml(place, true), true);
      })
      .on("dblclick", (event, place) => {
        // Zoom in on a place, so short moves can be seen.
        event.stopPropagation();
        const [x, y] = projection(place.point);
        const k = Math.max(zoomK * 2.5, 4);
        svg
          .transition()
          .duration(750)
          .call(zoomer.transform, zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(k).translate(-x, -y));
      })
      .attr("fill", "#1f4e79")
      .attr("fill-opacity", 0.78)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.4)
      .on("mousemove", (event, place) => {
        placeTip(event, placeTipHtml(place, false));
      })
      .on("mouseleave", hideTip);

    labelsLayer
      .selectAll("text")
      .data(places.slice(0, 40))
      .join("text")
      .attr("x", (place) => projection(place.point)[0] + dotRadius(place) + 4)
      .attr("y", (place) => projection(place.point)[1])
      .attr("dy", "0.35em")
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("fill", "#1d2b3a")
      .attr("stroke", "rgba(255,255,255,.85)")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke")
      .text((place) => place.key);

    // Labels that would overlap a busier place's label are hidden, then come back as you
    // zoom in and there's room (the places are sorted busiest first).
    function declutterLabels() {
      const kept = [];
      const pad = 2 / zoomK;
      labelsLayer.selectAll("text").each(function () {
        if (this.getAttribute("display") === "none") return;
        this.removeAttribute("visibility");
        let box;
        try {
          box = this.getBBox();
        } catch (error) {
          return;
        }
        if (!box.width) return;
        const hit = kept.some((other) => box.x < other.x + other.width + pad && other.x < box.x + box.width + pad && box.y < other.y + other.height + pad && other.y < box.y + box.height + pad);
        if (hit) this.setAttribute("visibility", "hidden");
        else kept.push(box);
      });
    }

    // An arrowhead halfway along each arc, pointing parent → child. For the
    // curve M p0 Q c p2, the midpoint is p0/4 + c/2 + p2/4 and the direction there is p2 − p0.
    const arrowAt = (flow) => {
      const [x1, y1] = projection(placeByKey.get(flow.from).point);
      const [x2, y2] = projection(placeByKey.get(flow.to).point);
      const [, cx, cy] = arcPath(flow).match(/Q([-\d.e]+),([-\d.e]+)/).map(Number);
      const x = x1 / 4 + cx / 2 + x2 / 4;
      const y = y1 / 4 + cy / 2 + y2 / 4;
      const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      return `translate(${x},${y}) rotate(${angle}) scale(${(0.8 + strokeOf(flow) / 4) / zoomK})`;
    };
    const arrows = arrowsLayer
      .selectAll("path")
      .data(flows)
      .join("path")
      .attr("d", "M5,0 L-4,-4.5 L-2,0 L-4,4.5 Z")
      .attr("fill", colourOf)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.8)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("transform", arrowAt);

    // The year slider: places and moves up to a year (undated ones only at the end).
    const sliderYears = [...years, ...places.map((place) => place.firstYear).filter(Boolean)];
    const yearRange = sliderYears.length ? [Math.min(...sliderYears), Math.max(...sliderYears)] : null;
    if (yearRange && yearRange[1] > yearRange[0]) {
      slider.min = String(yearRange[0]);
      slider.max = String(yearRange[1]);
      slider.value = slider.max;
      slider.hidden = false;
    } else slider.hidden = true;
    function showUpTo(year) {
      const end = year >= yearRange[1];
      const shown = (firstYear) => (firstYear ? firstYear <= year : end);
      arcs.interrupt().attr("stroke-dasharray", null).attr("stroke-dashoffset", null).attr("display", (flow) => (shown(flow.firstYear) ? null : "none"));
      arrows.interrupt().attr("opacity", 1).attr("display", (flow) => (shown(flow.firstYear) ? null : "none"));
      dotsLayer.selectAll("circle").interrupt().attr("r", dotRadius).attr("display", (place) => (shown(place.firstYear) ? null : "none"));
      labelsLayer.selectAll("text").attr("display", (place) => (shown(place.firstYear) ? null : "none"));
      declutterLabels();
      yearLabel.textContent = end ? `${yearRange[0]}–${yearRange[1]}` : String(year);
    }
    slider.oninput = () => {
      touched = true;
      clearTimeout(state.playTimer);
      showUpTo(Number(slider.value));
    };

    // The reveal: arcs draw in date order while the year counts up.
    function play() {
      clearTimeout(state.playTimer);
      if (yearRange) slider.value = slider.max;
      arcs.attr("display", null);
      dotsLayer.selectAll("circle").attr("display", null);
      labelsLayer.selectAll("text").attr("display", null);
      declutterLabels();
      const total = Math.min(9000, Math.max(2600, flows.length * 260));
      const step = flows.length ? total / flows.length : 0;
      arcs.each(function (flow, index) {
        const length = this.getTotalLength?.() || 0;
        select(this)
          .interrupt()
          .attr("stroke-dasharray", `${length} ${length}`)
          .attr("stroke-dashoffset", length)
          .transition()
          .delay(index * step)
          .duration(900)
          .ease(easeCubicOut)
          .attr("stroke-dashoffset", 0)
          .on("start", () => {
            if (flow.firstYear) yearLabel.textContent = String(flow.firstYear);
          })
          .on("end", function () {
            select(this).attr("stroke-dasharray", null);
          });
      });
      // (each arrow appears as its arc finishes drawing)
      arrows
        .interrupt()
        .attr("display", null)
        .attr("opacity", 0)
        .transition()
        .delay((flow, index) => index * step + 700)
        .duration(300)
        .attr("opacity", 1);
      dotsLayer
        .selectAll("circle")
        .interrupt()
        .attr("r", 0)
        .transition()
        .delay((place, index) => index * 40)
        .duration(600)
        .ease(easeCubicOut)
        .attr("r", dotRadius);
      state.playTimer = setTimeout(() => {
        if (!popup.isConnected) return;
        yearLabel.textContent = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";
      }, total + 900);
    }

    // The tiles for what's in view at this zoom, swapped in when a zoom or pan ends
    // (the old ones stay underneath until the new ones have had time to load).
    function updateTiles(transform) {
      if (!local) return;
      const s = projection.scale() * transform.k;
      const z = Math.max(0, Math.min(18, Math.round(Math.log2((2 * Math.PI * s) / 256))));
      const n = 2 ** z;
      const size = (2 * Math.PI * projection.scale()) / n;
      const [tx, ty] = projection.translate();
      const x0 = tx - Math.PI * projection.scale();
      const y0 = ty - Math.PI * projection.scale();
      const [vx0, vx1] = [(0 - transform.x) / transform.k, (WIDTH - transform.x) / transform.k];
      const [vy0, vy1] = [(0 - transform.y) / transform.k, (HEIGHT - transform.y) / transform.k];
      const tiles = [];
      for (let x = Math.floor((vx0 - x0) / size); x <= Math.floor((vx1 - x0) / size); x += 1) {
        for (let y = Math.max(0, Math.floor((vy0 - y0) / size)); y <= Math.min(n - 1, Math.floor((vy1 - y0) / size)); y += 1) {
          tiles.push({ x, y, wrapped: ((x % n) + n) % n });
        }
      }
      if (tiles.length > 120) return;
      const key = `${z}:${tiles.map((tile) => `${tile.x},${tile.y}`).join(";")}`;
      if (tilesLayer.attr("data-key") === key) return;
      tilesLayer.attr("data-key", key);
      const old = tilesLayer.selectAll("g");
      tilesLayer
        .append("g")
        .selectAll("image")
        .data(tiles)
        .join("image")
        .attr("href", (tile) => TILE_URL(z, tile.wrapped, tile.y))
        .attr("x", (tile) => x0 + tile.x * size)
        .attr("y", (tile) => y0 + tile.y * size)
        // (a hair over, so no seams show between tiles)
        .attr("width", size * 1.002)
        .attr("height", size * 1.002)
        .attr("preserveAspectRatio", "none");
      setTimeout(() => old.remove(), 900);
    }

    const zoomer = d3zoom()
      .scaleExtent([0.4, 40])
      .on("end", (event) => {
        updateTiles(event.transform);
        declutterLabels();
      })
      .on("zoom", (event) => {
        if (event.sourceEvent) touched = true;
        viewport.attr("transform", event.transform);
        // Keep dots, labels and strokes readable when zoomed in.
        zoomK = event.transform.k;
        dotsLayer.selectAll("circle").attr("r", dotRadius);
        labelsLayer
          .selectAll("text")
          .attr("font-size", 11 / zoomK)
          .attr("stroke-width", 3 / zoomK)
          .attr("x", (place) => projection(place.point)[0] + dotRadius(place) + 4 / zoomK);
        arrows.attr("transform", arrowAt);
      });
    svg.call(zoomer);
    updateTiles(zoomIdentity);
    declutterLabels();

    // Frame the places of the earliest half of the moves (usually the old country).
    function zoomToStart() {
      const early = flows.slice(0, Math.max(1, Math.ceil(flows.length / 2)));
      const keys = new Set(early.flatMap((flow) => [flow.from]));
      const points = [...keys].map((key) => projection(placeByKey.get(key).point));
      if (!points.length) return;
      const xs = points.map((point) => point[0]);
      const ys = points.map((point) => point[1]);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const k = Math.min(10, Math.max(1.5, 0.6 / Math.max((x1 - x0 + 40) / WIDTH, (y1 - y0 + 40) / HEIGHT)));
      svg
        .transition()
        .duration(900)
        .call(zoomer.transform, zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
    }

    const stats = popup.querySelector(".wbe-chart-stats");
    stats.innerHTML = `<strong>${migration.moves.toLocaleString()}</strong>moves · ${places.length} places${
      migration.unplaced || unmapped ? `<br><span style="opacity:.7">${migration.unplaced} with no birthplace${unmapped ? ` · ${unmapped} places not on the map` : ""}</span>` : ""
    }`;
    const legend = popup.querySelector(".wbe-chart-legend");
    if (years.length) {
      const low = Math.min(...years);
      const high = Math.max(...years);
      legend.innerHTML = `<span>Arc colour = when the child was born:</span>
        <span><i style="width:120px;background:linear-gradient(90deg,${[0, 0.25, 0.5, 0.75, 1].map((t) => colourYear(low + t * (high - low))).join(",")})"></i>${low}–${high}</span>
        <span>Arc width = number of moves · dot size = ${escapeText(options.peopleWord || "ancestor")}s born there</span>`;
    } else {
      legend.innerHTML = `<span>Arc width = number of moves · dot size = ${escapeText(options.peopleWord || "ancestor")}s born there</span>`;
    }

    svg.attr("data-uid", uid);
    view = {
      svg,
      play,
      zoomToStart,
      reset: () => svg.transition().duration(400).call(zoomer.transform, zoomIdentity),
      stop: () => {
        clearTimeout(state.playTimer);
        svg.selectAll("*").interrupt();
      },
    };
    if (animate === "year" && yearRange && yearRange[1] > yearRange[0]) {
      // Asked about a year ("where were my ancestors in 1850"): open at that year.
      const year = Math.min(Math.max(Number(options.year), yearRange[0]), yearRange[1]);
      slider.value = String(year);
      showUpTo(year);
    } else if (animate) play();
    else if (yearRange && yearRange[1] > yearRange[0] && Number(slider.value) < yearRange[1] && touched) showUpTo(Math.max(Number(slider.value), yearRange[0]));
    else if (yearRange) showUpTo(yearRange[1]);
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      view?.stop();
      popup.remove();
    } else if (button.dataset.act === "replay") view?.play();
    else if (button.dataset.act === "reset") view?.reset();
    else if (button.dataset.act === "start") view?.zoomToStart();
    else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if (button.dataset.act === "svg" || button.dataset.act === "png") {
      if (view) saveChart(view.svg.node(), options.fileBase || "migration-map", button.dataset.act);
    }
  });

  raiseAboveOtherPopups(popup);
  $(popup).draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
  void start();
  return popup;

  // Towns not looked up yet: wait for the quick pass (a few seconds at most),
  // then play the map with them; the stragglers (Nominatim, one a second)
  // redraw it once at the end, without replaying.
  async function start() {
    const total = firstMigration.refine ? pendingLookups(migration.locations) : 0;
    if (!total) {
      draw(options.year ? "year" : true);
      return;
    }
    const status = popup.querySelector(".wbe-migration-status");
    const waiting = document.createElement("div");
    waiting.className = "wbe-migration-waiting";
    waiting.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;font-size:14px;color:#2f5d1f;font-weight:600";
    // (the extension's loading tree, in a round green frame)
    const treeUrl = typeof chrome !== "undefined" && chrome?.runtime?.getURL ? chrome.runtime.getURL("images/tree.gif") : "images/tree.gif";
    waiting.innerHTML = `<div style="width:100px;height:100px;border-radius:50%;border:4px solid #5a9a32;background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.15)"><img src="${treeUrl}" alt="" style="width:86px;height:auto;display:block"></div><div>Finding the towns on the map…</div>`;
    stage.appendChild(waiting);
    status.title = "Looking up each birthplace on OpenStreetMap (once; they're remembered)";
    status.textContent = `Finding towns… 0/${total}`;
    let drawnAt = 0;
    let changed = false;
    const lookups = geocodeLocations(migration.locations, {
      isWanted: () => popup.isConnected,
      onFound: (done, count) => {
        status.textContent = `Finding towns… ${done}/${count}`;
        if (drawnAt) changed = true;
      },
    });
    await Promise.race([lookups.fast.catch(() => 0), new Promise((resolve) => setTimeout(resolve, 6000))]);
    if (!popup.isConnected) return;
    waiting.remove();
    migration = firstMigration.refine(cachedPoint);
    drawnAt = Date.now();
    draw(options.year ? "year" : true);
    try {
      await lookups.done;
    } catch (error) {
      console.warn("wbe: town lookups stopped", error);
    }
    status.textContent = "";
    if (!popup.isConnected || !changed) return;
    // (after the reveal has finished playing)
    const wait = Math.max(0, drawnAt + 9000 - Date.now());
    setTimeout(() => {
      if (!popup.isConnected) return;
      migration = firstMigration.refine(cachedPoint);
      draw(false);
    }, wait);
  }
}
