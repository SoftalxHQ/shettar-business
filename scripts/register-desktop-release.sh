#!/usr/bin/env bash
# Map GitHub Release assets (+ Tauri latest.json) and upsert into Rails.
# Usage (CI or local):
#   TAG=v0.1.35-staging CHANNEL=staging API_URL=https://api.stg.shettar.com \
#   DESKTOP_RELEASE_CI_TOKEN=... GH_TOKEN=... ./scripts/register-desktop-release.sh
set -euo pipefail

: "${TAG:?TAG is required}"
: "${CHANNEL:?CHANNEL is required}"
: "${API_URL:?API_URL is required}"
: "${DESKTOP_RELEASE_CI_TOKEN:?DESKTOP_RELEASE_CI_TOKEN is required}"
: "${GH_TOKEN:=${GITHUB_TOKEN:-}}"

if [ -z "${GH_TOKEN}" ]; then
  echo "GH_TOKEN or GITHUB_TOKEN is required" >&2
  exit 1
fi

REPO="${GITHUB_REPOSITORY:-SoftalxHQ/shettar-business}"
VERSION="${VERSION:-$(echo "$TAG" | sed -E 's/^v//; s/-staging$//; s/-production$//')}"

echo "Registering $CHANNEL/$VERSION from $REPO@$TAG → $API_URL"

# Production API sits behind Cloudflare Bot Fight. GitHub-hosted runners get a
# "Just a moment..." 403 HTML page. Talk to the Kamal origin instead.
# Override PRODUCTION_API_ORIGIN_IP if the production server IP changes (see shettar-api config/deploy.yml).
CURL_API_OPTS=(--http1.1 -H "User-Agent: ShettarDesktopReleaseCI/1.0")
if [[ "${API_URL}" == *api-v1.shettar.com* ]]; then
  if [[ -n "${PRODUCTION_API_ORIGIN_IP:-}" ]]; then
    ORIGIN_IP="$PRODUCTION_API_ORIGIN_IP"
  else
    ORIGIN_IP="2.28.22.67"
  fi
  CURL_API_OPTS+=(--resolve "api-v1.shettar.com:443:${ORIGIN_IP}")
  echo "Bypassing Cloudflare bot challenge: api-v1.shettar.com → ${ORIGIN_IP}"
fi

RELEASE_JSON="$(gh release view "$TAG" --repo "$REPO" --json body,publishedAt,assets)"
NOTES="$(echo "$RELEASE_JSON" | jq -r '.body // empty')"
PUBLISHED_AT="$(echo "$RELEASE_JSON" | jq -r '.publishedAt // empty')"
ASSETS_JSON="$(echo "$RELEASE_JSON" | jq -c '.assets')"
ASSET_COUNT="$(echo "$ASSETS_JSON" | jq 'length')"
echo "Found $ASSET_COUNT assets"
echo "$ASSETS_JSON" | jq -r '.[].name' | sed 's/^/  - /'

if [ "$ASSET_COUNT" = "0" ]; then
  echo "::error::No release assets found for $TAG" >&2
  exit 1
fi

# Public browser download URLs for Rails/clients. Private-repo assets still need auth to *read* content (latest.json / .sig).
find_url() {
  local pattern="$1"
  echo "$ASSETS_JSON" | jq -r --arg re "$pattern" --arg tag "$TAG" --arg repo "$REPO" '
    map(select(.name | test($re; "i")))
    | .[0]
    | if . == null then empty
      else "https://github.com/\($repo)/releases/download/\($tag)/\(.name)"
      end
  '
}

find_asset_name() {
  local pattern="$1"
  echo "$ASSETS_JSON" | jq -r --arg re "$pattern" '
    map(select(.name | test($re; "i")))
    | .[0].name // empty
  '
}

