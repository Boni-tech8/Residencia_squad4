const INTERACTIVE_ROLES = new Set(["button", "link", "checkbox", "radio", "textbox", "switch", "combobox", "menuitem", "tab"]);
const DECORATIVE_ROLES = new Set(["presentation", "none", "decorative"]);

function flattenNodes(nodes, output = []) {
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    output.push(node);
    if (Array.isArray(node.children)) flattenNodes(node.children, output);
  }
  return output;
}

function analyzeNodes(nodes) {
  const issues = [];
  const allNodes = flattenNodes(nodes);

  for (const n of allNodes) {
    const type = String(n.type || "").toUpperCase();
    const name = String(n.name || "Sem nome");
    const id = n.id ?? null;
    const role = String(n.role || "").toLowerCase();
    const control = ["BUTTON", "INSTANCE", "COMPONENT", "COMPONENT_SET"].includes(type)
      || n.isInteractive === true
      || INTERACTIVE_ROLES.has(role);
    const image = type === "IMAGE" || n.isImage === true || role === "img";

    if (control && !n.accessibleName && !n.ariaLabel) {
      issues.push({
        code: "V-02", severity: "high", nodeId: id, nodeName: name,
        message: "Controle sem nome acessível identificado.",
        suggestion: "Defina um nome acessível claro e descritivo."
      });
    }
    if (image && !n.altText && !DECORATIVE_ROLES.has(role)) {
      issues.push({
        code: "V-03", severity: "medium", nodeId: id, nodeName: name,
        message: "Imagem sem texto alternativo.",
        suggestion: "Informe um texto alternativo ou marque a imagem como decorativa quando aplicável."
      });
    }
    if (typeof n.contrastRatio === "number" && n.contrastRatio < 4.5) {
      issues.push({
        code: "V-01", severity: "high", nodeId: id, nodeName: name,
        message: `Contraste insuficiente (${n.contrastRatio.toFixed(2)}:1).`,
        suggestion: "Ajuste as cores para atingir pelo menos 4.5:1 para texto normal."
      });
    }
  }

  return {
    issues,
    summary: {
      totalNodes: allNodes.length,
      totalIssues: issues.length,
      high: issues.filter(i => i.severity === "high").length,
      medium: issues.filter(i => i.severity === "medium").length,
      low: issues.filter(i => i.severity === "low").length
    }
  };
}

export { analyzeNodes };
