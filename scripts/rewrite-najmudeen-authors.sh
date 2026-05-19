#!/bin/bash
set -e
cd "$(dirname "$0")/.."
export FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch -f --env-filter '
if test "$GIT_AUTHOR_EMAIL" = "njdeennisma@gmail.com"
then
  export GIT_AUTHOR_NAME="MNS Baanu"
  export GIT_AUTHOR_EMAIL="sbaanukghsbio21@gmail.com"
  export GIT_COMMITTER_NAME="MNS Baanu"
  export GIT_COMMITTER_EMAIL="sbaanukghsbio21@gmail.com"
fi
' -- Baanu main refs/remotes/origin/Irfa

echo "--- Remaining Najmudeen commits (should be empty) ---"
git log Baanu main refs/remotes/origin/Irfa --format="%h %an %ae %s" | grep -i najmudeen || echo "None found."
