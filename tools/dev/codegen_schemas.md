# Schema code generation (v1)

We keep `schemas/jsonschema/v1/*.json` as the source of truth.

Recommended generators (not yet wired in CI on this project machine):

## TypeScript

- `json-schema-to-typescript` to generate `.d.ts` or `.ts` files.

## Python

- `datamodel-code-generator` to generate Pydantic models.

## Validation

- `check-jsonschema` to validate schema correctness.

When we wire this up, we will generate:

- `schemas/typescript/v1/*.ts`
- `schemas/python/v1/*.py`

