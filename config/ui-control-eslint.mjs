import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const policy = JSON.parse(fs.readFileSync(new URL("./ui-control-policy.json", import.meta.url), "utf8"));
const visible = new Set(["button", "input", "select", "textarea", "details", "summary"]);
const owners = (category, file) => (policy.allowedOwners[category] || []).some(owner =>
  owner === file || (owner.endsWith("/") && file.startsWith(owner)));
function approved(category, file, text) {
  const normalized = text.trim().replace(/\s+/g, " ");
  const id = crypto.createHash("sha256").update(`${category}\0${file}\0${normalized}`).digest("hex").slice(0, 16);
  return policy.baseline.some(item => item.id === id && item.file === file && item.category === category &&
    ["content", "native", "layout"].includes(item.classification) && item.reason?.trim());
}
export default {
  rules: {
    "public-controls": {
      meta: { type: "problem", docs: { description: "业务控件接入公共原语；仅允许具体源码签名例外" }, schema: [],
        messages: { raw: "可见原生 {{tag}} 请使用公共控件；确需例外时登记具体签名及原因。", vendor: "供应商控件依赖 {{name}} 请通过公共适配器。" } },
      create(context) {
        const file = path.relative(context.cwd, context.filename).split(path.sep).join("/");
        const source = context.sourceCode;
        function check(category, node, messageId, data) {
          if (owners(category, file) || approved(category, file, source.getText(node))) return;
          context.report({ node, messageId, data });
        }
        return {
          JSXOpeningElement(node) {
            if (node.name.type !== "JSXIdentifier" || !visible.has(node.name.name)) return;
            check("raw", node, "raw", { tag: node.name.name });
          },
          ImportDeclaration(node) {
            const name = String(node.source.value);
            if (node.importKind === "type" || (node.specifiers.length && node.specifiers.every(item => item.importKind === "type"))) return;
            if (policy.vendorPackages.some(prefix => name.startsWith(prefix))) check("vendor", node, "vendor", { name });
          },
        };
      },
    },
  },
};
