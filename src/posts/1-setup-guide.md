---
title: How to Deploy This to GitHub Pages
subtitle: Understanding the dynamic Markdown architecture
date: 2026-06-07
headerImage: https://yuluo-picture-1383397986.cos.ap-guangzhou.myqcloud.com/example.webp
---
You requested a **Hux-styled React frontend** that effortlessly supports adding Markdown blogs on GitHub where the newest blogs naturally show at the very top. 

### How it works 

Traditional static generators like Jekyll use a build step to parse a `_posts` folder. Since you are using a modern React SPA, we've simulated this using **Vite**!

Through the power of `import.meta.glob`, any `.md` file you drop into the `/src/posts/` directory of this repo is automatically bundled into your React App when built.

### Steps to add a new Post:
1. Navigate to `/src/posts/` in your repository.
2. Create a new `.md` file. Ensure it has standard YAML frontmatter containing `title` and `date`.
3. Commit and push your code to your GitHub repo!

Because the internal logic sorts these posts purely based on the `date` frontmatter parameter, your newest articles will **always** appear first on the home page list!

### Why HashRouter?
We configured this React SPA to use a `HashRouter` instead of `BrowserRouter`. GitHub Pages does not support native backend routing for single-page apps (it returns a 404 if you link straight to a sub-route). By using a Hash Router (`/#/post/how-to-deploy`), you guarantee that your users can safely reload post pages or link them to friends without encountering 404 errors!
