// SnapshotRepository.js
export default class SnapshotRepository {
  constructor({ path = "sample-data-snapshots.json" } = {}) {
    this.path = path;
    this._snapshots = new Map(); // id -> snapshot
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
  }

  get(id) {
    return this._snapshots.get(id) || null;
  }

  list() {
    return Array.from(this._snapshots.values());
  }

  find(queryFn) {
    return this.list().filter(queryFn);
  }
}