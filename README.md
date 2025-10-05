# Instagram-style Album Grid (No dates)

A clean portfolio that looks like IG: square tiles, albums per shoot, full-res viewing in a lightbox. No dates.

## Folder structure
```
/assets/images/
  street_night/
    cover.jpg
    shot1.jpg
    shot2.jpg
    shot3.jpg
    thumbs/cover.jpg shot1.jpg shot2.jpg shot3.jpg
  portraits_rooftop/
    cover.jpg pose1.jpg pose2.jpg pose3.jpg pose4.jpg
    thumbs/...
  editorial_red/
    cover.jpg frame1.jpg frame2.jpg
    thumbs/...
index.html
style.css
script.js
```

## Add a new shoot
1. Create a folder in `assets/images/` like `wildwood_fit/` and put your originals inside. Include one `cover.jpg` for the grid tile.
2. Create thumbnails in `assets/images/wildwood_fit/thumbs/` with the same filenames at 640x640 for speed.
3. Add a new `<article class="tile">` block in `index.html` similar to the examples, updating:
   - `data-album` for the title
   - `data-category` for filter tags (portraits, street, editorial, etc.)
   - `data-images` list for the album images (excluding or including the cover; the script prepends the cover automatically)
   - `data-cover` path
   - `<img src>` and `srcset` paths for the cover thumbnail and original
   - Overlay `count` to match number of images in `data-images`
4. Done. The grid stays square. The viewer shows originals at full resolution.

## Hosting for free
- GitHub Pages, Netlify, or Vercel. No build step needed.

## Customization
- Change columns in `.grid` in `style.css`.
- Remove the profile header for a pure grid.
- No dates anywhere.
