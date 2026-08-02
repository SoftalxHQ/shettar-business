#!/usr/bin/env bash
# Generate an Android release keystore and print GitHub Actions secret values.
# Usage:
#   ./scripts/generate-android-keystore.sh
# Then set SoftalxHQ/shettar-business secrets (Settings → Secrets → Actions):
#   ANDROID_KEYSTORE_BASE64, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD, ANDROID_STORE_PASSWORD
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/.android-signing"
KEYSTORE="${OUT_DIR}/shettar-business-release.keystore"
ALIAS="${ANDROID_KEY_ALIAS:-shettar-business}"
STORE_PASS="${ANDROID_STORE_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"
KEY_PASS="${ANDROID_KEY_PASSWORD:-$STORE_PASS}"

mkdir -p "$OUT_DIR"

if [ -f "$KEYSTORE" ]; then
  echo "Keystore already exists at $KEYSTORE"
  echo "Delete it first if you want to regenerate (breaking updates for already-installed apps)."
  exit 1
fi

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool not found. Install a JDK (e.g. Temurin 17) and retry." >&2
  exit 1
fi

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=Shettar Business, OU=Softalx, O=SoftalxHQ, L=Lagos, ST=Lagos, C=NG"

B64="$(base64 < "$KEYSTORE" | tr -d '\n')"
CREDS="${OUT_DIR}/github-secrets.txt"

umask 077
cat > "$CREDS" <<EOF
# Add these as GitHub Actions secrets on SoftalxHQ/shettar-business
# Keep this file private. Do not commit it.

ANDROID_KEY_ALIAS=${ALIAS}
ANDROID_KEY_PASSWORD=${KEY_PASS}
ANDROID_STORE_PASSWORD=${STORE_PASS}
ANDROID_KEYSTORE_BASE64=${B64}
EOF

echo "Wrote $KEYSTORE"
echo "Wrote $CREDS"
echo
echo "Set secrets with gh (after \`gh auth login\`):"
echo "  gh secret set ANDROID_KEY_ALIAS --body \"$ALIAS\" --repo SoftalxHQ/shettar-business"
echo "  gh secret set ANDROID_KEY_PASSWORD --body \"$KEY_PASS\" --repo SoftalxHQ/shettar-business"
echo "  gh secret set ANDROID_STORE_PASSWORD --body \"$STORE_PASS\" --repo SoftalxHQ/shettar-business"
echo "  gh secret set ANDROID_KEYSTORE_BASE64 < <(base64 < \"$KEYSTORE\" | tr -d '\\n') --repo SoftalxHQ/shettar-business"
