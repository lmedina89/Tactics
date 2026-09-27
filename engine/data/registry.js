export class DataRegistry {
  constructor() {
    this.assets = new Map();
    this.factions = new Map();
    this.locomotors = new Map();
    this.definitions = new Map();
  }

  async load(base = '.') {
    const get = async (p) => {
      const r = await fetch(`${base}/${p}`);
      if (!r.ok) throw new Error(`Failed to load ${p}: ${r.status}`);
      return r.json();
    };

    const catalog = await get('data/asset-catalog.json');
    for (const [id, value] of Object.entries(catalog.assets)) this.assets.set(id, { id, ...value });

    const registry = await get('data/registry.json');
    for (const p of registry.factions || []) {
      const value = await get(p);
      this._insertUnique(this.factions, value, p);
    }
    for (const p of registry.locomotors || []) {
      const value = await get(p);
      this._insertUnique(this.locomotors, value, p);
    }
    for (const p of registry.definitions || []) {
      const value = await get(p);
      this._insertUnique(this.definitions, value, p);
    }
    return this;
  }

  _insertUnique(map, value, source) {
    if (!value?.id) throw new Error(`Definition missing id: ${source}`);
    if (map.has(value.id)) throw new Error(`Duplicate definition id ${value.id}: ${source}`);
    map.set(value.id, value);
  }

  asset(id) { return this.assets.get(id); }
  faction(id) { return this.factions.get(id); }
  locomotor(id) { return this.locomotors.get(id); }
  definition(id) { return this.definitions.get(id); }
}
