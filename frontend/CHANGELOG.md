# Changelog

## Unreleased
### Added
- `DatePicker` prop `keepOpenUntilSelect` to prevent premature closing when user types a valid date.
- Guardian live search: dropdown refreshes instantly on character deletion and remains open while typing.
- New tests: `DatePicker.keepOpenUntilSelect` behavior and guardian search deletion scenario.
- Employee management page: list, create/edit modal, soft archive & restore, validation, optimistic updates.
- Employee API client (`employeeApi.ts`) & unit tests for archive/restore + validation.

### Changed
- Student validation refactored to avoid calling `.pick()` on refined Zod schema (fixes runtime error) using a raw object schema + manual DOB age validation.
- Unified toast usage via `toast.show(message, type)` across new Employee UI.

### Removed
- Temporary debug panel and trace instrumentation from Students modal.

### Build
- Current production bundle (vite): main JS ~343 kB (97 kB gzip), CSS ~26 kB (6.6 kB gzip).

