# Monorepo cutover

The product site and Cloudflare Worker use separate Actions workflows and can deploy independently. Both Git histories are part of this branch. Use a merge commit or a fast-forward to retain that history when landing the migration.

## Before merging

- Bring in any changes published to either original default branch after the import, including Weblate commits. Keep the website's `github-pages` environment and custom domain on this repository.
- Check the destination repo's branch rules against the new workflow names and path filters. GitHub can leave required checks pending when a workflow skips a PR by path.
- Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to the destination repo. Leave `COMMUNITY_DEPLOY_ENABLED` unset until the Worker cutover.
- Keep the original `Blockworked/Blockwork-community` repository publicly readable and keep `master` serving its root `index.json` and `packs/` files. Older Blockwork releases read those URLs. The imported copy is the source for future changes. If a pack update also needs to reach old clients, publish the index and referenced packs together to the original paths, with the same bytes and hashes.

## Weblate

Pause pushes from the two website components and commit any pending translations before moving their files. After the merge, update the existing components in place so their slugs, state, and translator permissions are retained.

| Component | Repository | File mask | New translation base |
| --- | --- | --- | --- |
| `blockworked/website` | `https://github.com/Blockworked/blockworked.com.git` | `apps/website/locales/*.po` | `apps/website/locales/website.pot` |
| `blockworked/community` | `weblate://blockworked/website` | `apps/community/locales/*.po` | `apps/community/locales/community.pot` |

Both use `master`. Verify the shared repository can push or open translation PRs, that the destination repo's push webhook reaches Weblate, and that both components detect their templates before resuming translation pushes.

## Cloudflare Worker

Disable the old repo's Worker deploy workflow once its final run is complete. Set `COMMUNITY_DEPLOY_ENABLED` to `true` in the destination repo, then run **Community deploy** on `master`. It uses the existing Worker, D1 database, bindings, and custom domains. A manual run also reseeds the starter packs, as in the original workflow.

After both deployments, verify the asset bundle under `blockworked.com/packview/` and a pack's source preview on the community site. Check the live library index and at least one pack from the original repo against its recorded hash. Confirm sign-in, the support site, and the translation site on their current domains.

If the Worker cutover fails, clear `COMMUNITY_DEPLOY_ENABLED` before restoring the old deploy workflow. Any already-applied D1 migrations and pack changes need to be accounted for before redeploying an older revision.

Consolidate the shared navigation, theme, and scripts after the move is verified.
