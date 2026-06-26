import asyncio
import os
import shutil
import tempfile
from loguru import logger
from openai import OpenAI

from app.config import config
from app.utils.chunk_segments import TranscriptSegment


_whisper_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _whisper_client
    if _whisper_client is None:
        _whisper_client = OpenAI(api_key=config["openai_api_key"])
    return _whisper_client


async def _download_audio(video_id: str, output_dir: str) -> str:
    """Download audio from a YouTube video using yt-dlp. Returns the path to the MP3 file."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    output_template = os.path.join(output_dir, "%(id)s.%(ext)s")

    proc = await asyncio.create_subprocess_exec(
        "yt-dlp",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "-o", output_template,
        url,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        err_text = stderr.decode(errors="replace") if stderr else "unknown error"
        raise RuntimeError(f"yt-dlp failed (exit {proc.returncode}): {err_text[:500]}")

    expected_path = os.path.join(output_dir, f"{video_id}.mp3")
    if not os.path.isfile(expected_path):
        files = os.listdir(output_dir)
        logger.warning("Expected {} not found; found files: {}", expected_path, files)
        raise FileNotFoundError(f"Audio file not found after download: {expected_path}")

    return expected_path


def _transcribe_audio(audio_path: str, model: str) -> list[TranscriptSegment]:
    """Transcribe an audio file using OpenAI Whisper API and return transcript segments."""
    client = _get_client()
    with open(audio_path, "rb") as audio_file:
        response = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    segments: list[TranscriptSegment] = []
    for seg in response.segments:
        text = (seg.text or "").strip()
        if not text:
            continue
        segments.append(
            TranscriptSegment(
                text=text,
                start_s=float(seg.start),
                end_s=float(seg.end),
            )
        )

    return segments


async def download_and_transcribe(video_id: str) -> list[TranscriptSegment] | None:
    """Download audio via yt-dlp and transcribe via Whisper API. Returns segments or None."""
    if not config.get("enable_whisper_fallback"):
        logger.debug("Whisper fallback disabled, skipping")
        return None

    tmp_dir = None
    try:
        tmp_dir = tempfile.mkdtemp(prefix="ytllm_whisper_")
        logger.info("Downloading audio for {} via yt-dlp...", video_id)

        audio_path = await _download_audio(video_id, tmp_dir)
        file_size = os.path.getsize(audio_path)
        logger.info("Audio downloaded to {} ({} bytes)", audio_path, file_size)

        model = config.get("whisper_model", "whisper-1")
        segments = _transcribe_audio(audio_path, model)

        if not segments:
            logger.warning("Whisper returned no segments for {}", video_id)
            return None

        logger.info(
            "Whisper transcription complete for {}: {} segments",
            video_id, len(segments),
        )

        return segments

    except FileNotFoundError:
        logger.warning("Audio download produced no file for {}", video_id)
        return None
    except RuntimeError as e:
        logger.warning("Audio download failed for {}: {}", video_id, e)
        return None
    except Exception as e:
        logger.warning("Whisper transcription failed for {}: {}", video_id, e)
        return None
    finally:
        if tmp_dir and os.path.isdir(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)
