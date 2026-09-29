"""Create an honest narrated review montage from actual browser captures.

Needs imageio-ffmpeg (official PyPI package) and macOS's installed `say` voice.
It never controls the browser or changes the screenshot source files.
"""
from pathlib import Path
import json
import re
import subprocess
import tempfile
import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
scenes = [
    ('01-pantry.png', 'Pantry Relay helps a household hand dinner from one person to another. This review uses real browser screen captures from a running local prototype, with fictional pantry data. It is not a live Alexa session. Start with the food already in the kitchen.'),
    ('02-options.png', 'The request is dinner for two, vegetarian, within twenty five minutes. The planner checks available quantities and date labels. It suggests the chickpea and courgette skillet, plus other options. At this point, no stock has been consumed or reserved.'),
    ('03-reserved.png', 'Confirming dinner reserves the ingredients and creates a kitchen handoff. Available stock now excludes those reservations. Another household member cannot silently promise the same ingredients twice. The meal is planned, but it has not been recorded as cooked.'),
    ('04-cooked.png', 'Only the Meal cooked action consumes the reserved food. Repeated requests are handled once, and a refresh keeps the meal history and updated quantities. That distinction makes a shared pantry useful across more than one conversation.'),
    ('05-shortages.png', 'Now the household requests dinner for eight. The same planner scales the recipe and identifies shortages. Missing ingredients are shown before confirmation. It never assumes food is already present just because a recipe needs it.'),
    ('07-shopping.png', 'The confirmed plan puts two lemons, nine hundred grams of lentils, five hundred grams of tomatoes and two hundred grams of yogurt on the shopping list. The list was actually downloaded. Cooking a plan with shortages is blocked until it is cancelled, restocked and replanned.'),
    ('08-cancelled.png', 'Cancelling that dinner releases its reservations and shopping needs without consuming food. Previously cooked meals remain in history. A stock change also invalidates older proposals, so the assistant must recommend again instead of acting on stale quantities.'),
    ('09-mcp-proof.png', 'The official MCP SDK client also ran this workflow through real Streamable HTTP calls. Here is the saved execution evidence, including reading stock, recommending, confirming and recording a cooked meal. Protocol twenty twenty five, November twenty fifth, was verified in the integration test.'),
    ('01-pantry.png', 'Pantry Relay runs locally without a paid API, cloud account, hardware purchase or wallet. The browser command demo is deterministic; a compatible agent can use the separate MCP service and reusable skill. This is an AI assisted contest candidate, with no prize or submission claimed.'),
]

with tempfile.TemporaryDirectory(prefix='pantry-review-') as temporary:
    directory = Path(temporary)
    parts, durations = [], []
    for index, (screenshot, narration) in enumerate(scenes):
        text = directory / f'{index}.txt'
        audio = directory / f'{index}.aiff'
        video = directory / f'{index}.mp4'
        text.write_text(narration)
        subprocess.run(['/usr/bin/say', '-v', 'Samantha', '-r', '155', '-f', str(text), '-o', str(audio)], check=True, capture_output=True)
        probe = subprocess.run([ffmpeg, '-i', str(audio), '-f', 'null', '-'], capture_output=True, text=True, check=True)
        match = re.search(r'Duration: (\d+):(\d+):([\d.]+)', probe.stderr)
        duration = int(match[1]) * 3600 + int(match[2]) * 60 + float(match[3]) + 0.8
        durations.append(duration)
        subprocess.run([ffmpeg, '-y', '-loop', '1', '-framerate', '12', '-i', str(root / 'evidence' / screenshot), '-i', str(audio), '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=white,format=yuv420p', '-af', 'apad', '-t', str(duration), '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', str(video)], capture_output=True, check=True)
        parts.append(video)
    concat = directory / 'parts.txt'
    concat.write_text('\n'.join(f"file '{part}'" for part in parts))
    output = root / 'evidence/pantry-relay-review.mp4'
    subprocess.run([ffmpeg, '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-c', 'copy', '-movflags', '+faststart', str(output)], capture_output=True, check=True)
    metadata = {'duration_seconds': round(sum(durations), 2), 'under_three_minutes': sum(durations) < 180, 'format': '1280x720 H.264/AAC', 'provenance': 'Narrated montage of actual browser captures; no live Alexa session is claimed.', 'voice': 'Installed macOS Samantha text-to-speech', 'public_upload': False, 'source_captures': [s for s, _ in scenes], 'narration': [n for _, n in scenes]}
    (root / 'evidence/video-metadata.json').write_text(json.dumps(metadata, indent=2))
    print(json.dumps({key: metadata[key] for key in ['duration_seconds','under_three_minutes','provenance','public_upload']}))
