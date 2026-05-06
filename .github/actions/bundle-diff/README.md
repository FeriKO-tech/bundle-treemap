# bundle-diff GitHub Action

Composite action that posts a bundle-size diff comment on pull requests using
two `bundle-treemap` reports. The same action runs on every PR build and
updates the existing comment in place via a hidden marker, so the PR thread
doesn't fill up with stale reports.

## Inputs

| Name             | Required | Description                                                                 |
|------------------|:--------:|-----------------------------------------------------------------------------|
| `current`        |    yes   | Path to the bundle-treemap report JSON for the current PR head.            |
| `base`           |    no    | Path to the baseline report. If omitted, no comment is posted.             |
| `github-token`   |    yes   | Token used to comment. Pass `${{ secrets.GITHUB_TOKEN }}`.                 |
| `comment-marker` |    no    | HTML marker used to find the existing comment. Default: `<!-- bundle-treemap-diff -->`. |
| `warn-bytes`     |    no    | Total delta in bytes that flips the comment to a warning emoji. Default: `10240`. |

## Outputs

- `delta-bytes` - total `after - before` delta in bytes.
- `comment-id`  - the GitHub comment id (created or updated).

## Example workflow

```yaml
name: Bundle size

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build

      # Generate report for the current PR head.
      - run: npx bundle-treemap dist/ --out current.json

      # Fetch the baseline report from the main branch (downloaded via cache,
      # release artifacts, or any storage you prefer).
      - uses: actions/download-artifact@v4
        with:
          name: bundle-report-main
          path: ./baseline
        continue-on-error: true

      - uses: ./.github/actions/bundle-diff
        with:
          current: current.json
          base: baseline/bundle-report.json
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Notes

- The action requires Node 20+ on the runner (it uses native `fetch`).
- If the `base` file does not exist (e.g. first run on a new branch), the
  action exits cleanly without commenting.
- The PR comment is keyed by `comment-marker`. Change the marker per workflow
  if you want multiple bundle-diff comments on the same PR (e.g. one per
  `client.json` / `nodejs.json`).
