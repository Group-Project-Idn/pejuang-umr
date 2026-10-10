import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const webPackageJsonUrl = new URL(
  "../../../apps/web/package.json",
  import.meta.url,
);

function readWebPackageJson(): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} {
  return JSON.parse(readFileSync(fileURLToPath(webPackageJsonUrl), "utf8"));
}

describe("batas antar workspace", () => {
  it("apps/web tidak bergantung pada @pejuang/engine", () => {
    const webPackage = readWebPackageJson();
    expect(webPackage.dependencies?.["@pejuang/engine"]).toBeUndefined();
    expect(webPackage.devDependencies?.["@pejuang/engine"]).toBeUndefined();
  });
});
