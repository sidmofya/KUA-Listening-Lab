"""Draft the KwaZuri room skins with OpenAI image editing.

Restyles public/assets/scene-wide.jpg once per region, using the prompts in
docs/skin-prompts.md (so drafts and final renders share one source), and saves
16:9 JPEGs to public/assets/skins/<id>.jpg.

Drafts are for judging each room's mood in the actual listening room. Final
renders (made from the same prompts) replace them under the same filenames.

Usage (from the repo root):
    python scripts/draft_skins.py                    # all five
    python scripts/draft_skins.py silent-sands       # just one
    python scripts/draft_skins.py --quality medium   # cheaper drafts

Needs: Python 3.9+, Pillow (pip install pillow), and OPENAI_API_KEY in the
environment or in a local .env file (never committed). Optional:
OPENAI_IMAGE_MODEL (default gpt-image-2, as the cover generator uses).
"""

import argparse
import base64
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/assets/scene-wide.jpg"
PROMPTS = ROOT / "docs/skin-prompts.md"
OUT = ROOT / "public/assets/skins"
# The edit endpoint makes 3:2 landscapes; the room is 16:9. The room is placed in a
# 3:2 canvas (edge rows stretched into the bands) and the 16:9 middle is cut back out.
CANVAS = (1536, 1024)
ROOM = (1536, 864)


def api_key():
    key = os.environ.get("OPENAI_API_KEY")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            m = re.match(r"\s*OPENAI_API_KEY\s*=\s*['\"]?([^'\"\s]+)", line)
            if m:
                key = m.group(1)
    if not key:
        sys.exit("OPENAI_API_KEY is not set. Add it to a local .env file (it is gitignored).")
    return key


def prompts():
    text = PROMPTS.read_text(encoding="utf-8")
    blocks = {}
    for heading, body in re.findall(r"^## (.+?)\n(.*?)(?=^## |\Z)", text, re.S | re.M):
        code = re.search(r"```\n(.*?)```", body, re.S)
        if code:
            blocks[heading.split(":")[0].strip()] = code.group(1).strip()
    shared = blocks.pop("Shared opening (use for every region)", None)
    if not shared or not blocks:
        sys.exit(f"Could not read the prompts in {PROMPTS}")
    return shared, blocks


def padded_room():
    room = Image.open(SOURCE).convert("RGB").resize(ROOM, Image.LANCZOS)
    canvas = Image.new("RGB", CANVAS)
    top = (CANVAS[1] - ROOM[1]) // 2
    canvas.paste(room.crop((0, 0, ROOM[0], 1)).resize((ROOM[0], top)), (0, 0))
    canvas.paste(room.crop((0, ROOM[1] - 1, ROOM[0], ROOM[1])).resize((ROOM[0], CANVAS[1] - top - ROOM[1])), (0, top + ROOM[1]))
    canvas.paste(room, (0, top))
    buf = io.BytesIO()
    canvas.save(buf, "PNG")
    return buf.getvalue(), top


def multipart(fields, file_bytes):
    boundary = uuid.uuid4().hex
    parts = []
    for name, value in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="room.png"\r\n'
        f"Content-Type: image/png\r\n\r\n".encode() + file_bytes + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def draft(skin_id, prompt, key, image, top, quality):
    body, ctype = multipart(
        {
            "model": os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-2"),
            "prompt": prompt,
            "size": f"{CANVAS[0]}x{CANVAS[1]}",
            "quality": quality,
            "n": "1",
        },
        image,
    )
    req = urllib.request.Request(
        os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1") + "/images/edits",
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": ctype},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as res:
            data = json.load(res)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:400]
        raise SystemExit(f"{skin_id}: OpenAI said {e.code}: {detail}")
    result = Image.open(io.BytesIO(base64.b64decode(data["data"][0]["b64_json"]))).convert("RGB")
    if result.size != CANVAS:
        result = result.resize(CANVAS, Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{skin_id}.jpg"
    result.crop((0, top, ROOM[0], top + ROOM[1])).save(path, "JPEG", quality=86, optimize=True, progressive=True)
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("ids", nargs="*", help="skin ids to draft (default: all)")
    parser.add_argument("--quality", default="high", choices=["low", "medium", "high"])
    args = parser.parse_args()
    shared, regions = prompts()
    wanted = args.ids or list(regions)
    unknown = [i for i in wanted if i not in regions]
    if unknown:
        sys.exit(f"Unknown skin id(s): {', '.join(unknown)}. Known: {', '.join(regions)}")
    key = api_key()
    image, top = padded_room()
    for skin_id in wanted:
        print(f"Drafting {skin_id} …", flush=True)
        path = draft(skin_id, f"{shared}\n\n{regions[skin_id]}", key, image, top, args.quality)
        print(f"  saved {path.relative_to(ROOT)}")
    print("Done. Check each with /?skin=<id>, and /?calibrate&skin=<id> if anything is out of place.")


if __name__ == "__main__":
    main()