# Download a release asset with GH_TOKEN (public URLs 404 on private repos).
# Retries + HTTP/1.1 API fallback — large AppImages often hit HTTP/2 PROTOCOL_ERROR via gh.
download_asset() {
  local name="$1"
  local dest="$2"
  if [ -z "$name" ]; then
    return 1
  fi

  local attempt max_attempts=5
  local err_file
  err_file="$(mktemp)"

  for attempt in $(seq 1 "$max_attempts"); do
    rm -f "$dest"
    if gh release download "$TAG" --repo "$REPO" -p "$name" -O "$dest" --clobber 2>"$err_file"; then
      if [ -s "$dest" ]; then
        rm -f "$err_file"
        return 0
      fi
      echo "Download produced empty file for ${name} (attempt ${attempt}/${max_attempts})" >&2
    else
      echo "gh release download failed for ${name} (attempt ${attempt}/${max_attempts})" >&2
      sed 's/^/  /' "$err_file" >&2 || true
    fi

    # Prefer API + HTTP/1.1 for large assets (AppImage ~80MB+).
    local asset_id=""
    asset_id="$(echo "$ASSETS_JSON" | jq -r --arg n "$name" '.[] | select(.name == $n) | .id // empty' | head -1)"
    if [ -n "$asset_id" ]; then
      rm -f "$dest"
      if curl -fsSL --http1.1 --retry 3 --retry-all-errors --retry-delay 2 \
        -H "Authorization: Bearer ${GH_TOKEN}" \
        -H "Accept: application/octet-stream" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        -o "$dest" \
        "https://api.github.com/repos/${REPO}/releases/assets/${asset_id}" \
        2>"$err_file" \
        && [ -s "$dest" ]; then
        echo "Downloaded ${name} via GitHub API HTTP/1.1 (${asset_id})" >&2
        rm -f "$err_file"
        return 0
      fi
      echo "API download failed for ${name} (attempt ${attempt}/${max_attempts})" >&2
      sed 's/^/  /' "$err_file" >&2 || true
    fi

    sleep $((attempt * 3))
  done

  rm -f "$err_file"
  return 1
}

read_sig() {
  local pattern="$1"
  local name
  name="$(find_asset_name "$pattern")"
  if [ -z "$name" ]; then
    echo ""
    return
  fi
  local tmp
  tmp="$(mktemp)"
  if download_asset "$name" "$tmp"; then
    cat "$tmp"
    rm -f "$tmp"
  else
    rm -f "$tmp"
    echo ""
  fi
}

map_from_latest_json() {
  local latest_json="$1"
  platform_url() { echo "$latest_json" | jq -r --arg k "$1" '.platforms[$k].url // empty'; }
  platform_sig() { echo "$latest_json" | jq -r --arg k "$1" '.platforms[$k].signature // empty'; }

  WIN_UPDATER="$(platform_url "windows-x86_64-nsis")"
  WIN_SIG="$(platform_sig "windows-x86_64-nsis")"
  if [ -z "$WIN_UPDATER" ]; then
    WIN_UPDATER="$(platform_url "windows-x86_64")"
    WIN_SIG="$(platform_sig "windows-x86_64")"
  fi

  MAC_ARM_UPD="$(platform_url "darwin-aarch64")"
  MAC_ARM_SIG="$(platform_sig "darwin-aarch64")"
  MAC_X64_UPD="$(platform_url "darwin-x86_64")"
  MAC_X64_SIG="$(platform_sig "darwin-x86_64")"
  LINUX_UPD="$(platform_url "linux-x86_64")"
  LINUX_SIG="$(platform_sig "linux-x86_64")"
}

