# Wide-shot render prompt

Attach a screenshot of the auw.studio listening room as the reference image, then use:

```
Use the attached image as a reference for composition, camera angle, lighting and mood only. Do not copy its logo, brand name or any text.

Photorealistic architectural interior render, 16:9, highest available resolution. Perfectly symmetrical, front-on view, camera at seated eye height with zero tilt, 35mm lens, everything in sharp focus.

WALL: Raw board-formed grey concrete fills the frame, with fine air pockets, faint horizontal formwork seams and gentle tonal mottling. Two warm-white uplights at floor level wash soft cones of light up the wall behind each speaker, leaving the centre and the corners slightly darker.

DISC: Centred in the upper half, a large matte oxblood-red disc set flush into the wall, about 40% of the frame height, with a faint warm halo of light around its edge.

FLOOR: Smooth pale-grey concrete, a shade darker than the wall, meeting it in a clean line about 85% of the way down the frame.

SPEAKERS: Two identical tall floor-standing speakers, centred at 20% and 80% of the frame width. Walnut cabinets. The upper two-thirds is a front of oxblood woven fabric with one large black paper-cone woofer; the lower third is vertical walnut slats. Soft contact shadows.

AMPLIFIER (centre, on the floor): A stacked vintage hi-fi amplifier about 18% of the frame width.
- Upper unit: smoked dark steel with two rectangular cream VU meter windows side by side. The meter faces are completely blank cream, with no needles, no scale markings and no text. A small unlit red power LED in the top-left corner and a large chrome knob on each side of the meters.
- Lower unit: brushed aluminium with a horizontal slider and five chrome knobs in a row.
- A thin brushed-copper trim line where the two units meet.

TURNTABLES: On each side of the amplifier, a low open-fronted cast-concrete plinth cube. Each one carries a minimal black turntable seen almost edge-on, with a bare matte-black platter and NO record on it; the tonearm rests in its cradle on the right. Inside the left plinth, a short stack of records in plain sleeves. Inside the right plinth, two stacked art books with blank spines.

MOOD: Calm gallery stillness, soft natural shadows, neutral-warm white balance, subtle film grain, no lens flare. Palette: concrete grey, oxblood, walnut and brushed steel, with copper as the only accent.

EXCLUDE: People, plants, cables, any text, logos or lettering anywhere, needles in the meters, records on the turntables, tilted verticals and wide-angle distortion.
```

- **Midjourney:** add `--ar 16:9 --style raw` and pass the screenshot as `--sref`.
- **Gemini / Imagen:** set the aspect ratio to 16:9.
- Upscale to at least 3200 px wide. If the tool still adds records or needles, erase them with its edit/inpaint feature.
