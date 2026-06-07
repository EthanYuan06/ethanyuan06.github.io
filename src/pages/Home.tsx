import { Link } from 'react-router-dom';
import { getAllPosts } from '../utils/posts';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Home() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      
      {/* Hero Header */}
      <header
        className="relative bg-cover bg-center bg-no-repeat w-full h-[400px] sm:h-[500px] flex px-4 sm:px-0 items-center justify-center"
        style={{ backgroundImage: `url('https://yuluo-picture-1383397986.cos.ap-guangzhou.myqcloud.com/example.webp')` }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 text-center text-white mt-10">
          <h1 className="text-5xl sm:text-7xl font-bold mb-4 font-serif">Agent Notes</h1>
          <hr className="w-24 border-t-2 border-white mx-auto my-4 opacity-75" />
          <span className="text-xl sm:text-2xl font-light tracking-wide">With LangChain &amp; Python</span>
        </div>
      </header>

      {/* Main Content - Post List */}
      <main className="flex-grow max-w-3xl mx-auto w-full px-5 sm:px-4 py-16">
        {posts.map((post, i) => (
          <div key={post.slug} className="mb-12">
            <Link to={`/post/${post.slug}`} className="group block focus:outline-none rounded px-2 -mx-2">
              <h2 className="text-3xl font-bold text-gray-900 group-hover:text-brand transition font-sans leading-tight mb-2">
                {post.title}
              </h2>
              {post.subtitle && (
                <h3 className="text-xl font-light text-gray-600 font-sans">
                  {post.subtitle}
                </h3>
              )}
            </Link>
            <p className="text-gray-500 italic mt-3 text-sm font-serif">
              Posted on {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {i !== posts.length - 1 && <hr className="mt-12 border-gray-200" />}
          </div>
        ))}

        <div className="mt-12 flex justify-end">
          <button className="bg-white border border-gray-300 text-gray-700 py-3 px-6 text-sm tracking-widest font-bold uppercase transition hover:bg-brand hover:text-white hover:border-brand">
            Older Posts &rarr;
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
