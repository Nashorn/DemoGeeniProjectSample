// SnapshotRepository.js
export default class SnapshotRepository {
  constructor({ path = "../../../resources/data/snapshots.json" } = {}) {
    this.path = path;
    this._snapshots = new Map(); // id -> snapshot
    return this.load();
  }

  async load() {
    try {
      const res = await fetch(this.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.snapshots)) {
        console.warn(`[SnapshotRepository] No snapshots found in ${this.path}`);
        return;
      }
      this._snapshots.clear();
      for (const s of data.snapshots) {
        this._snapshots.set(s.id, s);
      }
    } catch (e) {
      console.error(`[SnapshotRepository] Failed to load from ${this.path}`, e);
    }
    return this;
  }

  get(id) {
    return this._snapshots.get(id) || null;
  }

  getByHostPage(current=location.href) {
    for (const snapshot of this._snapshots.values()) {
      if (current.includes(snapshot.filePath)) {
        return snapshot;
      }
    }
    return null;
  }

  getByNamespace(namespace) {
    for (const snapshot of this._snapshots.values()) {
      if (snapshot.namespace === namespace) {
        return snapshot;
      }
    }
    return null;
  }

  getByID(id) {
    return this.get(id);
  }

  list() {
    return Array.from(this._snapshots.values());
  }

  find(queryFn) {
    return this.list().filter(queryFn);
  }
}