map_from_filename_patterns() {
  echo "Falling back to asset filename patterns for updater mapping"
  WIN_UPDATER="$(find_url '_x64-setup\.exe$')"
  WIN_SIG="$(read_sig '_x64-setup\.exe\.sig$')"
  MAC_ARM_UPD="$(find_url 'aarch64\.app\.tar\.gz$')"
  MAC_ARM_SIG="$(read_sig 'aarch64\.app\.tar\.gz\.sig$')"
  MAC_X64_UPD="$(find_url 'x64\.app\.tar\.gz$')"
  MAC_X64_SIG="$(read_sig 'x64\.app\.tar\.gz\.sig$')"
  LINUX_UPD="$(find_url '\.AppImage$')"
  LINUX_SIG="$(read_sig '\.AppImage\.sig$')"
}

content_type_for() {
  case "$1" in
    *.tar.gz) echo "application/gzip" ;;
    *.zip) echo "application/zip" ;;
    *.AppImage) echo "application/octet-stream" ;;
    *.exe) echo "application/vnd.microsoft.portable-executable" ;;
    *.msi) echo "application/octet-stream" ;;
    *.dmg) echo "application/x-apple-diskimage" ;;
    *.deb) echo "application/vnd.debian.binary-package" ;;
    *.rpm) echo "application/x-rpm" ;;
    *.apk) echo "application/vnd.android.package-archive" ;;
    *.aab) echo "application/octet-stream" ;;
    *) echo "application/octet-stream" ;;
  esac
}

# Download a GitHub release asset and upload it to S3 via Rails-presigned PUT.
# Prints the stable object_url on stdout (progress on stderr).
upload_release_asset_to_s3() {
  local github_url="$1"
  local label="${2:-asset}"
  if [ -z "$github_url" ]; then
    echo ""
    return 0
  fi

  local name
  name="$(basename "${github_url%%\?*}")"
  if [ -z "$name" ]; then
    echo "::error::Could not derive filename from $github_url" >&2
    return 1
  fi

  local tmpdir local_file
  tmpdir="$(mktemp -d)"
  local_file="${tmpdir}/${name}"

  echo "Uploading ${label} ${name} to S3 via Rails presign..." >&2
  if ! download_asset "$name" "$local_file"; then
    echo "::error::Failed to download ${name} for S3 upload" >&2
    rm -rf "$tmpdir"
    return 1
  fi

  # Reject HTML/XML mistakenly saved as .apk/.aab (private GitHub 404, etc.)
  if [[ "$name" == *.apk || "$name" == *.aab ]]; then
    local magic
    magic="$(head -c 2 "$local_file" | od -An -t x1 | tr -d ' \n')"
    if [ "$magic" != "504b" ]; then
      echo "::error::Downloaded ${name} is not a ZIP/APK (magic=${magic}). Refusing to publish." >&2
      head -c 120 "$local_file" >&2 || true
      echo >&2
      rm -rf "$tmpdir"
      return 1
    fi
  fi

  # Always octet-stream: Cloudflare WAF on production often 403s multipart
  # POSTs that include an .exe filename or a Windows executable MIME type.
  local ctype="application/octet-stream"

  local payload
  payload="$(jq -n \
    --arg channel "$CHANNEL" \
    --arg version "$VERSION" \
    --arg filename "$name" \
    --arg content_type "$ctype" \
    '{channel:$channel,version:$version,filename:$filename,content_type:$content_type}')"

  local tmp_body tmp_hdr http_code
  tmp_body="$(mktemp)"
  tmp_hdr="$(mktemp)"
  http_code="$(curl -sS "${CURL_API_OPTS[@]}" -o "$tmp_body" -D "$tmp_hdr" -w '%{http_code}' \
    -X POST "${API_URL%/}/api/v1/internal/desktop_releases/presign_upload" \
    -H "Authorization: Bearer ${DESKTOP_RELEASE_CI_TOKEN}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d "$payload" || true)"

  if [ "$http_code" != "200" ]; then
    echo "::error::presign_upload failed for ${name} (HTTP ${http_code})" >&2
    echo "Response headers:" >&2
    grep -iE '^(HTTP/|cf-ray:|server:|content-type:|x-request-id:)' "$tmp_hdr" >&2 || true
    echo "Response body:" >&2
    head -c 800 "$tmp_body" >&2 || true
    echo >&2
    rm -f "$tmp_body" "$tmp_hdr"
    rm -rf "$tmpdir"
    return 1
  fi

  local presign_json
  presign_json="$(cat "$tmp_body")"
  rm -f "$tmp_body" "$tmp_hdr"

  local upload_url object_url
  upload_url="$(echo "$presign_json" | jq -r '.upload_url // empty')"
  object_url="$(echo "$presign_json" | jq -r '.object_url // empty')"

  if [ -z "$upload_url" ] || [ -z "$object_url" ]; then
    echo "::error::Invalid presign response for ${name}: ${presign_json}" >&2
    rm -rf "$tmpdir"
    return 1
  fi

  if ! curl -fsS -X PUT --upload-file "$local_file" \
    -H "Content-Type: ${ctype}" \
    "$upload_url" >/dev/null; then
    echo "::error::S3 PUT failed for ${name}" >&2
    rm -rf "$tmpdir"
    return 1
  fi

  rm -rf "$tmpdir"
  echo "  → ${object_url}" >&2
  echo "$object_url"
}

