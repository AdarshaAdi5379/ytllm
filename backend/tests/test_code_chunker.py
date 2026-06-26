import unittest

from app.services.code_chunker import (
    CodeChunk,
    chunk_code_file,
    detect_language,
)


class TestDetectLanguage(unittest.TestCase):
    def test_python(self):
        self.assertEqual(detect_language("foo.py"), "python")
        self.assertEqual(detect_language("src/module.py"), "python")

    def test_javascript(self):
        self.assertEqual(detect_language("app.js"), "javascript")
        self.assertEqual(detect_language("component.jsx"), "javascript")

    def test_typescript(self):
        self.assertEqual(detect_language("app.ts"), "typescript")
        self.assertEqual(detect_language("component.tsx"), "typescript")

    def test_go(self):
        self.assertEqual(detect_language("main.go"), "go")

    def test_rust(self):
        self.assertEqual(detect_language("lib.rs"), "rust")

    def test_java(self):
        self.assertEqual(detect_language("Main.java"), "java")

    def test_unknown(self):
        self.assertEqual(detect_language("Makefile"), "makefile")
        self.assertEqual(detect_language("Dockerfile"), "dockerfile")
        self.assertEqual(detect_language("file.unknown"), "text")


class TestChunkCodeFile(unittest.TestCase):
    def test_empty_file(self):
        chunks = chunk_code_file("", "empty.py")
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].chunk_type, "module_level")

    def test_single_module_level_python(self):
        content = "import os\nimport sys\n\nCONSTANT = 42\n"
        chunks = chunk_code_file(content, "main.py")
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].chunk_type, "module_level")
        self.assertEqual(chunks[0].line_start, 1)
        self.assertEqual(chunks[0].line_end, 4)

    def test_function_boundary_python(self):
        content = "import os\n\n\ndef hello():\n    print('hello')\n\n\ndef world():\n    print('world')\n"
        chunks = chunk_code_file(content, "main.py")
        self.assertGreaterEqual(len(chunks), 2)
        # First chunk: module level (imports)
        self.assertEqual(chunks[0].chunk_type, "module_level")
        self.assertEqual(chunks[0].line_start, 1)
        # Second chunk: first function
        self.assertIn(chunks[1].chunk_type, ("function", "module_level"))
        if chunks[1].chunk_type == "function":
            self.assertIn("hello", chunks[1].text)

    def test_class_boundary_python(self):
        content = "class MyClass:\n    pass\n\n\ndef helper():\n    pass\n"
        chunks = chunk_code_file(content, "main.py")
        self.assertGreaterEqual(len(chunks), 2)
        self.assertEqual(chunks[0].chunk_type, "class")

    def test_no_functions_js(self):
        content = "const x = 1;\nconst y = 2;\nconsole.log(x + y);\n"
        chunks = chunk_code_file(content, "app.js")
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].chunk_type, "module_level")

    def test_function_javascript(self):
        content = "const helper = () => {\n  return 42;\n};\n\nfunction greet(name) {\n  return `Hello ${name}`;\n}\n"
        chunks = chunk_code_file(content, "app.js")
        self.assertGreaterEqual(len(chunks), 2)

    def test_class_javascript(self):
        content = "class Animal {\n  constructor(name) {\n    this.name = name;\n  }\n}\n\nfunction helper() {}\n"
        chunks = chunk_code_file(content, "app.js")
        self.assertGreaterEqual(len(chunks), 2)
        self.assertEqual(chunks[0].chunk_type, "class")

    def test_go_functions(self):
        content = "package main\n\nfunc main() {\n\tfmt.Println(\"hello\")\n}\n\nfunc add(a, b int) int {\n\treturn a + b\n}\n"
        chunks = chunk_code_file(content, "main.go")
        self.assertGreaterEqual(len(chunks), 2)
        # First func in Go should be "function"
        func_chunks = [c for c in chunks if c.chunk_type == "function"]
        self.assertGreaterEqual(len(func_chunks), 2)

    def test_rust_functions_and_structs(self):
        content = "struct Point {\n    x: i32,\n    y: i32,\n}\n\nimpl Point {\n    fn new(x: i32, y: i32) -> Self {\n        Point { x, y }\n    }\n}\n"
        chunks = chunk_code_file(content, "lib.rs")
        self.assertGreaterEqual(len(chunks), 2)

    def test_markdown_paragraph_chunking(self):
        content = "# Title\n\nThis is a paragraph.\n\n## Section\n\nAnother paragraph.\n"
        chunks = chunk_code_file(content, "README.md")
        self.assertGreaterEqual(len(chunks), 3)
        for c in chunks:
            self.assertEqual(c.language, "markdown")
            self.assertEqual(c.chunk_type, "block")

    def test_text_fallback(self):
        content = "Line one\n\nLine two\n\nLine three\n"
        chunks = chunk_code_file(content, "notes.txt")
        self.assertGreaterEqual(len(chunks), 3)
        for c in chunks:
            self.assertEqual(c.language, "text")

    def test_file_path_preserved(self):
        content = "def foo():\n    pass\n"
        chunks = chunk_code_file(content, "src/lib/utils.py")
        for c in chunks:
            self.assertEqual(c.file_path, "src/lib/utils.py")

    def test_line_numbers_accurate(self):
        content = "def first():\n    pass\n\n\ndef second():\n    pass\n"
        # 6 lines: def first(),     pass, (empty), (empty), def second(),     pass
        chunks = chunk_code_file(content, "main.py")
        self.assertGreaterEqual(len(chunks), 2)
        # Last chunk should include the last function
        last = chunks[-1]
        self.assertIn("second", last.text)
        self.assertEqual(last.line_end, 6)

    def test_unknown_language_fallback(self):
        content = "some content\n\nmore content\n"
        chunks = chunk_code_file(content, "file.wat")
        self.assertGreaterEqual(len(chunks), 2)
        self.assertEqual(chunks[0].language, "text")


if __name__ == "__main__":
    unittest.main()
