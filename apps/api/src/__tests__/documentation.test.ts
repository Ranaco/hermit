import fs from "fs";
import path from "path";

describe("Documentation", () => {
  const rootDir = path.resolve(__dirname, "../../../../../");
  
  test("SYSTEM_OVERVIEW.md exists in repository root", () => {
    const filePath = path.join(rootDir, "SYSTEM_OVERVIEW.md");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("SYSTEM_OVERVIEW.md contains required sections", () => {
    const filePath = path.join(rootDir, "SYSTEM_OVERVIEW.md");
    const content = fs.readFileSync(filePath, "utf8");
    
    expect(content).toContain("# Hermit KMS - System Overview");
    expect(content).toContain("## 🏛️ System Architecture");
    expect(content).toContain("## 🔒 Security Architecture");
    expect(content).toContain("## 🔄 Data Flow");
    expect(content).toContain("## 🚀 Deployment & Infrastructure");
    expect(content).toContain("## 🛠️ Operational Procedures");
    expect(content).toContain("```mermaid");
  });

  test("README.md links to SYSTEM_OVERVIEW.md", () => {
    const filePath = path.join(rootDir, "README.md");
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain("[System Overview](./SYSTEM_OVERVIEW.md)");
  });
});
