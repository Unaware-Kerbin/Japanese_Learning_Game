"""One-time Japanese speech for Michi Dojo. Reads /tmp/ja-lines.json."""

import asyncio
import hashlib
import json
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio" / "ja"
LINES = Path("/tmp/ja-lines.json")
VOICE = "ja-JP-NanamiNeural"
FALLBACK = "ja-JP-KeitaNeural"
MIN_BYTES = 400


def clip_name(text: str) -> str:
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    return f"{digest}.mp3"


async def synth(text: str, dest: Path, voice: str) -> None:
    comm = edge_tts.Communicate(text, voice)
    await asyncio.wait_for(comm.save(str(dest)), timeout=45)


async def one(sem: asyncio.Semaphore, text: str, dest: Path) -> str:
    async with sem:
        if dest.exists() and dest.stat().st_size >= MIN_BYTES:
            return "skip"
        if dest.exists():
            dest.unlink()
        last = "unknown"
        for voice in (VOICE, FALLBACK):
            for attempt in range(3):
                try:
                    await synth(text, dest, voice)
                    if dest.exists() and dest.stat().st_size >= MIN_BYTES:
                        return "ok" if voice == VOICE else "fallback"
                    last = f"small {dest.stat().st_size if dest.exists() else 0}"
                    if dest.exists():
                        dest.unlink()
                except Exception as exc:  # network blips and rate limits
                    last = str(exc)
                    if dest.exists():
                        dest.unlink()
                    await asyncio.sleep(1.2 * (attempt + 1))
        return f"fail {last}"


async def main() -> None:
    lines = json.loads(LINES.read_text(encoding="utf-8"))
    texts = []
    seen = set()
    for raw in lines:
        text = raw if isinstance(raw, str) else ""
        if not text.strip() or text in seen:
            continue
        seen.add(text)
        texts.append(text)
    OUT.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(8)
    manifest: dict[str, str] = {}
    jobs = []
    for text in texts:
        name = clip_name(text)
        manifest[text] = f"audio/ja/{name}"
        jobs.append(one(sem, text, OUT / name))
    done = 0
    failed: list[str] = []
    counts = {"ok": 0, "skip": 0, "fallback": 0, "fail": 0}
    for coro in asyncio.as_completed(jobs):
        result = await coro
        done += 1
        key = "fail" if result.startswith("fail") else result
        counts[key] = counts.get(key, 0) + 1
        if result.startswith("fail"):
            failed.append(result)
        if done % 50 == 0 or done == len(jobs):
            print(f"{done}/{len(jobs)} {counts}", flush=True)
    ordered = {key: manifest[key] for key in sorted(manifest)}
    payload = json.dumps(ordered, ensure_ascii=False, separators=(",", ":"))
    (OUT / "index.json").write_text(payload, encoding="utf-8")
    src_copy = ROOT / "src" / "data" / "ja-audio.json"
    src_copy.write_text(payload, encoding="utf-8")
    print("manifest", len(ordered), "failed", len(failed), flush=True)
    if failed:
        print("\n".join(failed[:30]), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
