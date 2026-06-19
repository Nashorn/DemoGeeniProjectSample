// RecordingRepository.js
// Loads recordings.json (the container of DomMutationRecorder recordings) and
// exposes lookups by recording id / snapshot. Mirrors SnapshotRepository.
export default class RecordingRepository {
  constructor({ path = "../../../resources/data/recordings.json" } = {}) {
    this.path = path;
    this._recordings = new Map(); // id -> recording
    return this.load();
  }

  async load() {
    try {
      const res = await fetch(this.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.recordings)) {
        console.warn(`[RecordingRepository] No recordings found in ${this.path}`);
        return this;
      }
      this._recordings.clear();
      for (const r of data.recordings) {
        this._recordings.set(r.id, r);
      }
    } catch (e) {
      console.error(`[RecordingRepository] Failed to load from ${this.path}`, e);
    }
    return this;
  }

  get(id) {
    return this._recordings.get(id) || null;
  }

  getClip(recordingId, clipId) {
    const recording = this.get(recordingId);
    return recording?.clips?.find(c => c.id === clipId) || null;
  }

  getBySnapshotId(snapshotId) {
    return this.list().filter(r => r.snapshotId === snapshotId);
  }

  list() {
    return Array.from(this._recordings.values());
  }

  find(queryFn) {
    return this.list().filter(queryFn);
  }
}
