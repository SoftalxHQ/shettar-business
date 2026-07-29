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
download_asset() {
  local name="$1"
  local dest="$2"
  if [ -z "$name" ]; then
    return 1
  fi
  gh release download "$TAG" --repo "$REPO" -p "$name" -O "$dest"
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

# NOTE: patterns are bash single-quoted — use \. not \\. (\\ would search for a literal backslash).
WIN_INSTALLER="$(find_url '_x64-setup\.exe$')"
if [ -z "$WIN_INSTALLER" ]; then
  WIN_INSTALLER="$(find_url '_x64_en-US\.msi$')"
fi
MAC_ARM_DMG="$(find_url '_aarch64\.dmg$')"
MAC_X64_DMG="$(find_url '_x64\.dmg$')"
LINUX_APPIMAGE="$(find_url '\.AppImage$')"
LINUX_DEB="$(find_url '\.deb$')"

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

echo "Mapped installers:"
echo "  windows=$WIN_INSTALLER"
echo "  macos_arm=$MAC_ARM_DMG"
echo "  macos_x64=$MAC_X64_DMG"
echo "  linux_appimage=$LINUX_APPIMAGE"
echo "  linux_deb=$LINUX_DEB"
echo "Mapped updaters:"
echo "  windows=$WIN_UPDATER"
echo "  macos_arm=$MAC_ARM_UPD"
echo "  macos_x64=$MAC_X64_UPD"
echo "  linux=$LINUX_UPD"

if [ -z "$WIN_INSTALLER$MAC_ARM_DMG$MAC_X64_DMG$LINUX_APPIMAGE$LINUX_DEB" ]; then
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
  --arg windows_updater_url "$WIN_UPDATER" \
  --arg windows_updater_sig "$WIN_SIG" \
  --arg macos_x64_updater_url "$MAC_X64_UPD" \
  --arg macos_x64_updater_sig "$MAC_X64_SIG" \
  --arg macos_arm_updater_url "$MAC_ARM_UPD" \
  --arg macos_arm_updater_sig "$MAC_ARM_SIG" \
  --arg linux_updater_url "$LINUX_UPD" \
  --arg linux_updater_sig "$LINUX_SIG" \
  '{
    desktop_release: {
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
  }')"

HTTP_CODE="$(curl -sS -o /tmp/register-response.json -w "%{http_code}" \
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
