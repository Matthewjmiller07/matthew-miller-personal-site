#!/usr/bin/env python3
"""Undo "stale tree" commits on main.

A pipeline that commits from an out-of-date checkout (e.g. the daily 929 audio push on
11 October 2026, 4da3b63) adds its one new file but also sets every other file it touched
back to an old version, silently reverting days of work. This finds such commits and
restores what they reverted, keeping their genuinely new content.

A path in a commit counts as reverted when the commit
  - sets it to a blob the path already had earlier in history (an old version), or
  - deletes it although it was added in the last RECENT_DAYS days (it didn't exist yet in
    the stale checkout).
New files and new content are never touched. A commit is only treated as stale when it
reverts at least MIN_REVERTED paths, so a deliberate one-file rollback is left alone, and
commits whose message says "Revert" or "[allow-revert]" are skipped, as are merges.

Usage: stale_tree_guard.py <before-sha> <after-sha> [--apply]
Without --apply it only reports. With --apply it restores the reverted paths in the working
tree (only where HEAD still has the stale version) and stages them; the caller commits.
"""
import subprocess, sys, time

MIN_REVERTED = 3
RECENT_DAYS = 21


def git(*args, check=True):
    r = subprocess.run(['git', *args], capture_output=True, text=True)
    if check and r.returncode:
        raise SystemExit(f'git {" ".join(args)} failed: {r.stderr.strip()}')
    return r.stdout


def blob(rev, path):
    out = git('rev-parse', '--verify', '--quiet', f'{rev}:{path}', check=False).strip()
    return out or None


def past_blobs(parent, path):
    """Every blob this path has had in the parent's history."""
    out = git('log', '--format=', '--raw', '--no-abbrev', '--no-renames', parent, '--', path)
    seen = set()
    for line in out.splitlines():
        parts = line.split()
        if len(parts) >= 4 and line.startswith(':'):
            seen.update(p for p in parts[2:4] if set(p) != {'0'})
    return seen


def added_at(parent, path):
    """Unix time the path was (last) added in the parent's history, or None."""
    out = git('log', '--format=%ct', '--diff-filter=A', '-1', parent, '--', path).strip()
    return int(out) if out else None


def reverted_paths(commit):
    parents = git('rev-list', '--parents', '-n', '1', commit).split()[1:]
    if len(parents) != 1:
        return []                                     # root or merge commit
    msg = git('log', '-1', '--format=%B', commit)
    if 'revert' in msg.lower() or '[allow-revert]' in msg.lower():
        return []
    parent = parents[0]
    now = time.time()
    hits = []
    for line in git('diff', '--name-status', '--no-renames', parent, commit).splitlines():
        status, path = line.split('\t', 1)
        if status == 'M':
            new = blob(commit, path)
            if new in past_blobs(parent, path) and new != blob(parent, path):
                hits.append((path, 'set back to an older version'))
        elif status == 'D':
            t = added_at(parent, path)
            if t and now - t < RECENT_DAYS * 86400:
                hits.append((path, 'deleted though added recently'))
    return [(commit, parent, p, why) for p, why in hits] if len(hits) >= MIN_REVERTED else []


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    apply = '--apply' in sys.argv
    before, after = args
    if set(before) == {'0'}:
        commits = [after]
    else:
        commits = git('rev-list', '--reverse', f'{before}..{after}').split()
    found = []
    for c in commits:
        hits = reverted_paths(c)
        if hits:
            subj = git('log', '-1', '--format=%h %s', c).strip()
            print(f'STALE TREE: {subj} reverted {len(hits)} paths')
            for _, _, p, why in hits:
                print(f'  {p}  ({why})')
            found += hits
    if not found:
        print('No stale-tree commits.')
        return
    restored = []
    for commit, parent, path, _ in found:
        # only restore where HEAD still holds exactly what the stale commit left
        if blob('HEAD', path) != blob(commit, path):
            print(f'  skip {path}: changed again since')
            continue
        if apply:
            git('checkout', parent, '--', path)
        restored.append(path)
    print(f'{"Restored" if apply else "Would restore"} {len(restored)} paths.')
    if apply and restored:
        git('add', '--', *restored)


if __name__ == '__main__':
    main()
