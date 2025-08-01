#!/bin/bash

# Usage: ./deb2appimage.sh your-package.deb "AppName" "A description of your app" "Categories"

set -e

DEB="$1"
APPNAME="${2:-MyApp}"
DESCRIPTION="${3:-A modern desktop app.}"
CATEGORIES="${4:-Utility;}"

if [[ ! -f "$DEB" ]]; then
  echo "Usage: $0 your-package.deb \"AppName\" \"Description\" \"Categories\""
  exit 1
fi

# 1. Prepare working directories
WORKDIR="$(pwd)/appimage-work"
APPDIR="$WORKDIR/AppDir"
mkdir -p "$APPDIR"

# 2. Extract .deb
dpkg-deb -x "$DEB" "$APPDIR"

# 3. Find main executable (guess: first bin in usr/bin)
MAINEXE=$(find "$APPDIR/usr/bin" -type f | head -n1)
if [[ -z "$MAINEXE" ]]; then
  echo "Could not find main executable in usr/bin."
  exit 2
fi
EXENAME=$(basename "$MAINEXE")

# 4. Create AppRun
cat > "$APPDIR/AppRun" <<EOF
#!/bin/bash
exec "\$(dirname "\$0")/usr/bin/$EXENAME" "\$@"
EOF
chmod +x "$APPDIR/AppRun"

# 5. Create .desktop file
cat > "$APPDIR/$APPNAME.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=$APPNAME
Comment=$DESCRIPTION
Exec=$EXENAME
Icon=$APPNAME
Terminal=false
Categories=$CATEGORIES
EOF

# 6. Create icon (placeholder if not found)
ICON_SRC=$(find "$APPDIR/usr/share/icons" "$APPDIR/usr/share/pixmaps" -type f -name "*.png" 2>/dev/null | head -n1)
if [[ -z "$ICON_SRC" ]]; then
  echo "No icon found, creating placeholder."
  convert -size 256x256 canvas:khaki "$APPDIR/$APPNAME.png"
else
  cp "$ICON_SRC" "$APPDIR/$APPNAME.png"
fi

# 7. Download appimagetool if missing
if [[ ! -f appimagetool-x86_64.AppImage ]]; then
  wget -O appimagetool-x86_64.AppImage https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
  chmod +x appimagetool-x86_64.AppImage
fi

# 8. Build AppImage
./appimagetool-x86_64.AppImage "$APPDIR"

echo "Done! Your AppImage should be in $(pwd)"
