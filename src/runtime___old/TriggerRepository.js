import Trigger from "./Trigger.js";

export default class TriggerRepository {
  constructor({ path = "../../../resources/data/triggers.json" } = {}) {
    this.path = path;
    this._triggers = new Map(); // id -> trigger def
    return this.load();
  }

  async load() {
    try {
      const res = await fetch(this.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.triggers) ? raw.triggers : [];
      this._triggers.clear();
      for (const t of list) {
        if (t?.id) this._triggers.set(t.id, new Trigger(t));
      }
    } catch (e) {
      console.error(`[TriggerRepository] Failed to load ${this.path}:`, e);
    }
    return this;
  }

  get(id) {
    return this._triggers.get(id) || null;
  }

  getMany(ids = []) {
    if (!Array.isArray(ids)) return [];
    return ids.map(id => this._triggers.get(id)).filter(Boolean);
  }

  list() {
    return Array.from(this._triggers.values());
  }

  find(predicate) {
    return this.list().filter(predicate);
  }

  /**
   * Resolve triggers from any object that declares `triggers: [id...]`.
   * Works for snapshots, clips, or anything else with a `triggers` array.
   */
  getTriggersBy(obj) {
    const ids = Array.isArray(obj?.triggers) ? obj.triggers : [];
    return this.getMany(ids);
  }
}