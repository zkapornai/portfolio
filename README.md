# Portfolio site

A small static site: plain HTML, CSS and JavaScript. No build step.

## Structure

```
index.html          Home (editorial hero + three full-screen projects)
projects.html       Projects (animated card grid, 4 per row on large screens)
about.html          About
felt-interfaces.html, cuttingEdge.html, cylinder.html,
tiny-instruments.html, orbit.html, paper-weather.html,
quiet-hours.html, loop-studio.html, linear-to-circular.html
                    Nine standalone project articles
css/base.css        Shared: colours, type, navbar, buttons, footer, placeholder art
css/home.css        Home page styles
css/projects.css    Projects page styles
css/about.css       About page styles
js/data.js          Project data (edit this to change your projects)
js/home.js          Home: full-screen projects + scroll animation
js/projects.js      Projects: renders the card grid and plays visible card videos
assets/favicon.svg  Favicon
```

The About page needs no JavaScript, so it has none.

## Publish on GitHub Pages

1. Create a repository and upload the contents of this folder (so `index.html` is in the root).
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

All paths are relative, so the site also works from a sub-folder URL and when opened locally.

## Edit your content

- **Name and email:** search for `Your Name` and `hello@yourname.com` in the three HTML files.
- **Projects:** edit `js/data.js`. The first three appear full-screen on the Home page.
- **Project articles:** edit the standalone HTML file for each project.
- **Images:** put image files in `assets/` and add `img: 'assets/your-image.jpg'` to a project in `data.js`. Without `img`, a grey pattern is shown.
- **Project links:** add `href: 'your-page.html'` to a project in `data.js`.
- **Colours:** the variables at the top of `css/base.css` (`--g` is the green accent, `#3f6a38`).

## External resources

- **Fonts** (Outfit and Figtree) are loaded from Google Fonts. They can be self-hosted if you prefer.
