# Crimson Artillery + Infantry Integration — v0.6.6.8

Integrated accepted Crimson assets:

- `crimson_anvil_spg_v002.glb` → new `anvil_spg` long-range artillery definition.
- `crimson_praetorian_exosuit_v002.glb` → new elite `praetorian_exosuit` infantry definition.
- `crimson_line_trooper_v001.glb` → faction-specific authored visual for the shared `rifleman` gameplay role.

## Safety boundary

No files under `engine/`, `renderer/`, or `ui/` were changed. The integration uses the existing data-driven Definition, Weapon, Armor, Locomotor, Production, Team, Render, and faction visual-routing systems.

The Anvil stabilizer roots are preserved in the GLB, but v0.6.6.8 intentionally does **not** invent a new authoritative deploy-state system. Stabilizers remain stowed during gameplay until a source-audited deploy mechanic is introduced. The Anvil is otherwise a real combat unit with long-range projectile fire and barrel recoil.

The new Crimson infantry GLBs do not yet contain baked walk/fire clips. The renderer safely ignores missing clip names, so gameplay remains authoritative while these rigid articulated models use their accepted static combat poses.

## Faction visibility

The shared Aegis UI command sets were not given Crimson-only buttons. Enemy AI can authoritatively produce the Praetorian and Anvil because their definitions are included in the existing production providers and Crimson Team compositions.