# Back-compat alias used elsewhere in this script.
upload_updater_to_s3() {
  upload_release_asset_to_s3 "$1" "updater"
}

# NOTE: patterns are bash single-quoted — use \. not \\. (\\ would search for a literal backslash).
WIN_INSTALLER="$(find_url '_x64-setup\.exe$')"
if [ -z "$WIN_INSTALLER" ]; then
  WIN_INSTALLER="$(find_url '_x64_en-US\.msi$')"
fi
MAC_ARM_DMG="$(find_url '_aarch64\.dmg$')"
MAC_X64_DMG="$(find_url '_x64\.dmg$')"
LINUX_APPIMAGE="$(find_url '\.AppImage$')"
LINUX_DEB="$(find_url '\.deb$')"
ANDROID_APK="$(find_url '\.apk$')"
ANDROID_AAB="$(find_url '\.aab$')"
ANDROID_STORE_URL="${BUSINESS_ANDROID_STORE_URL:-}"
IOS_STORE_URL="${BUSINESS_IOS_STORE_URL:-}"

if [ -z "$ANDROID_APK" ]; then
  echo "::warning::No .apk asset on GitHub release $TAG — android_apk_url will not be updated"
fi
if [ -z "$ANDROID_AAB" ]; then
  echo "::warning::No .aab asset on GitHub release $TAG — android_aab_url will not be updated"
fi
if [ -z "$ANDROID_STORE_URL" ]; then
  echo "::warning::BUSINESS_ANDROID_STORE_URL unset — android_store_url will not be updated (APK direct update still works)"
fi
if [ -z "$IOS_STORE_URL" ]; then
  echo "::warning::BUSINESS_IOS_STORE_URL unset — ios_store_url will not be updated"
fi

# Updaters: prefer Tauri-generated latest.json (correct url + signature per platform)
LATEST_NAME="$(find_asset_name '^latest\.json$')"
WIN_UPDATER=""; WIN_SIG=""
MAC_ARM_UPD=""; MAC_ARM_SIG=""
MAC_X64_UPD=""; MAC_X64_SIG=""
LINUX_UPD=""; LINUX_SIG=""

if [ -n "$LATEST_NAME" ]; then
  LATEST_TMP="$(mktemp)"
  echo "Downloading $LATEST_NAME with authenticated gh (private-repo safe)"
  if download_asset "$LATEST_NAME" "$LATEST_TMP"; then
    LATEST_JSON="$(cat "$LATEST_TMP")"
    rm -f "$LATEST_TMP"
    map_from_latest_json "$LATEST_JSON"
  else
    rm -f "$LATEST_TMP"
    echo "::warning::Failed to download $LATEST_NAME; falling back to filename patterns"
    map_from_filename_patterns
  fi
