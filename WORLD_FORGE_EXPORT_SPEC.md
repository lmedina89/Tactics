# WorldForge → ForgeRTS Export Contract

**ForgeRTS content contract:** v1  
**First consumer release:** ForgeRTS v0.6.5

WorldForge is an authoring/generation tool. ForgeRTS is the runtime. ForgeRTS must never require WorldForge in order to load or play a map.

## Coordinate and asset conventions

- ForgeRTS uses a Y-up world. X/Z form the ground plane.
- Simulation yaw `0` faces **+Z**. Asset-local forward differences belong in `Render.headingOffset`, not in movement/gameplay code.
- Author visual content at a predictable real-world scale; approximately one visual unit per world meter is preferred for new assets.
- Put an object's visual origin at or near its ground-center unless the asset has a deliberate socket/pivot reason not to.
- Visual GLB bounds are inspection data only. They never silently set health, armor, pathing, collision, footprint, weapon range, speed, or balance.
- Authoritative collision is `Geometry`. Authoritative building occupancy/placement is `Footprint`.

## Export bundle

A WorldForge export may contain:

1. GLB visual assets.
2. One or more asset catalog JSON files.
3. ForgeRTS `GameObjectDefinition` JSON files.
4. A content-pack manifest listing those definitions/catalogs.
5. Map placement JSON containing stable object IDs and definition references.

Minimum map placement fields are:

```json
{
  "id": "town_house_001",
  "definition": "civilian_house_small_01",
  "owner": null,
  "x": 120,
  "z": -45,
  "yaw": 1.5707963268
}
```

`owner` may be omitted/null for WORLD/CIVILIAN/NEUTRAL content. Full gameplay diplomacy is a separate PlayerRelationMap system planned for v0.7.0.

## Definition contract

Every runtime definition must have:

```text
id
name
kind
modules[]
  ContentMeta
  ...gameplay modules...
```

`ContentMeta` supplies the stable authoring/runtime classification:

```json
{
  "type": "ContentMeta",
  "contractVersion": 1,
  "affiliation": "CIVILIAN",
  "categories": ["CIVILIAN", "BUILDING", "RESIDENTIAL"],
  "editorGroup": "TOWN_RESIDENTIAL"
}
```

Supported v1 affiliations:

- `FACTION`
- `CIVILIAN`
- `NEUTRAL`
- `WORLD`

The contract's category list is authoritative and lives in `data/content-contract.json`.

### Buildings

Buildings require at minimum:

```text
ContentMeta
Body
Footprint
Geometry
```

A rendered building normally also has `Render`; combat/destructible content normally has `ArmorSet` and may expose `AITargetable`, `Vision`, `Selectable`, production/power/docking/etc. modules as needed.

### Mobile units

Vehicle/infantry/aircraft definitions require:

```text
ContentMeta
Body
Geometry
Locomotor
```

Their visual asset does not determine locomotion or collision automatically.

### Props

Props may be purely visual or physical. A render-only prop can omit `Geometry`; a blocking/destructible prop should declare the appropriate simulation modules explicitly.

## Walls and gates

Walls/gates use a generic `WallConnection` module rather than concrete wall-ID logic.

```json
{
  "type": "WallConnection",
  "connectionGroup": "civilian_stone_wall",
  "role": "SEGMENT",
  "snapDistance": 1.25,
  "sockets": [
    {"id":"A","x":0,"z":-4,"facing":3.1415926536},
    {"id":"B","x":0,"z":4,"facing":0}
  ]
}
```

Compatible objects share a `connectionGroup`. Roles currently defined are `SEGMENT`, `GATE`, `CORNER`, and `ENDCAP`. Advanced wall-drag placement and authoritative gate open/close pathing are future layers; the data contract is established now so assets do not need to be rebuilt later.

## Content packs

A content pack batches assets/definitions without engine-source edits:

```json
{
  "id": "civilian_town_pack_01",
  "name": "Civilian Town Pack 01",
  "formatVersion": 1,
  "contractVersion": 1,
  "assetCatalogs": ["data/content/town01/assets.json"],
  "definitions": [
    "data/content/town01/house_01.json",
    "data/content/town01/shop_01.json",
    "data/content/town01/wall_01.json"
  ]
}
```

ForgeRTS loads and validates the pack through `DataRegistry`; no switch/case branch should be added for a particular house, tank, wall, gate, or town.

## Town/settlement rule

WorldForge should export a settlement as individual authoritative objects whenever gameplay could care about them:

```text
Town
  House A
  House B
  Shop
  Warehouse
  Wall 01
  Gate 01
  Lamp/prop objects...
```

Do not bake an entire playable town into one monolithic runtime GLB. Individual objects allow later mission logic to protect, capture, destroy, garrison, reveal, count, or identify them separately.

## Asset inspection

Run:

```bash
npm run audit:assets
npm run validate:content
```

The GLB auditor reports visual bounds, embedded animation clips, node/pivot hints, meshes/materials, and a *suggested* geometry envelope. Suggestions are never authoritative gameplay values.

The content validator checks registry references, asset presence/audit coverage, animation clip/node bindings, factory exits, map definitions/placements, required Geometry/Footprints, and other authoring errors.

## Runtime boundary

```text
WorldForge
  author / inspect / generate
        ↓
content pack + JSON + GLB
        ↓
ForgeRTS DataRegistry
        ↓
content validation
        ↓
GameObjects / map placements
        ↓
authoritative simulation + disposable renderer
```

WorldForge and ForgeRTS may share this data contract. They should not share runtime state or require one another's code to execute.
