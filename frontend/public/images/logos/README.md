# Logo Directory

Place your SHV Cricket logo files here.

## Supported Formats

- **PNG** - Recommended for logos with transparency
- **SVG** - Best for scalable vector logos
- **JPG** - Supported but PNG/SVG preferred

## File Names

The application will look for:
1. `logo.svg` (preferred - scalable)
2. `logo.png` (fallback)

## Recommended Specifications

- **Size**: 200x200px to 400x400px
- **Format**: PNG with transparency or SVG
- **Background**: Transparent (for best appearance)
- **Aspect Ratio**: Square (1:1) works best

## How to Add Your Logo

1. Place your logo file in this directory:
   - `logo.svg` OR
   - `logo.png`

2. The logo will automatically appear in the header

3. If you want to use a different filename, update `Header.js`:
   ```javascript
   const logoPath = process.env.PUBLIC_URL + '/images/logos/your-logo.png';
   ```

## Fallback

If no logo is found, the application will display a cricket emoji (🏏) as a placeholder.

## Example

```
frontend/public/images/logos/
  ├── logo.svg  (or logo.png)
  └── README.md (this file)
```