else
  echo "latest.json not found; falling back to asset filename patterns"
  map_from_filename_patterns
fi

echo "Mapped installer sources (GitHub):"
echo "  windows=$WIN_INSTALLER"
echo "  macos_arm=$MAC_ARM_DMG"
echo "  macos_x64=$MAC_X64_DMG"
echo "  linux_appimage=$LINUX_APPIMAGE"
echo "  linux_deb=$LINUX_DEB"
echo "  android_apk=$ANDROID_APK"
echo "  android_aab=$ANDROID_AAB"
echo "  android_store=$ANDROID_STORE_URL"
echo "  ios_store=$IOS_STORE_URL"
echo "Mapped updater sources (GitHub):"
echo "  windows=$WIN_UPDATER"
echo "  macos_arm=$MAC_ARM_UPD"
echo "  macos_x64=$MAC_X64_UPD"
echo "  linux=$LINUX_UPD"

# Host installers + updater binaries on S3 (private GitHub URLs break browser/Tauri downloads).
if [ -n "$WIN_INSTALLER" ]; then
  WIN_INSTALLER="$(upload_release_asset_to_s3 "$WIN_INSTALLER" "installer")"
fi
if [ -n "$MAC_ARM_DMG" ]; then
  MAC_ARM_DMG="$(upload_release_asset_to_s3 "$MAC_ARM_DMG" "installer")"
fi
if [ -n "$MAC_X64_DMG" ]; then
  MAC_X64_DMG="$(upload_release_asset_to_s3 "$MAC_X64_DMG" "installer")"
fi
if [ -n "$LINUX_APPIMAGE" ]; then
  LINUX_APPIMAGE="$(upload_release_asset_to_s3 "$LINUX_APPIMAGE" "installer")"
fi
if [ -n "$LINUX_DEB" ]; then
  LINUX_DEB="$(upload_release_asset_to_s3 "$LINUX_DEB" "installer")"
fi
if [ -n "$ANDROID_APK" ]; then
  ANDROID_APK="$(upload_release_asset_to_s3 "$ANDROID_APK" "installer")"
fi
if [ -n "$ANDROID_AAB" ]; then
  ANDROID_AAB="$(upload_release_asset_to_s3 "$ANDROID_AAB" "play-bundle")"
fi

if [ -n "$WIN_UPDATER" ]; then
  WIN_UPDATER="$(upload_updater_to_s3 "$WIN_UPDATER")"
fi
if [ -n "$MAC_ARM_UPD" ]; then
  MAC_ARM_UPD="$(upload_updater_to_s3 "$MAC_ARM_UPD")"
fi
if [ -n "$MAC_X64_UPD" ]; then
  MAC_X64_UPD="$(upload_updater_to_s3 "$MAC_X64_UPD")"
fi
if [ -n "$LINUX_UPD" ]; then
  LINUX_UPD="$(upload_updater_to_s3 "$LINUX_UPD")"
fi

echo "Mapped installer object URLs (S3):"
echo "  windows=$WIN_INSTALLER"
echo "  macos_arm=$MAC_ARM_DMG"
echo "  macos_x64=$MAC_X64_DMG"
echo "  linux_appimage=$LINUX_APPIMAGE"
echo "  linux_deb=$LINUX_DEB"
echo "  android_apk=$ANDROID_APK"
echo "  android_aab=$ANDROID_AAB"
echo "Mapped updater object URLs (S3):"
echo "  windows=$WIN_UPDATER"
echo "  macos_arm=$MAC_ARM_UPD"
echo "  macos_x64=$MAC_X64_UPD"
echo "  linux=$LINUX_UPD"

if [ -z "$WIN_INSTALLER$MAC_ARM_DMG$MAC_X64_DMG$LINUX_APPIMAGE$LINUX_DEB$ANDROID_APK" ]; then
  echo "::error::Failed to map any installer URLs" >&2
  exit 1
