import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPostBySlug } from '../utils/posts';
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
        style={{ backgroundImage: `url('${post.headerImage}')` }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 max-w-3xl w-full mx-auto text-white mt-16 sm:mt-24 text-center sm:text-left">
          <h1 className="text-4xl sm:text-6xl font-bold mb-4 font-serif leading-tight">{post.title}</h1>
          {post.subtitle && <h2 className="text-2xl font-light mb-5 font-sans opacity-95">{post.subtitle}</h2>}
          <p className="text-lg italic font-serif opacity-80">
            Posted on {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Article Content */}
      <article className="flex-grow max-w-3xl mx-auto w-full px-5 sm:px-4 py-16">
        <div className="prose prose-lg prose-brand max-w-none prose-p:font-serif prose-headings:font-sans prose-a:text-brand prose-p:text-gray-800 prose-headings:font-bold prose-p:leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.body}
          </ReactMarkdown>
        </div>
      </article>

      <Footer />
    </div>
  );
}
