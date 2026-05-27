from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class TranscriptSegment:
    text: str
    start_s: float
    end_s: float


@dataclass(frozen=True)
class TranscriptChunk:
    chunk_index: int
    text: str
    start_s: float
    end_s: float


def chunk_segments(
    segments: Iterable[TranscriptSegment],
    chunk_size: int = 500,
    overlap: int = 50,
) -> list[TranscriptChunk]:
    """
    Word-based chunking over time-stamped segments.

    - Preserves the existing chunking behavior (chunk_size words, overlap words)
    - Adds approximate chunk time ranges derived from segment boundaries
    """
    seg_list = [s for s in segments if (s.text or "").strip()]
    if not seg_list:
        return []

    words: list[str] = []
    word_to_seg: list[int] = []

    for seg_idx, seg in enumerate(seg_list):
        seg_words = seg.text.split()
        if not seg_words:
            continue
        words.extend(seg_words)
        word_to_seg.extend([seg_idx] * len(seg_words))

    if not words:
        return []

    if len(words) <= chunk_size:
        start_seg_idx = word_to_seg[0]
        end_seg_idx = word_to_seg[-1]
        return [
            TranscriptChunk(
                chunk_index=0,
                text=" ".join(words),
                start_s=float(seg_list[start_seg_idx].start_s),
                end_s=float(seg_list[end_seg_idx].end_s),
            )
        ]

    chunks: list[TranscriptChunk] = []
    start = 0
    chunk_index = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]

        start_seg_idx = word_to_seg[start]
        end_seg_idx = word_to_seg[end - 1]

        chunks.append(
            TranscriptChunk(
                chunk_index=chunk_index,
                text=" ".join(chunk_words),
                start_s=float(seg_list[start_seg_idx].start_s),
                end_s=float(seg_list[end_seg_idx].end_s),
            )
        )
        chunk_index += 1

        if end >= len(words):
            break
        start += max(1, chunk_size - overlap)

    return chunks

