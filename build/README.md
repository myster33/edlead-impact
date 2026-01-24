# Desktop App Icons

Place your application icons in this folder before building the desktop app.

## Required Icon Files

### For Windows (.ico)
- **icon.ico** - 256x256 pixels (can contain multiple sizes: 16, 32, 48, 64, 128, 256)

### For macOS (.icns)
- **icon.icns** - Apple icon format (contains sizes from 16x16 to 512x512@2x)

### Fallback (PNG)
- **icon.png** - 512x512 pixels (used as fallback and for Linux)

## How to Create Icons

1. **Start with a high-resolution PNG** (512x512 or 1024x1024)
   - You can use `public/edlead-icon.png` as the source

2. **Convert to required formats:**

   **Online Tools (Easiest):**
   - [iConvert Icons](https://iconverticons.com/) - Converts PNG to ICO and ICNS
   - [CloudConvert](https://cloudconvert.com/png-to-ico) - PNG to ICO
   - [Img2icns](https://img2icnsapp.com/) - For macOS ICNS files

   **Using ImageMagick (Command Line):**
   ```bash
   # Create ICO for Windows
   convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
   
   # Create PNG at correct size
   convert icon.png -resize 512x512 icon.png
   ```

   **For macOS ICNS:**
   Use the `iconutil` command on a Mac or an online converter.

## Temporary Placeholder

If you want to test the build without proper icons, you can copy:
```bash
cp public/edlead-icon.png build/icon.png
```

The build will use this PNG, though Windows installer may show a generic icon.
