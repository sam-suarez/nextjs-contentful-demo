#!/usr/bin/env bash
# SSR checks for the catalog (P03: R7, R13, R15-R23). Later phases extend this file.
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

# fetch_page NAME PATH [COOKIE]: body to $WORK/NAME.html, status to $WORK/NAME.html.status
FETCHED=""
fetch_page() {
  local name="$1" path="$2" cookie="${3:-}"
  local out="$WORK/$name.html"
  local code
  if [ -n "$cookie" ]; then
    code="$(curl -s --max-time 60 -o "$out" -w '%{http_code}' -H "Cookie: $cookie" "$BASE$path" || echo 000)"
  else
    code="$(curl -s --max-time 60 -o "$out" -w '%{http_code}' "$BASE$path" || echo 000)"
  fi
  [ -f "$out" ] || : >"$out"
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
check "R16: GET / (valid session) status 200" status_is "$P" 200
for n in "${ALL_NAMES_IN_ORDER[@]}"; do check "R16: logged in contains '$n'" has "$P" "$n"; done
check "R16: first occurrences of the 12 names are in name order (Set B mixed in)" in_order "$P" "${ALL_NAMES_IN_ORDER[@]}"
check "R16: '>Member price<' occurs exactly 12 times" count_is "$P" ">Member price<" 12
check "R16: '>Everyday price<' occurs 0 times" count_is "$P" ">Everyday price<" 0
for p in "${MEMBER_PRICES[@]}"; do check "R16: logged in contains member price $p" has "$P" "$p"; done
for p in "${PUBLIC_EVERYDAY[@]}" "${AUTH_EVERYDAY[@]}"; do check "R16: logged in lacks everyday price $p" lacks "$P" "$p"; done
check "R16: '>Members only<' occurs exactly 4 times" count_is "$P" ">Members only<" 4
check "R16: member banner sentence present" has "$P" "Member prices are on. You&#x27;re also seeing 4 members-only toys."
check "R16: contains '>Member pricing<'" has "$P" ">Member pricing<"
check "R16: contains 'Signed in as'" has "$P" "Signed in as"
check "R16: contains '>ssr-checker<'" has "$P" ">ssr-checker<"
check "R16: contains '>Sign out<'" has "$P" ">Sign out<"
check "R16: contains \$ACTION_ID_ (server-action sign-out form)" has "$P" '$ACTION_ID_'
check "R16: no href=\"/login\"" lacks "$P" 'href="/login"'
check "R16: no logged-out banner" lacks "$P" "You&#x27;re seeing everyday prices"
check "R16: contains '>12 toys<'" has "$P" ">12 toys<"
check "R16: '<article' occurs exactly 12 times" count_is "$P" "<article" 12

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

for name in $FETCHED; do
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

# --- Summary ----------------------------------------------------------------
echo
echo "verify-ssr: $PASS_COUNT passed, $FAIL_COUNT failed"
if [ "$FAIL_COUNT" -ne 0 ]; then
  echo "verify-ssr: FAIL"
  exit 1
fi
echo "verify-ssr: PASS"
