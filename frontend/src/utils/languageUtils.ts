const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  py: 'python',
  js: 'javascript',
  jsx: 'react',
  ts: 'typescript',
  tsx: 'typescript',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  rb: 'ruby',
  php: 'php',
  c: 'c',
  cpp: 'cpp',
  cs: 'csharp',
  md: 'markdown',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sh: 'bash',
  sql: 'sql',
  css: 'css',
  html: 'html',
  vue: 'vue',
  svelte: 'svelte',
  xml: 'xml',
  proto: 'protobuf',
};

export function detectLanguage(filePath: string): string {
  const parts = filePath.split('.');
  if (parts.length < 2) return '';
  const ext = parts[parts.length - 1].toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? '';
}
