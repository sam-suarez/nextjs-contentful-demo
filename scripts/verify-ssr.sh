#!/usr/bin/env bash
# SSR checks for the catalog (P03: R7, R13, R15-R23). Later phases extend this file.
# P04 additions: product detail (R1-R11), login (R12-R15) and route-level not-found (R2, R16).
# P05 additions: layout toggle island (P05 R3, R5, R6; R14 via the R18 loop).
#
# Builds the app (unless VERIFY_SSR_SKIP_BUILD=1), starts `npm start` on
# VERIFY_SSR_PORT (default 3210) with mock data forced (CONTENTFUL_* exported
# as empty strings, D-021) and its own SESSION_SECRET, fetches pages with curl
# (no redirects followed), and asserts on the initial HTML. It mints its own
# session cookie with node + jose, so it never depends on the login UI.
#
# Prints one PASS/FAIL line per assertion and exits non-zero on any failure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Environment (D-021, architecture.md Tests) -----------------------------
export CONTENTFUL_SPACE_ID=""
export CONTENTFUL_ENVIRONMENT=""
export CONTENTFUL_DELIVERY_TOKEN=""
SESSION_SECRET="verify-ssr-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))')"
export SESSION_SECRET

PORT="${VERIFY_SSR_PORT:-3210}"
BASE="http://127.0.0.1:${PORT}"
TMP_BASE="${TMPDIR:-/tmp}"
WORK="$(mktemp -d "${TMP_BASE%/}/verify-ssr.XXXXXX")"
LOG="$WORK/server.log"
SERVER_PID=""
PASS_COUNT=0
FAIL_COUNT=0

