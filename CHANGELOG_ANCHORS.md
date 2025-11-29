# Changelog - Anchor Links Feature

## [1.0.0] - 2024-11-29

### Added

#### Core Anchor Links Functionality
- 🔗 Automatic anchor links for all headings (H1-H6)
- 📋 One-click copy to clipboard functionality
- 🎯 Smooth scroll to target section
- ✨ Visual feedback on link copy (# → ✓)
- 🔄 URL update without page reload
- 🌐 Support for Cyrillic and special characters in anchors

#### Components
- Updated `converter.js`:
  - Added `.heading-with-anchor` class to all headings
  - Added anchor link HTML generation in `heading_open` renderer
  - Added anchor link closing tags in `heading_close` renderer
  - Automatic ID generation using `slugify()` function

#### Styles
- Updated `assets/styles.css`:
  - `.heading-with-anchor` - Container for headings with anchors
  - `.anchor-link` - Anchor link styling with hover effects
  - Smooth opacity transitions
  - Focus states for keyboard navigation
  - Responsive design

#### Scripts
- Updated `assets/scripts/core.js`:
  - Click handler for `.anchor-link` elements
  - Clipboard API integration
  - History API for URL updates
  - Smooth scroll implementation
  - Visual feedback animation
  - Hash navigation on page load

#### Features
- **Visual Design**:
  - Hidden by default (opacity: 0)
  - Appears on heading hover
  - Accent color (#2FB65A)
  - Smooth transitions
  
- **User Experience**:
  - Click to copy full URL
  - Automatic scroll to section
  - Visual confirmation (✓ symbol)
  - No page reload
  
- **Accessibility**:
  - `aria-label` for screen readers
  - `title` attribute for tooltips
  - Keyboard navigation support
  - Visible focus outline
  - Semantic HTML structure

#### Documentation
- `ANCHOR_LINKS.md` - Technical documentation (EN)
- `docs/ЯКОРНЫЕ_ССЫЛКИ.md` - User guide (RU)
- `docs/ANCHOR_LINKS_DEMO.md` - Visual demonstration and examples
- `test-anchors.html` - Interactive test page

#### Testing
- Created `test-anchors.html` for manual testing
- Verified functionality across all heading levels
- Tested with Cyrillic characters
- Confirmed clipboard API compatibility

### Changed
- Updated `readme.md` - Added anchor links to features list
- Updated main page generation to include new functionality

### Technical Details

#### HTML Structure
```html
<h2 id="section-id" class="section-title heading-with-anchor">
  Section Title
  <a href="#section-id" class="anchor-link" aria-label="Ссылка на раздел" title="Скопировать ссылку">#</a>
</h2>
```

#### ID Generation
- Lowercase conversion
- Space to hyphen replacement
- Special character removal
- Cyrillic support maintained

#### Browser Support
- Chrome 63+
- Firefox 53+
- Safari 11.1+
- Edge 79+
- iOS Safari 11.3+
- Chrome Mobile 63+

### Performance
- Minimal impact on page load
- Event handlers added once on DOMContentLoaded
- No additional HTTP requests
- Total size: ~2KB (JS + CSS)

### Future Enhancements
- [ ] Scroll animation effects
- [ ] Active section highlighting in navigation
- [ ] Share button with platform selection
- [ ] Visited anchors history
- [ ] Export table of contents to Markdown
