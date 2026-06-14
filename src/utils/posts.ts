import { load } from 'js-yaml';

export interface Post {
  slug: string;
  title: string;
  date: string;
  subtitle?: string;
  tags?: string[];
  body: string;
  sourcePath: string;
}

const FRONT_MATTER_REGEX = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)([\s\S]*)$/;
const POST_IMAGE_MODULES = import.meta.glob('../image/**/*.{png,jpg,jpeg,gif,webp,svg,avif}', {
  eager: true,
  import: 'default',
});
const POST_IMAGE_URLS = Object.fromEntries(
  Object.entries(POST_IMAGE_MODULES).map(([path, url]) => [normalizeModulePath(path), url as string]),
);

function normalizeMarkdownBody(content: string): string {
  return content
    .replace(/\*\*([^\n*]*?)\s+\*\*/g, (_, text: string) => `**${text.trimEnd()}**`)
    .replace(/^```([A-Za-z][A-Za-z0-9_+-]*)\s*$/gm, (_, language: string) => `\`\`\`${language.toLowerCase()}`);
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function normalizeDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return normalizeString(value);
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter((item): item is string => Boolean(item));
  }

  const asString = normalizeString(value);
  return asString ? asString.split(',').map((tag) => tag.trim()).filter(Boolean) : [];
}

function normalizeModulePath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const resolved: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      if (resolved.length > 0 && resolved[resolved.length - 1] !== '..') {
        resolved.pop();
      } else {
        resolved.push(segment);
      }
      continue;
    }

    resolved.push(segment);
  }

  return resolved.join('/');
}

function dirname(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index) : '';
}

export function resolvePostAssetUrl(sourcePath: string, assetPath: string): string {
  if (/^(?:[a-z]+:)?\/\//i.test(assetPath) || assetPath.startsWith('data:') || assetPath.startsWith('/')) {
    return assetPath;
  }

  const resolvedPath = normalizeModulePath(`${dirname(sourcePath)}/${assetPath}`);
  return POST_IMAGE_URLS[resolvedPath] || assetPath;
}

function parseMarkdown(rawContent: string, filename: string): Post {
  const match = FRONT_MATTER_REGEX.exec(rawContent);

  let attributes: Record<string, unknown> = {};
  let body = rawContent;

  if (match) {
    const frontMatter = match[1];
    body = normalizeMarkdownBody(match[2]);

    try {
      const parsed = load(frontMatter);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        attributes = parsed as Record<string, unknown>;
      }
    } catch (error) {
      console.warn(`Failed to parse front matter in ${filename}`, error);
    }
  }

  // Generate slug from filename, removing extension and leading ./
  const slug = filename.replace(/^.*[\\\/]/, '').replace(/\.md$/, '');

  return {
    slug,
    title: normalizeString(attributes.title) || 'Untitled Post',
    date: normalizeDate(attributes.date) || '1970-01-01',
    subtitle: normalizeString(attributes.subtitle),
    tags: normalizeTags(attributes.tags),
    body,
    sourcePath: filename,
  };
}

export function getAllPosts(): Post[] {
  // Use Vite to statically import all markdown modules from the /posts directory
  const modules = import.meta.glob('../posts/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  });

  const posts: Post[] = [];

  for (const path in modules) {
    const rawContent = modules[path] as string;
    posts.push(parseMarkdown(rawContent, path));
  }

  // Sort by date descending (newest first)
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}
