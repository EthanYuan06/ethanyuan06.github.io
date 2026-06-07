export interface Post {
  slug: string;
  title: string;
  date: string;
  subtitle?: string;
  headerImage?: string;
  tags?: string[];
  body: string;
}

function parseMarkdown(rawContent: string, filename: string): Post {
  const match = /---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)/.exec(rawContent);

  let attributes: Record<string, string> = {};
  let body = rawContent;

  if (match) {
    const frontmatter = match[1];
    body = match[2];
    attributes = frontmatter.split('\n').reduce((acc, line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);
  }

  // Generate slug from filename, removing extension and leading ./
  const slug = filename.replace(/^.*[\\\/]/, '').replace(/\.md$/, '');

  return {
    slug,
    title: attributes.title || 'Untitled Post',
    date: attributes.date || '1970-01-01',
    subtitle: attributes.subtitle,
    headerImage: attributes.headerImage || 'https://yuluo-picture-1383397986.cos.ap-guangzhou.myqcloud.com/example.webp',
    tags: attributes.tags ? attributes.tags.split(',').map((t) => t.trim()) : [],
    body,
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
