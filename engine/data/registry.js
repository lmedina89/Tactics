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

    for (const p of ['aegis','crimson']) {
      const value = await get(`data/factions/${p}.json`);
      this.factions.set(value.id, value);
    }
    for (const p of ['infantry','wheeled','tracked']) {
      const value = await get(`data/locomotors/${p}.json`);
      this.locomotors.set(value.id, value);
    }
    for (const p of ['aegis_x','hmmwv50','rifleman']) {
      const value = await get(`data/units/${p}.json`);
      this.definitions.set(value.id, value);
    }
    for (const p of ['command_post','vehicle_factory','guardian_turret']) {
      const value = await get(`data/buildings/${p}.json`);
      this.definitions.set(value.id, value);
    }
    return this;
  }

  asset(id) { return this.assets.get(id); }
  faction(id) { return this.factions.get(id); }
  locomotor(id) { return this.locomotors.get(id); }
  definition(id) { return this.definitions.get(id); }
}
