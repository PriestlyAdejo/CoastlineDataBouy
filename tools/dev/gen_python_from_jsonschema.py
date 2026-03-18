from __future__ import annotations

import os
import subprocess
from pathlib import Path


def main() -> int:
    """
    Generate Pydantic models from JSON Schemas.

    Requires: datamodel-code-generator installed in the environment.
    Usage: python tools/dev/gen_python_from_jsonschema.py
    """

    root = Path(__file__).resolve().parents[2]
    schema_dir = root / "schemas" / "jsonschema" / "v1"
    out_dir = root / "schemas" / "python" / "v1"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Generate one module per schema (excluding private/common/index).
    for schema_path in sorted(schema_dir.glob("*.json")):
        if schema_path.name.startswith("_") or schema_path.name == "index.json":
            continue
        out_path = out_dir / f"{schema_path.stem}.py"

        cmd = [
            "datamodel-codegen",
            "--input",
            str(schema_path),
            "--input-file-type",
            "jsonschema",
            "--output",
            str(out_path),
            "--output-model-type",
            "pydantic_v2.BaseModel",
            "--use-title-as-name",
            "--use-schema-description",
            "--use-field-description",
        ]
        env = os.environ.copy()
        subprocess.check_call(cmd, cwd=str(root), env=env)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

