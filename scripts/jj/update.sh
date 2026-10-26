#!/bin/zsh
# Rate newly transcribed episodes with Jev and commit the data file to the site (goes live with the nightly deploy).
cd "${0:A:h}/.."
set -a; source /Applications/apps/matthew-miller-personal-site/.env; set +a
python3 -I scripts/jev.py && python3 -I scripts/build_data.py || exit 1
cd /Applications/apps/matthew-miller-personal-site
git diff --quiet -- src/data/jj/podcast.json && exit 0
git add src/data/jj/podcast.json
git commit -q -m "JJ podcast: rate newly transcribed episodes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/data/jj/podcast.json
git pull --rebase -q && git -c credential.helper= -c "credential.helper=!gh auth git-credential" push -q https://github.com/Matthewjmiller07/matthew-miller-personal-site.git main
