#!/usr/bin/env bash
# session-start-scan.sh <workspace-root> — the Session Start Protocol step 2 scan,
# moved verbatim out of SKILL.md. Reads frontmatter only; appends ONE line to
# skill-observations/checkpoints.log (its purpose). bash, not sh.
root="${1:-${TASK_OBSERVER_WORKSPACE:-}}"
case $root in (/*|[A-Za-z]:*) ;; (*) echo "usage: session-start-scan.sh <ABSOLUTE workspace root>" >&2; exit 1 ;; esac
d="$root/skill-observations/observation-log"   # the pinned workspace path — re-derive in EVERY call, never relative to the cwd; run under bash, not sh
n=$(find "$root/skill-observations/observation-log" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')  # literal path: independent of $d
parsed=$(find "$d" -maxdepth 1 -name '*.md' -exec awk 'FNR==1 {if (/^---[[:space:]]*$/) print FILENAME; nextfile}' {} + | wc -l | tr -d ' ')
sus='FNR==1 {fm = (/^---[[:space:]]*$/ ? 1 : 0); if (!fm) nextfile; next}
  fm && /^---[[:space:]]*$/ {fm=0; nextfile}
  fm && /^[a-z_]+:[ ]+([&!][^[:space:]]*[[:space:]]+)*[^"\047[{|>#&![:space:]].*: / {print FILENAME; nextfile}
  fm && /^[a-z_]+:[ ]+([&!][^[:space:]]*[[:space:]]+)*("([^"\\]|\\.)*"[[:space:]]*[^[:space:]#]|\047([^\047]|\047\047)*\047([[:space:]]+[^[:space:]#]|[^[:space:]#\047]))/ {print FILENAME; nextfile}
  fm && /^[a-z_]+:[ ]+([&!][^[:space:]]*[[:space:]]+)*[`@%]/ {print FILENAME; nextfile}
  fm && /^[a-z_]+:[ ]+([&!][^[:space:]]*[[:space:]]+)*"([^"\\]|(\\[0abtnvfre \t\r"\/\\N_LP]|\\x[[:xdigit:]][[:xdigit:]]|\\u[[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]]|\\U[[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]]))*\\([^0abtnvfre \t\r"\/\\N_LPxuU]|x([^[:xdigit:]]|[[:xdigit:]][^[:xdigit:]])|u([^[:xdigit:]]|[[:xdigit:]][^[:xdigit:]]|[[:xdigit:]][[:xdigit:]][^[:xdigit:]]|[[:xdigit:]][[:xdigit:]][[:xdigit:]][^[:xdigit:]])|U([^[:xdigit:]]|[[:xdigit:]][^[:xdigit:]]|[[:xdigit:]][[:xdigit:]][^[:xdigit:]]|[[:xdigit:]][[:xdigit:]][[:xdigit:]][^[:xdigit:]]|[[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][^[:xdigit:]]|[[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][^[:xdigit:]]|[[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][^[:xdigit:]]|[[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][[:xdigit:]][^[:xdigit:]]))/ {print FILENAME; nextfile}
  fm && /^[a-z_]+:[ ]+\[/ {v=$0; sub(/^[a-z_]+:[ ]+/,"",v); gsub(/"([^"\\]|\\.)*"/,"",v); gsub(/\047[^\047]*\047/,"",v); sub(/[[:space:]]#.*/,"",v); if (v ~ /:/) {print FILENAME; nextfile}}'   # no literal {} in the program: find -exec … {} + would replace it
suspect=$(find "$d" -maxdepth 1 -name '*.md' -exec awk "$sus" {} + | wc -l | tr -d ' ')   # invalid YAML by shape: unquoted ": ", text after a closing quote, a value opening with ` @ %, an undefined escape, a colon in an unquoted list entry
a_sus=0; [ -d "$d/archive" ] && a_sus=$(find "$d/archive" -maxdepth 1 -name '*.md' -exec awk "$sus" {} + | wc -l | tr -d ' ')   # archive/ may not exist yet
if [ "$n" -gt 0 ] && [ "$parsed" -eq 0 ]; then
  echo "SCAN COMMAND BROKEN — $n files present, 0 headers parsed"; exit 1
fi
[ "$suspect" -gt 0 ] || [ "$a_sus" -gt 0 ] && echo "NOTE: $suspect of $n headers (and $a_sus in archive/) look like invalid YAML (an unquoted ': ', text after a closing quote, a value opening with a backtick, @ or %, an undefined escape, a colon in an unquoted list entry) — quote or fix them (File format)"
printf 'files: %s  parsed: %s  suspect (awk, a floor): %s  archive-suspect: %s\n' "$n" "$parsed" "$suspect" "$a_sus"
printf '%s [%s] session-start scan: files=%s parsed=%s\n' "$(date '+%F %H:%M')" "${PWD##*/}" "$n" "$parsed" \
  >> "$root/skill-observations/checkpoints.log"   # date+time+source: one line per session, not per day
find "$(dirname "$root")" -maxdepth 3 -type d -path '*/skill-observations/observation-log' 2>/dev/null | LC_ALL=C sort | while IFS= read -r o; do printf '%s=%s\n' "${o%/skill-observations/observation-log}" "$(find "$o" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')"; done | awk '{s = s "  " $0} END {print "logs under the parent (report; never consolidate from here):" s}'
# LAST: content print, the only half a classifier can refuse; one awk for the whole set.
# Compact by default: one line per observation that is not resolved: file | status | skill | proposes | title.
# SCAN_FULL=1 prints every header in full, as upstream does.
if [ "${SCAN_FULL:-0}" = 1 ]; then
( LC_ALL=C; [ "$n" -eq 0 ] || { cd "$d" && awk 'FNR==1 && NR>1 && fm {print "---"}
    FNR==1 {fm=/^---[[:space:]]*$/; if (!fm) {print "---"; nextfile}; next}
    fm && /^---[[:space:]]*$/ {fm=0; print "---"; nextfile}
    fm
    END {if (fm) print "---"}' *.md; } )
else
( LC_ALL=C; [ "$n" -eq 0 ] || { cd "$d" && awk 'function out() {if (st !~ /^(actioned|declined|superseded)$/) printf "%s | %s | %s | %s | %s\n", FILENAME, (st == "" ? "open?" : st), sk, ps, t}
    FNR==1 {st=""; sk=""; ps=""; t=""; fm=/^---[[:space:]]*$/; if (!fm) {st="no-header"; out(); nextfile}; next}
    fm && /^---[[:space:]]*$/ {fm=0; out(); nextfile}
    fm && /^status:/ {st=$2}
    fm && /^skill:/ {sk=$0; sub(/^skill:[ ]*/, "", sk)}
    fm && /^proposes_skill:/ {ps=$0; sub(/^proposes_skill:[ ]*/, "", ps)}
    fm && /^title:/ {t=$0; sub(/^title:[ ]*/, "", t); if (length(t) > 160) t = substr(t, 1, 157) "..."}' *.md; } )
fi
