# Crimson Citadel + Fortification Integration — v0.6.6.6

## Scope

This patch is deliberately content-first. No ForgeRTS engine, renderer, or UI-engine source file was changed from the exact v0.6.6.5 release.

## Integrated production assets

- `crimson_command_citadel_v001.glb`
- `crimson_wall_straight_8m_v001.glb`
- `crimson_wall_straight_4m_v001.glb`
- `crimson_wall_corner_v001.glb`
- `crimson_wall_junction_v001.glb`
- `crimson_armored_gate_v001.glb`

Every file is copied byte-for-byte from the accepted production asset generated in this conversation.

## HQ routing

`command_post` remains the authoritative shared gameplay definition. Crimson ownership selects `crimson_command_citadel`; Aegis ownership continues selecting `aegis_tactical_command_post`. Crimson uses `AUTHORED` color mode so the old renderer tint is bypassed. No HQ health, footprint, geometry, builder radius, build set, power output, AI category or economy value changed.

The existing Aegis radar animation path remains unchanged. A second procedural binding targets `RadarYawRoot` only when `factionId == crimson`, so the Citadel radar can rotate without altering the Aegis presentation.

## Wall/gate runtime content

Five new definitions register the four wall modules plus gate under connection group `crimson_perimeter`. They use the existing generic `WallConnection` contract and do not add faction-specific engine branches.

The universal junction is intentionally registered with the stable contract role `ENDCAP`; its four sockets still allow it to serve as an end cap, T-junction, or X-junction in future authoring tools without expanding the v1 WallConnection role enum.

## Active-map safety

The construction-validation map contains a short rear/east Crimson fortification run using every module. It is intentionally non-enclosing. The Armored Gate remains closed and path-blocking because authoritative open/close pathing is still future work; placing it at the rear prevents it from blocking the AI's main rally, combat, or harvesting routes.

The normal player build menu was not expanded into separate wall-piece buttons. That preserves the agreed future UX: one Wall tool that chooses straight/corner/junction pieces automatically, plus Gate.

## Regression boundary

Unchanged byte-for-byte from v0.6.6.5:

- `engine/`
- `renderer/`
- `ui/`
- Crimson Skirmish AI build list and production roles
- existing five Crimson production-building asset routes

