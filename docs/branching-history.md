# Branching history

Schema version 2 keeps sketch keys and file paths unchanged. Each entry has
`parentId` (null for a root), a stable sibling `order`, and `nextOrder`, the
allocation counter for its children. `nextRootOrder` allocates root positions.
Preserve counters when deleting entries; gaps and deleted numbers are not reused.
When deleting a parent manually, reparent or remove its children explicitly.

`sketch-kit create newName` creates a root. Calling create with an existing ID
prompts to copy or replace. Choosing copy then asks for the new sketch name,
with the next available generated ID as its default. Press Enter to accept it,
or enter a different valid, unused ID. This changes the ID and filenames; it is
not the optional display label. Invalid names and collisions keep the prompt open.
`sketch-kit create source destination` skips these prompts and copies directly
to an unused destination and records source as its parent. Custom destination
names remain branches; their spelling no longer determines ancestry.

Automatic copies retain familiar names such as motion_10, but ancestry comes
only from parentId. Labels may be edited independently with the optional `label`
field. IDs must remain valid JavaScript identifiers and should not be renamed
without also updating their files and references.

## Existing workspaces

Legacy configs are migrated on the next successful create/copy/replace operation.
Unambiguous numeric suffixes preserve their sibling numbers. Multi-digit suffixes
and conflicting legacy children require explicit parentId values before the CLI
writes anything. Add parentId to the flagged legacy entries (null for roots),
leave schemaVersion absent, and retry; the tool fills remaining metadata.
Malformed JSON, missing parents and cycles are errors, not fallback migrations.

Newly initialized workspaces derive their menu tree from parentId. Saved configs
also include generated children arrays temporarily so older workspace menus keep
working without overwriting customized runtime files. Those arrays are a legacy
projection, discarded when loading version 2, and must not be edited as ancestry.

Creates and copies check both registry and disk for collisions, including case
differences. A workspace lock serializes CLI mutations. Files are staged and
ordinary write failures restore the old registry and stylesheet. This is not
crash-proof storage: after a killed process, inspect retained stage directories
and remove the stale .sketch-kit-create.lock before retrying. Rollback failures
retain recovery files and report their location.

Run `npm run test:registry` for the isolated Node test suite.
