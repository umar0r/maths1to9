#!/bin/sh
# Build Maths1to9 as a root-hosted static site in ./dist.
#
# Prefer the live XAMPP/Apache site when it is running.  The PHP CLI fallback
# exists so a reproducible build is still possible when Apache is stopped; it
# executes the same page templates and does not start another web server.
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$PROJECT_DIR"

DIST_DIR="$PROJECT_DIR/dist"
BASE_URL=${BASE_URL:-http://localhost/maths1to9/}
PHP_BIN=${PHP_BIN:-/Applications/XAMPP/xamppfiles/bin/php}

if [ -e "$DIST_DIR" ]; then
    rm -rf "$DIST_DIR"
fi
mkdir -p "$DIST_DIR/content"

lesson_dirs() {
    find content -mindepth 1 -maxdepth 1 -type d ! -name '_*' -print | sort
}

fetch_page() {
    route=$1
    destination=$2
    mkdir -p "$(dirname "$destination")"
    curl --fail --silent --show-error --location "${BASE_URL}${route}" > "$destination"
}

render_page() {
    source_file=$1
    destination=$2
    mkdir -p "$(dirname "$destination")"
    "$PHP_BIN" "$source_file" > "$destination"
}

if curl --fail --silent --show-error --location --output /dev/null "$BASE_URL"; then
    echo "Building from Apache at $BASE_URL"
    fetch_page "" "$DIST_DIR/index.html"
    lesson_dirs | while IFS= read -r lesson_dir; do
        slug=${lesson_dir#content/}
        fetch_page "content/$slug/" "$DIST_DIR/content/$slug/index.html"
    done
else
    if [ ! -x "$PHP_BIN" ]; then
        echo "Apache is unavailable and PHP_BIN is not executable: $PHP_BIN" >&2
        exit 1
    fi
    echo "Apache is unavailable; rendering the same templates with $PHP_BIN"
    render_page index.php "$DIST_DIR/index.html"
    lesson_dirs | while IFS= read -r lesson_dir; do
        slug=${lesson_dir#content/}
        render_page "$lesson_dir/index.php" "$DIST_DIR/content/$slug/index.html"
    done
fi

# Shared browser assets and top-level curriculum data.
cp -R assets "$DIST_DIR/assets"
cp -R vendor "$DIST_DIR/vendor"
find content -mindepth 1 -maxdepth 1 -type f -name '*.json' -exec cp {} "$DIST_DIR/content/" \;

# Copy each real lesson's client assets and JSON. index.php was rendered above;
# the editor and content/_template are intentionally not published.
lesson_dirs | while IFS= read -r lesson_dir; do
    slug=${lesson_dir#content/}
    destination="$DIST_DIR/content/$slug"
    find "$lesson_dir" -mindepth 1 ! -name 'index.php' -exec cp -R {} "$destination/" \;
done

# Deploy from the domain root instead of XAMPP's /maths1to9/ subpath.
find "$DIST_DIR" -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.json' -o -name '*.svg' \) -exec \
    sed -i '' \
        -e 's#/maths1to9/#/#g' \
        -e 's#href="\./index\.php"#href="./"#g' \
        -e 's#href="\.\./\.\./index\.php"#href="../../"#g' \
        {} \;

cp 404.html "$DIST_DIR/404.html"

if rg -n '/maths1to9/' "$DIST_DIR"; then
    echo "Unrewritten /maths1to9/ paths remain in dist." >&2
    exit 1
fi

echo "Static build complete: $DIST_DIR"
