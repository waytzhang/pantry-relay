"""Create a captioned review montage from unmodified browser captures.

Needs imageio-ffmpeg from the official PyPI package. No speech, music, paid API,
or browser control is used. Screenshots remain unchanged.
"""
from pathlib import Path
import json
import subprocess
import tempfile
import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
scenes = [
    ('01-pantry.png', 15, 'Pantry Relay: a shared pantry and local MCP tools.', 'Fictional household data. Actual captures of the running app.'),
    ('02-options.png', 15, 'Dinner for two, vegetarian, under 25 minutes.', 'Choosing an option does not consume or reserve ingredients.'),
    ('03-reserved.png', 15, 'Confirm dinner to reserve the ingredients for that meal.', 'The meal is planned; cooking has not been recorded.'),
    ('04-cooked.png', 14, 'Mark the meal cooked to update the pantry.', 'A repeated cooking request does not deduct food again.'),
    ('05-shortages.png', 14, 'Dinner for eight exposes the shortages.', 'Missing food is shown before confirmation.'),
    ('07-shopping.png', 16, 'The shopping list contains only what is missing.', 'The list was downloaded. Missing stock cannot be silently consumed.'),
    ('08-cancelled.png', 16, 'Cancel dinner to release its reservations and shopping needs.', 'Previously cooked meals remain in history.'),
    ('09-mcp-proof.png', 19, 'The official MCP SDK client ran the workflow over Streamable HTTP.', 'Read stock, recommend, confirm and record cooking. Protocol 2025-11-25.'),
    ('01-pantry.png', 19, 'Runs locally without a paid API or cloud account.', 'Deterministic browser demo; live Alexa+ device access has not been tested.'),
]


def ass_time(seconds):
    return f'{seconds // 3600}:{seconds // 60 % 60:02d}:{seconds % 60:02d}.00'


with tempfile.TemporaryDirectory(prefix='pantry-caption-review-') as temporary:
    directory = Path(temporary)
    parts = []
    captions = []
    elapsed = 0
    for index, (screenshot, duration, first_line, second_line) in enumerate(scenes):
        video = directory / f'{index}.mp4'
        subprocess.run([
            ffmpeg, '-y', '-loop', '1', '-framerate', '12',
            '-i', str(root / 'evidence' / screenshot),
            '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:816:0:0:color=0x244f3f,format=yuv420p',
            '-t', str(duration), '-an', '-c:v', 'libx264', '-preset', 'fast',
            '-crf', '18', '-movflags', '+faststart', str(video),
        ], capture_output=True, check=True)
        parts.append(video)
        captions.append(f'Dialogue: 0,{ass_time(elapsed)},{ass_time(elapsed + duration)},Default,,0,0,0,,{first_line}\\N{second_line}')
        elapsed += duration
    subtitle = directory / 'captions.ass'
    subtitle.write_text('''[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 816
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,30,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,32,32,18,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
''' + '\n'.join(captions) + '\n')
    concat = directory / 'parts.txt'
    concat.write_text('\n'.join(f"file '{part}'" for part in parts))
    output = root / 'evidence/pantry-relay-review.mp4'
    subprocess.run([
        ffmpeg, '-y', '-f', 'concat', '-safe', '0', '-i', str(concat),
        '-vf', f'ass={subtitle}', '-an', '-c:v', 'libx264', '-preset', 'fast',
        '-crf', '20', '-movflags', '+faststart', str(output),
    ], capture_output=True, check=True)
    metadata = {
        'duration_seconds': elapsed,
        'under_three_minutes': elapsed < 180,
        'format': '1280x816 H.264, no audio',
        'provenance': 'Captioned montage of actual browser captures; no live Alexa session is claimed.',
        'voice': None,
        'audio_tracks': 0,
        'system_voice_used': False,
        'public_upload': False,
        'source_captures': [scene[0] for scene in scenes],
        'scenes': [{'capture': scene[0], 'duration_seconds': scene[1], 'captions': list(scene[2:])} for scene in scenes],
    }
    (root / 'evidence/video-metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps({key: metadata[key] for key in ['duration_seconds', 'under_three_minutes', 'provenance', 'audio_tracks']}))
