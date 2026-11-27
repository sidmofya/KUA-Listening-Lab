# Room skin prompts: the five regions of KwaZuri

Each collection can be heard in one of these rooms (Studio → collection → **Room**). A room skin is the
same listening room as `public/assets/scene-wide.jpg`, with the same camera and the same furniture in the
same places, restyled after one region of KwaZuri. The records, VU needles, power LED and the drum's
ripples are drawn live on top of the image, so **the furniture must not move**.

## How to make one

1. Attach today's render, `public/assets/scene-wide.jpg`, as the reference image (an image-edit or
   "image prompt" input, not just a style reference).
2. Paste the shared opening below, then the region's block.
3. 16:9, at least 3200 px wide (upscale if needed). Empty platters, needle-free blank VU meters.
4. Save as `public/assets/skins/<id>.jpg` (JPEG, quality ~82), replacing the draft.
5. Open `/?calibrate&skin=<id>`. If the platters, meter pivots, LED or drum have shifted, drag the copper
   handles onto them and paste the moved entries into that skin's `"overlays"` in `public/skins.json`.

`scripts/draft_skins.py` makes quick drafts of all five from the same text with OpenAI (see the README).

## Shared opening (use for every region)

```
Use the attached image as the exact composition reference. Keep the camera, lens, framing, horizon and
every object's position, size and outline identical: the wall disc, both speakers, the stacked amplifier
with its two blank cream VU meter windows, both concrete plinths with their black turntables, the records
in the left plinth and the books in the right plinth. Change only materials, colours, textures and light
as described below.

Photorealistic architectural interior render, 16:9, perfectly symmetrical, front-on, zero tilt,
everything in sharp focus. Bare matte-black platters with NO records. Meter faces completely blank cream,
no needles, no markings. Calm gallery stillness, subtle film grain, no lens flare.

EXCLUDE: people, plants indoors, cables, any text, logos or lettering anywhere, needles in the meters,
records on the turntables, tilted verticals, wide-angle distortion, any change to furniture positions.
```

## harmonic-plains: Harmonic Plains

Open grasslands with gently rolling hills; soft wind melodies and whistling grasses.

```
WALL: Warm wheat-straw lime plaster with fine fibres and faint horizontal striations like wind across
tall grass. Soft golden late-afternoon light washes up from the floor behind each speaker; the room feels
open and airy.
DISC: The wall disc becomes a matte sage-green and muted gold woven-grass surface, tightly hand-woven in
concentric rings, with a faint warm halo.
FLOOR: Pale bleached oak boards, a shade darker than the wall.
SPEAKERS: Same walnut cabinets; the grille fabric is a sage-green woven grass-cloth.
ACCENT: Brushed brass replaces copper on the amplifier trim.
PALETTE: wheat, sage, pale gold, cream, brass.
```

## rhythmic-ridge: Rhythmic Ridge

Volcanic mountains and hot springs; deep percussion, bass, syncopation.

```
WALL: Porous dark volcanic basalt with fine vesicles and subtle rough strata. Low ember-orange uplights
glow up behind each speaker; a faint warm haze hangs near the floor like hot-spring steam.
DISC: The wall disc becomes polished black obsidian with a thin glowing molten-orange rim and a soft
ember halo.
FLOOR: Polished black basalt, catching the warm light in soft reflections.
SPEAKERS: Same walnut cabinets; the grille fabric is a deep ember-red weave.
ACCENT: Hot copper trim with a faint glow.
PALETTE: basalt black, charcoal, ember orange, deep red, copper.
```

## melodic-forests: Melodic Forests

Dense, lush forest; layered melodies, woodwinds, shifting keys.

```
WALL: Deep moss-green lime plaster with soft mottling. Dappled green-gold light falls across the wall
as if through a forest canopy, leaf-shadow patterns moving over the plaster.
DISC: The wall disc becomes the end-grain cross-section of an ancient tree: visible growth rings in
warm honey and dark brown, oiled and smooth, with a faint green-gold halo.
FLOOR: Dark smoked oak boards.
SPEAKERS: Same walnut cabinets; the grille fabric is a deep forest-green weave.
ACCENT: Aged bronze trim with a green patina.
PALETTE: moss, forest green, honey wood, dark oak, bronze.
```

## silent-sands: Silent Sands

Vast desert dunes and rocky outcrops; minimal, ambient, meditative tones.

```
WALL: Layered sandstone or rammed earth with fine horizontal strata in pale ochre, sand and rose. Very
soft, diffuse, even light with long gentle shadows; the stillest and quietest of the rooms.
DISC: The wall disc becomes a pale sand surface raked with fine concentric dune-ripple lines, barely
darker than the wall, with a faint warm halo.
FLOOR: Smooth pale sandstone, a shade darker than the wall.
SPEAKERS: Same walnut cabinets; the grille fabric is undyed natural linen.
ACCENT: Pale satin brass trim.
PALETTE: sand, pale ochre, dusty rose, bone, pale brass.
```

## vibrato-valleys: Vibrato Valleys

Deep winding valleys, caves and underground rivers; resonance, echo, reverb.

```
WALL: Wet dark slate cave stone with natural fissures and a slight sheen. Cool teal light rises from
the floor behind each speaker and plays across the wall as shimmering water caustics.
DISC: The wall disc becomes deep teal stone polished like still water, carved with concentric ripple
rings radiating from the centre, with a cool teal halo.
FLOOR: Dark wet slate with soft reflections of the teal light.
SPEAKERS: Same walnut cabinets; the grille fabric is a deep indigo weave.
ACCENT: Cool silver trim.
PALETTE: slate, deep teal, indigo, silver, wet stone.
```