cleanup() {
  local status=$?
  if [ -n "$SERVER_PID" ]; then
    # The server runs in its own process group (set -m below): stop npm and next together.
    kill -TERM -- "-$SERVER_PID" 2>/dev/null || kill -TERM "$SERVER_PID" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$SERVER_PID" 2>/dev/null || break
      sleep 0.5
    done
    kill -KILL -- "-$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if [ "$status" -eq 0 ]; then
    rm -rf "$WORK"
  else
    echo "Artifacts kept for inspection: $WORK"
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# --- Assertion helpers ------------------------------------------------------
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

# check "<Rn>: <assertion>" <predicate command...>
check() {
  local label="$1"
  shift
  if "$@"; then pass "$label"; else fail "$label"; fi
}

# Non-overlapping occurrences of a fixed string.
occurrences() { { grep -o -F -- "$2" "$1" || true; } | wc -l | tr -d '[:space:]'; }
has() { grep -q -F -- "$2" "$1"; }
lacks() { ! grep -q -F -- "$2" "$1"; }
count_is() { [ "$(occurrences "$1" "$2")" -eq "$3" ]; }
count_ge() { [ "$(occurrences "$1" "$2")" -ge "$3" ]; }
status_is() { [ "$(cat "$1.status")" = "$2" ]; }

# Response header lookup (P04: redirects). fetch_page always writes "$1.headers".
header_val() {
  local file="$1" name="$2"
  { grep -i "^$name:" "$file.headers" || true; } | tail -n1 | sed -E 's/^[^:]+:[[:space:]]*//' | tr -d '\r\n'
}
location_is() { [ "$(header_val "$1" "Location")" = "$2" ]; }

# Whole-tag lookup, attributes in any order, values compared in their
# HTML-escaped form. Usage: tag_count FILE TAG|* name=value ...
cat >"$WORK/tags.mjs" <<'JS'
import { readFileSync } from "node:fs";
const [file, tag, ...wanted] = process.argv.slice(2);
const html = readFileSync(file, "utf8");
const tagRe = tag === "*" ? /<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>/g : new RegExp(`<(${tag})(\\s[^>]*)?>`, "g");
const want = wanted.map((w) => {
  const i = w.indexOf("=");
  return [w.slice(0, i), w.slice(i + 1)];
});
let count = 0;
for (const m of html.matchAll(tagRe)) {
  const attrs = new Map();
  for (const a of (m[2] ?? "").matchAll(/([^\s"'=<>\/]+)(?:\s*=\s*"([^"]*)")?/g)) {
    attrs.set(a[1], a[2] ?? "");
  }
  if (want.every(([k, v]) => attrs.get(k) === v)) count++;
}
process.stdout.write(String(count));
JS
tag_count() { node "$WORK/tags.mjs" "$@"; }
tag_count_is() {
  local file="$1" want="$2"
  shift 2
  [ "$(tag_count "$file" "$@")" -eq "$want" ]
}
tag_exists() { [ "$(tag_count "$@")" -ge 1 ]; }
no_tag() { [ "$(tag_count "$@")" -eq 0 ]; }

# First occurrences of each string appear, in the given order.
cat >"$WORK/order.mjs" <<'JS'
import { readFileSync } from "node:fs";
const [file, ...needles] = process.argv.slice(2);
const html = readFileSync(file, "utf8");
let last = -1;
for (const n of needles) {
  const i = html.indexOf(n);
  if (i === -1 || i <= last) process.exit(1);
  last = i;
}
JS
in_order() { node "$WORK/order.mjs" "$@"; }

# P05: the layout option anchors. Prints one line per <a> whose text (tags stripped,
# trimmed) equals TEXT: "href=<v>|aria-current=<v>|aria-pressed=<v>|role=<v>" with each
# value in its HTML-escaped form, "-" when the attribute is absent.
cat >"$WORK/anchors.mjs" <<'JS'
import { readFileSync } from "node:fs";
const [file, text] = process.argv.slice(2);
const html = readFileSync(file, "utf8");
const out = [];
for (const m of html.matchAll(/<a(\s[^>]*)?>([\s\S]*?)<\/a>/g)) {
  if (m[2].replace(/<[^>]*>/g, "").trim() !== text) continue;
  const attrs = new Map();
  for (const a of (m[1] ?? "").matchAll(/([^\s"'=<>\/]+)(?:\s*=\s*"([^"]*)")?/g)) attrs.set(a[1], a[2] ?? "");
  const v = (k) => (attrs.has(k) ? attrs.get(k) : "-");
  out.push(`href=${v("href")}|aria-current=${v("aria-current")}|aria-pressed=${v("aria-pressed")}|role=${v("role")}`);
}
process.stdout.write(out.join("\n"));
JS
anchors() { node "$WORK/anchors.mjs" "$@"; }
# option_is FILE TEXT EXPECTED_LINE: exactly one such <a>, with exactly these attributes.
option_is() { [ "$(anchors "$1" "$2")" = "$3" ]; }

# P05 R3/R6: every element carrying data-layout. Prints "<tag>|<data-layout>|<has group class>"
# per element, one per line.
cat >"$WORK/layout.mjs" <<'JS'
import { readFileSync } from "node:fs";
const [file] = process.argv.slice(2);
const html = readFileSync(file, "utf8");
const out = [];
for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)>/g)) {
  const attrs = new Map();
  for (const a of m[2].matchAll(/([^\s"'=<>\/]+)(?:\s*=\s*"([^"]*)")?/g)) attrs.set(a[1], a[2] ?? "");
  if (!attrs.has("data-layout")) continue;
  const group = (attrs.get("class") ?? "").split(/\s+/).includes("group");
  out.push(`${m[1]}|${attrs.get("data-layout")}|${group ? "group" : "no-group"}`);
}
process.stdout.write(out.join("\n"));
JS
layout_wrappers() { node "$WORK/layout.mjs" "$@"; }
# layout_wrapper_is FILE VALUE: exactly one data-layout element, a <div class="group ..."> with that value.
layout_wrapper_is() { [ "$(layout_wrappers "$1")" = "div|$2|group" ]; }
layout_wrapper_any() { local w; w="$(layout_wrappers "$1")"; [ "$w" = "div|price|group" ] || [ "$w" = "div|specs|group" ]; }

# Trimmed text content of the first <h1>...</h1> (tags inside, if any, stripped).
cat >"$WORK/h1.mjs" <<'JS'
import { readFileSync } from "node:fs";
const [file] = process.argv.slice(2);
const html = readFileSync(file, "utf8");
const m = html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/);
process.stdout.write(m ? m[1].replace(/<[^>]*>/g, "").trim() : "");
JS
h1_text() { node "$WORK/h1.mjs" "$@"; }
h1_text_is() { [ "$(h1_text "$1")" = "$2" ]; }

# fetch_page NAME PATH [COOKIE]: body to $WORK/NAME.html, status to $WORK/NAME.html.status,
# response headers (for redirect checks, P04 R3/R12) to $WORK/NAME.html.headers.
FETCHED=""
fetch_page() {
  local name="$1" path="$2" cookie="${3:-}"
  local out="$WORK/$name.html"
  local code
  if [ -n "$cookie" ]; then
    code="$(curl -s --max-time 60 -D "$out.headers" -o "$out" -w '%{http_code}' -H "Cookie: $cookie" "$BASE$path" || echo 000)"
  else
    code="$(curl -s --max-time 60 -D "$out.headers" -o "$out" -w '%{http_code}' "$BASE$path" || echo 000)"
  fi
  [ -f "$out" ] || : >"$out"
  [ -f "$out.headers" ] || : >"$out.headers"
  echo "$code" >"$out.status"
  FETCHED="$FETCHED $name"
}
page() { echo "$WORK/$1.html"; }

# --- Mock data facts (spec P03 table, name order) ---------------------------
PUBLIC_NAMES=(
  "Bubble Bath Whale" "Cloud Bunny Plush" "Jingle Ball Trio" "Ocean Wave Rattle"
  "Rainbow Ring Stacker" "Shape Sorter Cube" "Starlight Teether Ring" "Sunny Duck Bath Squirter"
)
AUTH_NAMES=(
  "Forest Friends Activity Cube" "Heirloom Wooden Xylophone" "Moonbeam Musical Mobile" "Sensory Crinkle Book Set"
)
ALL_NAMES_IN_ORDER=(
  "Bubble Bath Whale" "Cloud Bunny Plush" "Forest Friends Activity Cube" "Heirloom Wooden Xylophone"
  "Jingle Ball Trio" "Moonbeam Musical Mobile" "Ocean Wave Rattle" "Rainbow Ring Stacker"
  "Sensory Crinkle Book Set" "Shape Sorter Cube" "Starlight Teether Ring" "Sunny Duck Bath Squirter"
)
PUBLIC_EVERYDAY=('$14.00' '$28.00' '$16.00' '$12.00' '$24.00' '$32.00' '$11.00' '$9.00')
AUTH_EVERYDAY=('$89.00' '$54.00' '$68.00' '$36.00')
MEMBER_PRICES=('$11.20' '$22.40' '$71.20' '$43.20' '$12.80' '$54.40' '$9.60' '$19.20' '$28.80' '$25.60' '$8.80' '$7.20')

# P04 mock data facts (spec P04 table + src/data/products.mock.json).
CBP_DESCRIPTION="A sleepy bunny with a squishy cloud body and long pink-lined ears. Embroidered features make it a safe first cuddle buddy from day one."
CBP_FEATURES=("GOTS-certified organic cotton" "Embroidered eyes, no small parts" "Machine washable" "Ultra-soft cloud body")
FFAC_DESCRIPTION="A members-only, heirloom-quality activity center with a bead maze on top and gears, spinners and shape slides on every side."
FFAC_FEATURES=("Bead maze top" "Five activity sides" "Gears, spinners and shape slides" "Heirloom quality")

# --- Build and start --------------------------------------------------------
if [ "${VERIFY_SSR_SKIP_BUILD:-}" = "1" ]; then
  echo "INFO: VERIFY_SSR_SKIP_BUILD=1, using the existing .next build"
else
  echo "INFO: npm run build (CONTENTFUL_* blank, own SESSION_SECRET)"
  if ! npm run build >"$WORK/build.log" 2>&1; then
    tail -n 40 "$WORK/build.log"
    fail "setup: npm run build succeeds"
    exit 1
  fi
fi

if curl -s -o /dev/null --max-time 2 "$BASE/"; then
  fail "setup: port $PORT is free (something already answers there; set VERIFY_SSR_PORT)"
  exit 1
fi

set -m
npm start -- --port "$PORT" </dev/null >"$LOG" 2>&1 &
SERVER_PID=$!
set +m

ready=0
for _ in $(seq 1 120); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  if curl -s -o /dev/null --max-time 2 "$BASE/favicon.ico"; then ready=1; break; fi
  sleep 0.5
done
if [ "$ready" -ne 1 ]; then
  tail -n 40 "$LOG" || true
  fail "setup: server answers on $BASE within 60 s"
  exit 1
fi
echo "INFO: server up on $BASE (log: $LOG)"

# --- Session cookies --------------------------------------------------------
TOKEN="$(node --input-type=module -e '
import { SignJWT } from "jose";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
const token = await new SignJWT({ name: "ssr-checker" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
  .sign(secret);
process.stdout.write(token);
')"
GOOD_COOKIE="session=$TOKEN"
BAD_COOKIE="session=not-a-jwt"

# --- Fetch ------------------------------------------------------------------
fetch_page anon "/"
fetch_page member "/" "$GOOD_COOKIE"
fetch_page badcookie "/" "$BAD_COOKIE"
fetch_page bath "/?category=bath"
fetch_page washable "/?q=washable"
fetch_page washable_member "/?q=washable" "$GOOD_COOKIE"
fetch_page activity "/?category=activity-sensory"
fetch_page activity_member "/?category=activity-sensory" "$GOOD_COOKIE"
fetch_page zzz "/?q=zzz"
fetch_page robots_bogus "/?category=robots&layout=bogus"
fetch_page specs "/?layout=specs"
fetch_page washable_specs "/?q=washable&layout=specs"
fetch_page bath_specs "/?category=bath&layout=specs"
# P05
fetch_page bogus "/?layout=bogus"
fetch_page specs_member "/?layout=specs" "$GOOD_COOKIE"

# Catalog-only pages, for the R20 "every catalog link keeps state" loop below: P04 adds
# non-catalog pages (detail, login, not-found) to $FETCHED for the R18 streaming check,
# but those never render the catalog's Clear-filters link or filter chips.
CATALOG_FETCHED="$FETCHED"

# P04: product detail, login, not-found
fetch_page detail_cbp_anon "/products/cloud-bunny-plush"
fetch_page detail_cbp_member "/products/cloud-bunny-plush" "$GOOD_COOKIE"
fetch_page detail_ffac_anon "/products/forest-friends-activity-cube"
fetch_page detail_ffac_member "/products/forest-friends-activity-cube" "$GOOD_COOKIE"
fetch_page detail_bbw_anon "/products/bubble-bath-whale"
fetch_page detail_unknown "/products/no-such-toy"
fetch_page detail_badslug "/products/Not-Valid-Slug"
fetch_page login_anon "/login"
fetch_page login_member "/login" "$GOOD_COOKIE"
fetch_page login_next_valid "/login?next=%2Fproducts%2Fforest-friends-activity-cube"
fetch_page login_next_unsafe "/login?next=%2F%2Fevil.com"
fetch_page login_error_missing "/login?error=missing"
fetch_page login_error_bogus "/login?error=bogus"

# --- R15: logged out --------------------------------------------------------
P="$(page anon)"
check "R15: GET / (no cookie) status 200" status_is "$P" 200
for n in "${PUBLIC_NAMES[@]}"; do check "R15: logged out contains public name '$n'" has "$P" "$n"; done
for n in "${AUTH_NAMES[@]}"; do check "R15: logged out lacks authenticated name '$n'" lacks "$P" "$n"; done
check "R15: '>Everyday price<' occurs exactly 8 times" count_is "$P" ">Everyday price<" 8
check "R15: '>Member price<' occurs 0 times" count_is "$P" ">Member price<" 0
for p in "${PUBLIC_EVERYDAY[@]}"; do check "R15: logged out contains everyday price $p" has "$P" "$p"; done
for p in "${MEMBER_PRICES[@]}"; do check "R15: logged out lacks member price $p" lacks "$P" "$p"; done
for p in "${AUTH_EVERYDAY[@]}"; do check "R15: logged out lacks authenticated everyday price $p" lacks "$P" "$p"; done
check "R15: no '>Members only<'" lacks "$P" ">Members only<"
check "R15: no '>Member pricing<'" lacks "$P" ">Member pricing<"
check "R15: logged-out banner sentence present" has "$P" "You&#x27;re seeing everyday prices. Sign in to unlock member prices and members-only toys."
check "R15: contains href=\"/login\"" has "$P" 'href="/login"'
check "R15: contains '>Sign in<'" has "$P" ">Sign in<"
check "R15: no \$ACTION_ID_ (no sign-out form)" lacks "$P" '$ACTION_ID_'
check "R15: no 'Signed in as'" lacks "$P" "Signed in as"
check "R15: contains '>8 toys<'" has "$P" ">8 toys<"
check "R15: '<article' occurs exactly 8 times" count_is "$P" "<article" 8

# --- R16: logged in ---------------------------------------------------------
P="$(page member)"
for n in "${ALL_NAMES_IN_ORDER[@]}"; do check "R16: logged in contains '$n'" has "$P" "$n"; done
for p in "${MEMBER_PRICES[@]}"; do check "R16: logged in contains member price $p" has "$P" "$p"; done
for p in "${PUBLIC_EVERYDAY[@]}" "${AUTH_EVERYDAY[@]}"; do check "R16: logged in lacks everyday price $p" lacks "$P" "$p"; done

# --- R17: bad cookie --------------------------------------------------------
P="$(page badcookie)"
for n in "${AUTH_NAMES[@]}"; do check "R17: bad cookie lacks authenticated name '$n'" lacks "$P" "$n"; done
check "R17: bad cookie '>Everyday price<' occurs exactly 8 times" count_is "$P" ">Everyday price<" 8
check "R17: bad cookie '>Member price<' occurs 0 times" count_is "$P" ">Member price<" 0
for p in "${MEMBER_PRICES[@]}"; do check "R17: bad cookie lacks member price $p" lacks "$P" "$p"; done

# --- R19: filtered URLs -----------------------------------------------------
P="$(page bath)"
check "R19a: /?category=bath status 200" status_is "$P" 200
check "R19a: contains 'Bubble Bath Whale'" has "$P" "Bubble Bath Whale"
check "R19a: contains 'Sunny Duck Bath Squirter'" has "$P" "Sunny Duck Bath Squirter"
check "R19a: lacks 'Cloud Bunny Plush'" lacks "$P" "Cloud Bunny Plush"
check "R19a: contains '>2 toys<'" has "$P" ">2 toys<"
check "R19a: exactly 2 <a> tags with aria-current=\"true\"" tag_count_is "$P" 2 a 'aria-current=true'
check "R19a: both aria-current <a> tags have href=\"/?category=bath\"" tag_count_is "$P" 2 a 'aria-current=true' 'href=/?category=bath'

P="$(page washable)"
check "R19b: /?q=washable status 200" status_is "$P" 200
check "R19b: contains '>1 toy<'" has "$P" ">1 toy<"
check "R19b: contains 'Cloud Bunny Plush'" has "$P" "Cloud Bunny Plush"
check "R19b: lacks 'Ocean Wave Rattle'" lacks "$P" "Ocean Wave Rattle"
check "R19b: <input> with name=\"q\" value=\"washable\"" tag_exists "$P" input 'name=q' 'value=washable'

P="$(page washable_member)"
check "R19c: /?q=washable logged in status 200" status_is "$P" 200
check "R19c: contains '>2 toys<'" has "$P" ">2 toys<"
check "R19c: contains 'Cloud Bunny Plush'" has "$P" "Cloud Bunny Plush"
check "R19c: contains 'Sensory Crinkle Book Set'" has "$P" "Sensory Crinkle Book Set"

P="$(page activity)"
check "R19d: /?category=activity-sensory status 200" status_is "$P" 200
check "R19d: contains '>0 toys<'" has "$P" ">0 toys<"
check "R19d: contains '>No toys match your search<'" has "$P" ">No toys match your search<"
check "R19d: contains '>No toys in this category yet.<'" has "$P" ">No toys in this category yet.<"
check "R19d: no 'data-layout=' (no grid wrapper)" lacks "$P" "data-layout="

P="$(page activity_member)"
check "R19d: /?category=activity-sensory logged in status 200" status_is "$P" 200
check "R19d: logged in contains '>2 toys<'" has "$P" ">2 toys<"
check "R19d: logged in contains 'Forest Friends Activity Cube'" has "$P" "Forest Friends Activity Cube"
check "R19d: logged in contains 'Sensory Crinkle Book Set'" has "$P" "Sensory Crinkle Book Set"

P="$(page zzz)"
check "R19e: /?q=zzz status 200" status_is "$P" 200
check "R19e: contains '>0 toys<'" has "$P" ">0 toys<"
check "R19e: contains '>Try a different word or category.<'" has "$P" ">Try a different word or category.<"

P="$(page robots_bogus)"
check "R19f: /?category=robots&layout=bogus status 200" status_is "$P" 200
check "R19f: contains '>8 toys<'" has "$P" ">8 toys<"
check "R19f: contains data-layout=\"price\"" has "$P" 'data-layout="price"'
check "R19f: exactly 2 <a> tags with aria-current=\"true\"" tag_count_is "$P" 2 a 'aria-current=true'
check "R19f: both aria-current <a> tags have href=\"/\"" tag_count_is "$P" 2 a 'aria-current=true' 'href=/'

P="$(page specs)"
check "R19g: /?layout=specs status 200" status_is "$P" 200
check "R19g: contains data-layout=\"specs\"" has "$P" 'data-layout="specs"'
check "R19g: contains '>8 toys<'" has "$P" ">8 toys<"
check "R19g: exactly 2 <a> tags with aria-current=\"true\"" tag_count_is "$P" 2 a 'aria-current=true'
check "R19g: both aria-current <a> tags have href=\"/?layout=specs\"" tag_count_is "$P" 2 a 'aria-current=true' 'href=/?layout=specs'

# --- R20: links keep state --------------------------------------------------
P="$(page washable_specs)"
check "R20: /?q=washable&layout=specs status 200" status_is "$P" 200
check "R20: Bath chip href keeps q and layout" has "$P" 'href="/?category=bath&amp;q=washable&amp;layout=specs"'
check "R20: All chip href keeps q and layout" has "$P" 'href="/?q=washable&amp;layout=specs"'
check "R20: Price first href is /?q=washable" has "$P" 'href="/?q=washable"'
check "R20: hidden <input> name=\"layout\" value=\"specs\"" tag_exists "$P" input 'type=hidden' 'name=layout' 'value=specs'
check "R20: no <input> with name=\"category\"" no_tag "$P" input 'name=category'
check "R20: <form> with action=\"/\"" tag_exists "$P" form 'action=/'

P="$(page bath_specs)"
check "R20: /?category=bath&layout=specs status 200" status_is "$P" 200
check "R20: hidden <input> name=\"category\" value=\"bath\"" tag_exists "$P" input 'type=hidden' 'name=category' 'value=bath'

for name in $CATALOG_FETCHED; do
  P="$(page "$name")"
  check "R20: [$name] contains href=\"/\"" has "$P" 'href="/"'
  check "R20: [$name] contains '>Clear filters<'" has "$P" ">Clear filters<"
done

# --- R21: cards and images (logged out /) -----------------------------------
P="$(page anon)"
check "R21: href=\"/products/cloud-bunny-plush\" occurs exactly once" count_is "$P" 'href="/products/cloud-bunny-plush"' 1
check "R21: <img> with src=\"/products/cloud-bunny-plush.svg\" alt=\"Cloud Bunny Plush\"" tag_exists "$P" img 'src=/products/cloud-bunny-plush.svg' 'alt=Cloud Bunny Plush'
check "R21: '>Picture coming soon<' occurs exactly once" count_is "$P" ">Picture coming soon<" 1
check "R21: no tag with src=\"/products/bubble-bath-whale.svg\"" no_tag "$P" '*' 'src=/products/bubble-bath-whale.svg'
check "R21: '<h1' occurs exactly once" count_is "$P" "<h1" 1
check "R21: contains '>Toy catalog<'" has "$P" ">Toy catalog<"
check "R21: contains '>Bright, safe toys for little hands.<'" has "$P" ">Bright, safe toys for little hands.<"
check "R21: '<main' occurs exactly once" count_is "$P" "<main" 1
check "R21: '<header' occurs at least once" count_ge "$P" "<header" 1
check "R21: contains '>Tiny Confetti<' (logo wordmark)" has "$P" ">Tiny Confetti<"

# --- R22: filter card copy (/) ----------------------------------------------
check "R22: '>Search<' occurs at least twice (label and button)" count_ge "$P" ">Search<" 2
check "R22: search placeholder" has "$P" 'placeholder="Search toys by name or feature"'
check "R22: seven chip labels, first occurrences in order" in_order "$P" ">All<" ">Rattles &amp; Teethers<" ">Plush<" ">Stacking &amp; Sorting<" ">Bath<" ">Activity &amp; Sensory<" ">Musical<"
check "R22: contains '>Layout<'" has "$P" ">Layout<"
check "R22: contains '>Price first<'" has "$P" ">Price first<"
check "R22: contains '>Specs first<'" has "$P" ">Specs first<"

# --- R7: footer (/) ---------------------------------------------------------
check "R7: footer text 'Tiny Confetti demo catalog'" has "$P" "Tiny Confetti demo catalog"
check "R7: footer text 'Prices in USD. Member prices need sign-in.'" has "$P" "Prices in USD. Member prices need sign-in."
check "R7: '<footer' occurs at least once" count_ge "$P" "<footer" 1

# --- R18 (and R13): no streaming, no fallback, on every fetched page --------
for name in $FETCHED; do
  P="$(page "$name")"
  check "R18: [$name] no '<div hidden id=\"S:'" lacks "$P" '<div hidden id="S:'
  check "R18: [$name] no pending boundary '<!--\$?-->'" lacks "$P" '<!--$?-->'
  check "R18: [$name] no '<template id=\"B:'" lacks "$P" '<template id="B:'
  check "R18: [$name] no 'Loading'" lacks "$P" "Loading"
done

# --- R23: really ran on mock data -------------------------------------------
check "R23: server log contains '[products] source: mock'" has "$LOG" "[products] source: mock"

# =====================================================================
# P04: product detail, login, route-level not-found
# =====================================================================

# --- R4: product detail, logged out (Cloud Bunny Plush, public) ------------
P="$(page detail_cbp_anon)"
check "R4: GET /products/cloud-bunny-plush (no cookie) status 200" status_is "$P" 200
check "R4: contains product name 'Cloud Bunny Plush'" has "$P" "Cloud Bunny Plush"
check "R4: contains description" has "$P" "$CBP_DESCRIPTION"
check "R4: contains material 'Organic cotton, polyester fill'" has "$P" "Organic cotton, polyester fill"
check "R4: contains age range '0 months+'" has "$P" "0 months+"
check "R4: '>Everyday price<' occurs exactly once" count_is "$P" ">Everyday price<" 1
check "R4: contains '\$28.00'" has "$P" '$28.00'
check "R4: no '>Member price<'" lacks "$P" ">Member price<"
check "R4: no '\$22.40'" lacks "$P" '$22.40'
check "R4: no '>Members only<'" lacks "$P" ">Members only<"
check "R4: secondary button links to /login?next=/products/cloud-bunny-plush" tag_exists "$P" a 'href=/login?next=/products/cloud-bunny-plush'
check "R4: contains 'Sign in for member pricing'" has "$P" ">Sign in for member pricing<"
check "R4: contains sentence 'Members get lower prices on every toy.'" has "$P" "Members get lower prices on every toy."

# --- R7: breadcrumb (Cloud Bunny Plush) -------------------------------------
check "R7: breadcrumb 'Catalog' links to /" has "$P" 'href="/">Catalog<'
check "R7: breadcrumb category link is Plush -> /?category=plush" has "$P" 'href="/?category=plush">Plush<'
check "R7: breadcrumb reads Catalog, Plush, product name in order" in_order "$P" ">Catalog<" ">Plush<" "Cloud Bunny Plush"
check "R7: product name in the breadcrumb is plain text, not a link" lacks "$P" ">Cloud Bunny Plush</a>"

# --- R8: image frame (Cloud Bunny Plush has an image) -----------------------
check "R8: blob-radius image frame class present" has "$P" "rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-none"
check "R8: <img> for Cloud Bunny Plush" tag_exists "$P" img 'src=/products/cloud-bunny-plush.svg' 'alt=Cloud Bunny Plush'

# --- R8: image placeholder (Bubble Bath Whale has no image) ----------------
P="$(page detail_bbw_anon)"
check "R8: GET /products/bubble-bath-whale status 200" status_is "$P" 200
check "R8: '>Picture coming soon<' occurs exactly once" count_is "$P" ">Picture coming soon<" 1
check "R8: no <img> tag at all (placeholder instead)" no_tag "$P" img

# --- R9: details block (Cloud Bunny Plush) ----------------------------------
P="$(page detail_cbp_anon)"
check "R9: 'Age range' row label present" has "$P" ">Age range<"
check "R9: 'Material' row label present" has "$P" ">Material<"

# --- R10: 'What makes it special' (Cloud Bunny Plush) -----------------------
check "R10: heading 'What makes it special'" has "$P" ">What makes it special<"
for f in "${CBP_FEATURES[@]}"; do check "R10: Cloud Bunny Plush feature '$f'" has "$P" "$f"; done
check "R10: check-icon circle uses quaternary (mint) fill" has "$P" "bg-quaternary"

# --- R11: 'Back to catalog' link (Cloud Bunny Plush) ------------------------
check "R11: exactly one 'Back to catalog' link on the detail screen" count_is "$P" ">Back to catalog<" 1
check "R11: 'Back to catalog' links to /" has "$P" 'href="/">Back to catalog<'

# --- R3: Set B product, no session -> redirect to /login, no product data --
P="$(page detail_ffac_anon)"
check "R3: redirect body has no product name" lacks "$P" "Forest Friends Activity Cube"
check "R3: redirect body has no everyday price" lacks "$P" '$89.00'
check "R3: redirect body has no member price" lacks "$P" '$71.20'
check "R3: redirect body has no description" lacks "$P" "$FFAC_DESCRIPTION"

# --- R5: public product with a session -> member price only ----------------
P="$(page detail_cbp_member)"
check "R5: GET /products/cloud-bunny-plush (session) status 200" status_is "$P" 200
check "R5: '>Member price<' occurs exactly once, in accent-strong" count_is "$P" 'text-accent-strong">Member price<' 1
check "R5: contains '\$22.40'" has "$P" '$22.40'
check "R5: no '>Everyday price<'" lacks "$P" ">Everyday price<"
check "R5: no '\$28.00'" lacks "$P" '$28.00'
check "R5: no 'Sign in for member pricing'" lacks "$P" "Sign in for member pricing"

# --- R6: Set B product with a session -> found, Members only badge ---------
P="$(page detail_ffac_member)"
check "R6: GET /products/forest-friends-activity-cube (session) status 200" status_is "$P" 200
check "R6: contains product name" has "$P" "Forest Friends Activity Cube"
check "R6: contains '>Member price<'" has "$P" ">Member price<"
check "R6: contains '\$71.20'" has "$P" '$71.20'
check "R6: '>Members only<' occurs exactly once" count_is "$P" ">Members only<" 1
check "R6: '<h1' occurs exactly once" count_is "$P" "<h1" 1
check "R6: h1 text is exactly the product name" h1_text_is "$P" "Forest Friends Activity Cube"
check "R6: Members only badge comes after the h1" in_order "$P" "<h1" ">Members only<"
check "R10: heading 'What makes it special' (Forest Friends Activity Cube)" has "$P" ">What makes it special<"
for f in "${FFAC_FEATURES[@]}"; do check "R10: Forest Friends Activity Cube feature '$f'" has "$P" "$f"; done

# --- R2: unknown slug and a slug that fails SLUG_PATTERN both 404 ----------
P="$(page detail_unknown)"

PB="$(page detail_badslug)"


# --- R12: /login, no redirect without a session, redirect to / with one ---
P="$(page login_anon)"
check "R12: GET /login (no session) status 200 (not redirected)" status_is "$P" 200

P="$(page login_member)"
check "R12: GET /login (valid session) status 307" status_is "$P" 307
check "R12: Location is /" location_is "$P" "/"
check "R12: redirect body has no sign-in form" lacks "$P" ">Sign in<"

# --- R13: login screen content ----------------------------------------------
P="$(page login_anon)"
check "R13: '>Sign in<' occurs exactly twice (h1 and submit button)" count_is "$P" ">Sign in<" 2
check "R13: <h1>Sign in</h1>" h1_text_is "$P" "Sign in"
check "R13: sentence 'Sign in to see member prices and members-only toys.'" has "$P" "Sign in to see member prices and members-only toys."
check "R13: sentence 'This is a demo, so any username and password work.'" has "$P" "This is a demo, so any username and password work."
check "R13: <form> present (server action)" tag_exists "$P" form
check "R13: server-action marker '\$ACTION_ID_' (form action={login})" has "$P" '$ACTION_ID_'
check "R13: username input (placeholder=demo, required)" tag_exists "$P" input 'name=username' 'placeholder=demo' 'required='
check "R13: password input (type=password, placeholder='Any password', required)" tag_exists "$P" input 'type=password' 'name=password' 'placeholder=Any password' 'required='
check "R13: submit button present" tag_exists "$P" button 'type=submit'
check "R13: link 'Continue browsing without signing in' to /" has "$P" 'href="/">Continue browsing without signing in<'

# --- R14: next round-trips through safeNextPath -----------------------------
P="$(page login_next_valid)"
check "R14: GET /login?next=%2Fproducts%2F... status 200" status_is "$P" 200
check "R14: hidden input next carries the sanitised value" tag_exists "$P" input 'type=hidden' 'name=next' 'value=/products/forest-friends-activity-cube'
check "R14: 'Continue browsing' link still targets / (declining sign-in never forwards next)" has "$P" 'href="/">Continue browsing without signing in<'

P="$(page login_next_unsafe)"
check "R14: GET /login?next=%2F%2Fevil.com status 200" status_is "$P" 200
check "R14: no hidden next input for an unsafe (protocol-relative //) next" no_tag "$P" input 'name=next'

P="$(page login_anon)"
check "R14: no hidden next input when next is missing" no_tag "$P" input 'name=next'

# --- R15: /login?error=missing alert ----------------------------------------
P="$(page login_error_missing)"
check "R15: GET /login?error=missing status 200" status_is "$P" 200
check "R15: exactly one role=\"alert\" element" tag_count_is "$P" 1 '*' 'role=alert'
check "R15: alert text 'Enter a username and password to sign in.'" has "$P" "Enter a username and password to sign in."
check "R15: alert is positioned above the username field" in_order "$P" "Enter a username and password to sign in." 'name="username"'

P="$(page login_anon)"
check "R15: /login (no error param) has no role=\"alert\"" lacks "$P" 'role="alert"'

P="$(page login_error_bogus)"
check "R15: /login?error=bogus has no role=\"alert\"" lacks "$P" 'role="alert"'

# =====================================================================
# P05: layout toggle island (server HTML for no-JS clients)
# =====================================================================

# --- R5: layout options are two plain links in the server HTML -------------
# NAME | expected Price first href | expected Specs first href | active layout
# (hrefs in their HTML-escaped form, as catalogHref renders them: category, q, layout).
P05_OPTIONS=(
  "anon|/|/?layout=specs|price"
  "member|/|/?layout=specs|price"
  "badcookie|/|/?layout=specs|price"
  "bath|/?category=bath|/?category=bath&amp;layout=specs|price"
  "washable|/?q=washable|/?q=washable&amp;layout=specs|price"
  "washable_member|/?q=washable|/?q=washable&amp;layout=specs|price"
  "activity|/?category=activity-sensory|/?category=activity-sensory&amp;layout=specs|price"
  "activity_member|/?category=activity-sensory|/?category=activity-sensory&amp;layout=specs|price"
  "zzz|/?q=zzz|/?q=zzz&amp;layout=specs|price"
  "robots_bogus|/|/?layout=specs|price"
  "specs|/|/?layout=specs|specs"
  "washable_specs|/?q=washable|/?q=washable&amp;layout=specs|specs"
  "bath_specs|/?category=bath|/?category=bath&amp;layout=specs|specs"
  "bogus|/|/?layout=specs|price"
  "specs_member|/|/?layout=specs|specs"
)
for row in "${P05_OPTIONS[@]}"; do
  IFS='|' read -r name price_href specs_href active <<<"$row"
  P="$(page "$name")"
  if [ "$active" = "price" ]; then pc="true"; sc="-"; else pc="-"; sc="true"; fi
  check "R5: [$name] status 200" status_is "$P" 200
  check "R5: [$name] one <a>Price first</a>, href=$price_href, aria-current=$pc, no aria-pressed, no role" \
    option_is "$P" "Price first" "href=$price_href|aria-current=$pc|aria-pressed=-|role=-"
  check "R5: [$name] one <a>Specs first</a>, href=$specs_href, aria-current=$sc, no aria-pressed, no role" \
    option_is "$P" "Specs first" "href=$specs_href|aria-current=$sc|aria-pressed=-|role=-"
  check "R5: [$name] no 'aria-pressed' anywhere in the server HTML" lacks "$P" "aria-pressed"
  check "R5: [$name] no 'role=\"button\"' anywhere in the server HTML" lacks "$P" 'role="button"'
done

# --- R6 / R3: exactly one data-layout, on the grid wrapper <div class="group ..."> ---
# NAME | expected data-layout
P05_LAYOUTS=(
  "anon|price"
  "specs|specs"
  "bogus|price"
  "specs_member|specs"
)
for row in "${P05_LAYOUTS[@]}"; do
  IFS='|' read -r name want <<<"$row"
  P="$(page "$name")"
  check "R6: [$name] 'data-layout=' occurs exactly once" count_is "$P" "data-layout=" 1
  check "R6: [$name] data-layout=\"$want\" occurs exactly once" count_is "$P" "data-layout=\"$want\"" 1
  check "R3: [$name] the data-layout element is a <div> with class 'group', data-layout=$want" layout_wrapper_is "$P" "$want"
done
for name in bath washable washable_member robots_bogus washable_specs bath_specs member badcookie activity_member; do
  check "R3: [$name] exactly one data-layout element, a <div> with class 'group'" layout_wrapper_any "$(page "$name")"
done

# --- R3: empty state still renders no data-layout (P03 R19d) ---------------
for name in activity zzz; do
  check "R3: [$name] empty state has no 'data-layout='" lacks "$(page "$name")" "data-layout="
done

# --- R6: logged in /?layout=specs keeps all Set B / member-price checks ------
P="$(page specs_member)"
check "R6: /?layout=specs logged in status 200" status_is "$P" 200
for n in "${ALL_NAMES_IN_ORDER[@]}"; do check "R6: /?layout=specs logged in contains '$n'" has "$P" "$n"; done
for p in "${MEMBER_PRICES[@]}"; do check "R6: /?layout=specs logged in contains member price $p" has "$P" "$p"; done
for p in "${PUBLIC_EVERYDAY[@]}" "${AUTH_EVERYDAY[@]}"; do check "R6: /?layout=specs logged in lacks everyday price $p" lacks "$P" "$p"; done

# --- R6: logged out /?layout=specs still has no Set B and no member prices ---
P="$(page specs)"
for n in "${AUTH_NAMES[@]}"; do check "R6: /?layout=specs logged out lacks authenticated name '$n'" lacks "$P" "$n"; done
for p in "${MEMBER_PRICES[@]}"; do check "R6: /?layout=specs logged out lacks member price $p" lacks "$P" "$p"; done
for p in "${PUBLIC_EVERYDAY[@]}"; do check "R6: /?layout=specs logged out contains everyday price $p" has "$P" "$p"; done

# --- Summary ----------------------------------------------------------------
echo
echo "verify-ssr: $PASS_COUNT passed, $FAIL_COUNT failed"
if [ "$FAIL_COUNT" -ne 0 ]; then
  echo "verify-ssr: FAIL"
  exit 1
fi
echo "verify-ssr: PASS"
