# Making the test gate block merges

`.github/workflows/ci.yml` makes the suite **run** on every pull request. It
cannot make it **required** — a workflow cannot grant itself the power to block
a merge, or every fork PR could switch its own gate off. Requiring it is a
repository setting, and someone with admin rights has to turn it on once.

Until that is done, a red CI run shows on the PR and nothing stops you merging
anyway.

## The check to require

```
verify / Build & test
```

That is `<caller job id> / <called job name>`: the `verify` job in `ci.yml`
calls the `build` job in `build-test.yml`, which is named `Build & test`.

Easiest way to get it exactly right: open a PR first, let CI run once, then pick
the check from the search box in the UI — it lists checks that have reported
recently, so there is nothing to type.

## Setup (UI)

**Settings → Rules → Rulesets → New branch ruleset**

1. Name it something like `main protection`, set **Enforcement status** to
   **Active**.
2. **Target branches** → *Include default branch*.
3. Enable **Require a pull request before merging**.
4. Enable **Require status checks to pass**, then add `verify / Build & test`.
5. Enable **Require branches to be up to date before merging**.

Step 5 is the one worth arguing for. Without it, two PRs that are individually
green can merge in sequence and leave main broken, because neither was ever
tested against the other's changes. With it, a PR whose base has moved must
re-run against the new base before it can merge. On a repo this size the cost is
one extra CI run; the benefit is that "main is green" stays true.

The older **Settings → Branches → Add branch protection rule** screen offers the
same options and works fine. Rulesets are simply where GitHub is putting this
now.

## Setup (CLI)

Needs the `gh` CLI (`winget install GitHub.cli`, then `gh auth login`) and admin
on the repo:

```bash
gh api -X PUT repos/petoattilapeter98-stack/EIC-Totempole/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["verify / Build & test"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null
}
JSON
```

`"strict": true` is the "require branches to be up to date" setting above.

Set `"enforce_admins": true` if the rule should apply to admins as well. Leave it
false if you need a way to push a fix to main when CI itself is broken — a real
consideration on a repo where the deploy pipeline and the gate share a workflow
file.

## Checking it worked

```bash
gh api repos/petoattilapeter98-stack/EIC-Totempole/branches/main/protection \
  --jq '.required_status_checks.contexts'
```

Or just open a PR with a deliberately failing test and confirm the merge button
is disabled.
