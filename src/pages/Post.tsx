import { useParams } from 'react-router-dom';
import 'highlight.js/styles/github-dark.css';
import rehypeHighlight from 'rehype-highlight';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HERO_BACKGROUND_URL } from '../constants/site';
import { getPostBySlug, resolvePostAssetUrl } from '../utils/posts';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Post() {
  const { slug } = useParams();
  const post = getPostBySlug(slug || '');

  // Handle document title updates
  if (post) {
    document.title = `${post.title} | Hux Blog React`;
  }

  if (!post) {
    return (
      <div className="font-sans min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center pt-24 pb-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4 font-serif">Post not found</h1>
            <p className="text-gray-600">The requested article could not be located.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Header */}
      <header
        className="relative bg-cover bg-center bg-no-repeat w-full h-[400px] sm:h-[500px] flex px-4 sm:px-0 items-center justify-center"
        style={{ backgroundImage: `url('${HERO_BACKGROUND_URL}')` }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 w-full max-w-5xl mx-auto text-white mt-16 sm:mt-24 text-center sm:text-left">
          <h1 className="mb-4 overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-bold font-serif leading-snug sm:text-[2.25rem]">
            {post.title}
          </h1>
          {post.subtitle && <h2 className="mb-5 text-base font-light font-sans opacity-95 sm:text-lg">{post.subtitle}</h2>}
          <p className="text-lg italic font-serif opacity-80">
            Posted on {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Article Content */}
      <article className="flex-grow max-w-3xl mx-auto w-full px-5 sm:px-4 py-16">
        <div className="article-content prose prose-lg prose-brand max-w-none prose-p:font-serif prose-headings:font-sans prose-a:text-brand prose-p:text-gray-800 prose-headings:font-bold prose-p:leading-relaxed prose-strong:font-bold prose-strong:text-gray-900">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              img: ({ src = '', alt = '' }) => (
                <img
                  src={resolvePostAssetUrl(post.sourcePath, src)}
                  alt={alt}
                  className="h-auto max-w-full rounded-md"
                  loading="lazy"
                />
              ),
            }}
          >
            {post.body}
          </ReactMarkdown>
        </div>
      </article>

      <Footer />
    </div>
  );
}
