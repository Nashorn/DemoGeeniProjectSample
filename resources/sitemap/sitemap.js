(function () {
  const state = {
    graph: null,
    scale: 1,
    panX: 40,
    panY: 40,
    positions: new Map(),
    selectedSnapshotId: null,
    selectedTriggerId: null
  };

  const viewport = document.getElementById("viewport");
  const stage = document.getElementById("stage");
  const tiles = document.getElementById("tiles");
  const svg = document.getElementById("connections");
  const summary = document.getElementById("summary");
  const zoomLabel = document.getElementById("zoom-label");
  const searchInput = document.getElementById("search-input");

  init();

  async function init() {
    bindControls();
    try {
      const response = await fetch("../data/sitemap.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load sitemap.json");
      state.graph = await response.json();
      render();
      setTimeout(fitView, 80);
    } catch (error) {
      renderEmpty("Sitemap data is not available yet.", "Capture pages and create snapshot triggers, then refresh this page.");
      console.error(error);
    }
  }

  function bindControls() {
    document.getElementById("zoom-in").addEventListener("click", () => setZoom(state.scale + 0.1));
    document.getElementById("zoom-out").addEventListener("click", () => setZoom(state.scale - 0.1));
    document.getElementById("fit-view").addEventListener("click", fitView);
    searchInput.addEventListener("input", applySearch);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPanStart);
  }

  function render() {
    const graph = state.graph || { nodes: [], edges: [], issues: [] };
    if (!graph.nodes.length) {
      renderEmpty("No captured pages yet.", "Captured screen snapshots will appear here as sitemap tiles.");
      return;
    }
    layoutGraph(graph);
    renderTiles(graph);
    renderConnections(graph);
    renderIssues(graph.issues || []);
    summary.textContent = graph.nodes.length + " pages, " + graph.edges.length + " links";
    applyTransform();
  }

  function layoutGraph(graph) {
    const incoming = new Map(graph.nodes.map(node => [node.snapshotId, 0]));
    const outgoing = new Map(graph.nodes.map(node => [node.snapshotId, []]));
    graph.edges.forEach(edge => {
      incoming.set(edge.toSnapshotId, (incoming.get(edge.toSnapshotId) || 0) + 1);
      outgoing.get(edge.fromSnapshotId)?.push(edge.toSnapshotId);
    });

    const roots = graph.nodes.filter(node => (incoming.get(node.snapshotId) || 0) === 0);
    const orderedRoots = roots.length ? roots : graph.nodes.slice(0, 1);
    const depth = new Map();
    const queue = orderedRoots.map(node => ({ id: node.snapshotId, depth: 0 }));

    while (queue.length) {
      const item = queue.shift();
      if (depth.has(item.id) && depth.get(item.id) <= item.depth) continue;
      depth.set(item.id, item.depth);
      (outgoing.get(item.id) || []).forEach(id => queue.push({ id, depth: item.depth + 1 }));
    }

    graph.nodes.forEach(node => { if (!depth.has(node.snapshotId)) depth.set(node.snapshotId, 0); });
    const groups = new Map();
    graph.nodes.forEach(node => {
      const d = depth.get(node.snapshotId) || 0;
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d).push(node);
    });

    state.positions.clear();
    const cardWidth = 236;
    const columnGap = 170;
    const rowGap = 72;
    let maxX = 0;
    let maxY = 0;
    Array.from(groups.keys()).sort((a, b) => a - b).forEach(column => {
      const columnNodes = groups.get(column);
      columnNodes.forEach((node, row) => {
        const height = getCardHeight(node);
        const x = 44 + column * (cardWidth + columnGap);
        const y = 44 + row * (height + rowGap);
        state.positions.set(node.snapshotId, { x, y, width: cardWidth, height });
        maxX = Math.max(maxX, x + cardWidth + 80);
        maxY = Math.max(maxY, y + height + 80);
      });
    });
    stage.style.width = Math.max(maxX, viewport.clientWidth) + "px";
    stage.style.height = Math.max(maxY, viewport.clientHeight) + "px";
  }

  function getCardHeight(node) {
    return Math.max(184, 114 + Math.max(node.triggers.length, 1) * 56);
  }

  function renderTiles(graph) {
    tiles.innerHTML = "";
    graph.nodes.forEach(node => {
      const pos = state.positions.get(node.snapshotId);
      const card = document.createElement("article");
      card.className = "sitemap-card";
      card.dataset.snapshotId = node.snapshotId;
      card.style.left = pos.x + "px";
      card.style.top = pos.y + "px";
      card.style.height = pos.height + "px";
      card.innerHTML = "<h2></h2><span class=\"badge\"></span><div class=\"trigger-list\"></div>";
      card.querySelector("h2").textContent = node.label || "Untitled";
      card.querySelector(".badge").textContent = node.kind || "Snapshot";
      card.addEventListener("click", event => {
        if (event.target.closest(".trigger-row")) return;
        selectSnapshot(node.snapshotId);
      });

      const list = card.querySelector(".trigger-list");
      if (!node.triggers.length) {
        const row = document.createElement("div");
        row.className = "trigger-row is-unresolved";
        row.textContent = "No triggers";
        list.appendChild(row);
      } else {
        node.triggers.forEach(trigger => {
          const row = document.createElement("button");
          row.type = "button";
          row.className = "trigger-row";
          if (trigger.hasNavigationAction && !trigger.targetSnapshotId) row.classList.add("is-unresolved");
          row.dataset.triggerId = trigger.id;
          row.dataset.targetSnapshotId = trigger.targetSnapshotId || "";
          row.innerHTML = "<span></span><i class=\"trigger-target\"></i>";
          row.querySelector("span").textContent = trigger.label || trigger.id;
          row.addEventListener("click", event => {
            event.stopPropagation();
            selectTrigger(node.snapshotId, trigger);
          });
          row.addEventListener("mouseenter", () => previewTrigger(node.snapshotId, trigger));
          row.addEventListener("mouseleave", () => applySelection());
          list.appendChild(row);
        });
      }
      tiles.appendChild(card);
    });
  }

  function renderConnections(graph) {
    svg.innerHTML = "";
    svg.setAttribute("width", stage.style.width);
    svg.setAttribute("height", stage.style.height);
    graph.edges.forEach(edge => {
      const from = state.positions.get(edge.fromSnapshotId);
      const to = state.positions.get(edge.toSnapshotId);
      if (!from || !to) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.dataset.fromSnapshotId = edge.fromSnapshotId;
      line.dataset.toSnapshotId = edge.toSnapshotId;
      line.dataset.triggerIds = edge.triggerIds.join(",");
      const start = getEdgePoint(from, to, "from");
      const end = getEdgePoint(from, to, "to");
      line.setAttribute("x1", start.x);
      line.setAttribute("y1", start.y);
      line.setAttribute("x2", end.x);
      line.setAttribute("y2", end.y);
      svg.appendChild(line);
      if (edge.triggerIds.length > 1) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.classList.add("edge-count");
        label.setAttribute("x", (start.x + end.x) / 2);
        label.setAttribute("y", (start.y + end.y) / 2 - 8);
        label.textContent = edge.triggerIds.length;
        svg.appendChild(label);
      }
    });
  }

  function getEdgePoint(from, to, side) {
    const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    if (Math.abs(toCenter.x - fromCenter.x) > Math.abs(toCenter.y - fromCenter.y)) {
      return side === "from"
        ? { x: toCenter.x > fromCenter.x ? from.x + from.width : from.x, y: fromCenter.y }
        : { x: toCenter.x > fromCenter.x ? to.x : to.x + to.width, y: toCenter.y };
    }
    return side === "from"
      ? { x: fromCenter.x, y: toCenter.y > fromCenter.y ? from.y + from.height : from.y }
      : { x: toCenter.x, y: toCenter.y > fromCenter.y ? to.y : to.y + to.height };
  }

  function selectSnapshot(snapshotId) {
    state.selectedSnapshotId = state.selectedSnapshotId === snapshotId ? null : snapshotId;
    state.selectedTriggerId = null;
    applySelection();
  }

  function selectTrigger(snapshotId, trigger) {
    state.selectedSnapshotId = snapshotId;
    state.selectedTriggerId = state.selectedTriggerId === trigger.id ? null : trigger.id;
    applySelection();
  }

  function previewTrigger(snapshotId, trigger) {
    applySelection({ snapshotId, triggerId: trigger.id, targetSnapshotId: trigger.targetSnapshotId });
  }

  function applySelection(override) {
    const snapshotId = override?.snapshotId || state.selectedSnapshotId;
    const triggerId = override?.triggerId || state.selectedTriggerId;
    const targetSnapshotId = override?.targetSnapshotId || getSelectedTriggerTarget(snapshotId, triggerId);
    const hasSelection = !!(snapshotId || triggerId);
    document.querySelectorAll(".sitemap-card").forEach(card => {
      const id = card.dataset.snapshotId;
      const related = id === snapshotId || id === targetSnapshotId || isConnected(id, snapshotId);
      card.classList.toggle("is-dimmed", hasSelection && !related);
      card.classList.toggle("is-active", id === snapshotId);
      card.classList.toggle("is-target", id === targetSnapshotId);
    });
    document.querySelectorAll(".trigger-row").forEach(row => {
      row.classList.toggle("is-selected", !!triggerId && row.dataset.triggerId === triggerId);
    });
    svg.querySelectorAll("line").forEach(line => {
      const activeByTrigger = triggerId && line.dataset.triggerIds.split(",").includes(triggerId);
      const activeBySnapshot = !triggerId && snapshotId && (line.dataset.fromSnapshotId === snapshotId || line.dataset.toSnapshotId === snapshotId);
      line.classList.toggle("is-active", !!(activeByTrigger || activeBySnapshot));
      line.classList.toggle("is-muted", hasSelection && !(activeByTrigger || activeBySnapshot));
    });
  }

  function getSelectedTriggerTarget(snapshotId, triggerId) {
    if (!snapshotId || !triggerId) return null;
    const node = state.graph.nodes.find(item => item.snapshotId === snapshotId);
    return node?.triggers.find(trigger => trigger.id === triggerId)?.targetSnapshotId || null;
  }

  function isConnected(candidateId, selectedId) {
    if (!candidateId || !selectedId || !state.graph) return false;
    return state.graph.edges.some(edge =>
      (edge.fromSnapshotId === selectedId && edge.toSnapshotId === candidateId) ||
      (edge.toSnapshotId === selectedId && edge.fromSnapshotId === candidateId)
    );
  }

  function applySearch() {
    const query = searchInput.value.trim().toLowerCase();
    document.querySelectorAll(".sitemap-card").forEach(card => {
      const node = state.graph.nodes.find(item => item.snapshotId === card.dataset.snapshotId);
      const haystack = [node?.label, node?.url, ...(node?.triggers || []).map(trigger => trigger.label)].join(" ").toLowerCase();
      card.classList.toggle("is-dimmed", !!query && !haystack.includes(query));
    });
  }

  function onWheel(event) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      setZoom(state.scale + (event.deltaY < 0 ? 0.08 : -0.08));
      return;
    }
    state.panX -= event.deltaX;
    state.panY -= event.deltaY;
    applyTransform();
  }

  function onPanStart(event) {
    if (event.target.closest("button, input")) return;
    viewport.classList.add("is-panning");
    const start = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY };
    const move = moveEvent => {
      state.panX = start.panX + moveEvent.clientX - start.x;
      state.panY = start.panY + moveEvent.clientY - start.y;
      applyTransform();
    };
    const up = () => {
      viewport.classList.remove("is-panning");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function setZoom(value) {
    state.scale = Math.max(0.35, Math.min(1.8, value));
    applyTransform();
  }

  function fitView() {
    if (!state.positions.size) return;
    const bounds = Array.from(state.positions.values()).reduce((acc, pos) => ({
      minX: Math.min(acc.minX, pos.x),
      minY: Math.min(acc.minY, pos.y),
      maxX: Math.max(acc.maxX, pos.x + pos.width),
      maxY: Math.max(acc.maxY, pos.y + pos.height)
    }), { minX: Infinity, minY: Infinity, maxX: 0, maxY: 0 });
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    state.scale = Math.max(0.35, Math.min(1.15, Math.min((viewport.clientWidth - 80) / width, (viewport.clientHeight - 80) / height)));
    state.panX = 40 - bounds.minX * state.scale;
    state.panY = 40 - bounds.minY * state.scale;
    applyTransform();
  }

  function applyTransform() {
    stage.style.transform = "translate(" + state.panX + "px, " + state.panY + "px) scale(" + state.scale + ")";
    zoomLabel.textContent = Math.round(state.scale * 100) + "%";
  }

  function renderIssues(issues) {
    const panel = document.getElementById("issues");
    if (!issues.length) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    panel.innerHTML = "<h2>Sitemap issues</h2><ul></ul>";
    const list = panel.querySelector("ul");
    issues.slice(0, 6).forEach(issue => {
      const li = document.createElement("li");
      li.textContent = issue.message || issue.type;
      list.appendChild(li);
    });
  }

  function renderEmpty(title, copy) {
    summary.textContent = "No sitemap data";
    tiles.innerHTML = "<div class=\"empty-state\"><strong></strong><p></p></div>";
    tiles.querySelector("strong").textContent = title;
    tiles.querySelector("p").textContent = copy;
  }
})();