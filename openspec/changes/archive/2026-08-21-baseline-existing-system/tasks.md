## 1. Review

- [ ] 1.1 Read through all 16 spec files in `specs/` and confirm each requirement matches actual current system behavior; verify with `openspec validate baseline-existing-system --strict`
- [ ] 1.2 Spot-check a sample of requirements against the live code/DB (e.g. `contacts.result` enum, `ON DELETE RESTRICT` on `category_id`, `requireElevated` on product/category edit routes) and confirm no drift

## 2. Publish

- [ ] 2.1 Archive this change with `openspec archive baseline-existing-system` and verify all 16 spec files now exist under `openspec/specs/`
- [ ] 2.2 Confirm `openspec spec list` shows all 16 capabilities as main specs after archive
