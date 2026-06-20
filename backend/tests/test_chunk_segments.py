import unittest

from app.utils.chunk_segments import TranscriptSegment, chunk_segments


class TestChunkSegments(unittest.TestCase):
    def test_single_chunk_time_range(self):
        segments = [
            TranscriptSegment(text="hello world", start_s=0.0, end_s=2.0),
            TranscriptSegment(text="more words here", start_s=2.0, end_s=5.0),
        ]
        chunks = chunk_segments(segments, chunk_size=20, overlap=0)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].start_s, 0.0)
        self.assertEqual(chunks[0].end_s, 5.0)

    def test_multiple_chunks_have_monotonic_times(self):
        segments = [
            TranscriptSegment(text="one two three four", start_s=0.0, end_s=4.0),
            TranscriptSegment(text="five six seven eight", start_s=4.0, end_s=8.0),
            TranscriptSegment(text="nine ten eleven twelve", start_s=8.0, end_s=12.0),
        ]
        chunks = chunk_segments(segments, chunk_size=4, overlap=0)
        self.assertGreaterEqual(len(chunks), 3)
        for i in range(1, len(chunks)):
            self.assertGreaterEqual(chunks[i].start_s, chunks[i - 1].start_s)
            self.assertGreaterEqual(chunks[i].end_s, chunks[i].start_s)


if __name__ == "__main__":
    unittest.main()