fi

PAYLOAD="$(jq -n \
  --arg version "$VERSION" \
  --arg channel "$CHANNEL" \
  --arg notes "$NOTES" \
  --arg published_at "$PUBLISHED_AT" \
  --arg windows_installer_url "$WIN_INSTALLER" \
  --arg macos_x64_installer_url "$MAC_X64_DMG" \
  --arg macos_arm_installer_url "$MAC_ARM_DMG" \
  --arg linux_installer_url "$LINUX_APPIMAGE" \
  --arg linux_deb_installer_url "$LINUX_DEB" \
  --arg android_apk_url "$ANDROID_APK" \
  --arg android_aab_url "$ANDROID_AAB" \
  --arg android_store_url "$ANDROID_STORE_URL" \
  --arg ios_store_url "$IOS_STORE_URL" \
  --arg windows_updater_url "$WIN_UPDATER" \
  --arg windows_updater_sig "$WIN_SIG" \
  --arg macos_x64_updater_url "$MAC_X64_UPD" \
  --arg macos_x64_updater_sig "$MAC_X64_SIG" \
  --arg macos_arm_updater_url "$MAC_ARM_UPD" \
  --arg macos_arm_updater_sig "$MAC_ARM_SIG" \
  --arg linux_updater_url "$LINUX_UPD" \
  --arg linux_updater_sig "$LINUX_SIG" \
  '{
    desktop_release: (
      {
        version: $version,
        channel: $channel,
        notes: $notes,
        published_at: (if $published_at == "" then null else $published_at end),
        active: true,
        windows_installer_url: (if $windows_installer_url == "" then null else $windows_installer_url end),
        macos_x64_installer_url: (if $macos_x64_installer_url == "" then null else $macos_x64_installer_url end),
        macos_arm_installer_url: (if $macos_arm_installer_url == "" then null else $macos_arm_installer_url end),
        linux_installer_url: (if $linux_installer_url == "" then null else $linux_installer_url end),
        linux_deb_installer_url: (if $linux_deb_installer_url == "" then null else $linux_deb_installer_url end),
        windows_updater_url: (if $windows_updater_url == "" then null else $windows_updater_url end),
        windows_updater_sig: (if $windows_updater_sig == "" then null else $windows_updater_sig end),
        macos_x64_updater_url: (if $macos_x64_updater_url == "" then null else $macos_x64_updater_url end),
        macos_x64_updater_sig: (if $macos_x64_updater_sig == "" then null else $macos_x64_updater_sig end),
        macos_arm_updater_url: (if $macos_arm_updater_url == "" then null else $macos_arm_updater_url end),
        macos_arm_updater_sig: (if $macos_arm_updater_sig == "" then null else $macos_arm_updater_sig end),
        linux_updater_url: (if $linux_updater_url == "" then null else $linux_updater_url end),
        linux_updater_sig: (if $linux_updater_sig == "" then null else $linux_updater_sig end)
      }
      + (if $android_apk_url == "" then {} else { android_apk_url: $android_apk_url } end)
      + (if $android_aab_url == "" then {} else { android_aab_url: $android_aab_url } end)
      + (if $android_store_url == "" then {} else { android_store_url: $android_store_url } end)
      + (if $ios_store_url == "" then {} else { ios_store_url: $ios_store_url } end)
    )
  }')"

HTTP_CODE="$(curl -sS "${CURL_API_OPTS[@]}" -o /tmp/register-response.json -w "%{http_code}" \
  -X POST "${API_URL%/}/api/v1/internal/desktop_releases" \
  -H "Authorization: Bearer ${DESKTOP_RELEASE_CI_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$PAYLOAD")"

echo "Rails response ($HTTP_CODE):"
cat /tmp/register-response.json
echo

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "::error::Failed to register desktop release (HTTP $HTTP_CODE)" >&2
  exit 1
fi

echo "Desktop release registered successfully."
