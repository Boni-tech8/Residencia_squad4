function issue(x){return x;}
export function analyzeNodes(nodes){
 const issues=[];
 for(const n of nodes){
  const type=String(n.type||"").toUpperCase(), name=String(n.name||"Sem nome"), id=n.id??null;
  const control=["BUTTON","INSTANCE","COMPONENT","COMPONENT_SET"].includes(type)||n.isInteractive===true;
  if(control&&!n.accessibleName&&!n.ariaLabel)issues.push(issue({code:"V-02",severity:"high",nodeId:id,nodeName:name,message:"Controle sem nome acessível identificado.",suggestion:"Defina um nome acessível claro e descritivo."}));
  if((type==="IMAGE"||n.isImage===true)&&!n.altText)issues.push(issue({code:"V-03",severity:"medium",nodeId:id,nodeName:name,message:"Imagem sem texto alternativo.",suggestion:"Informe um texto alternativo ou marque a imagem como decorativa quando aplicável."}));
  if(typeof n.contrastRatio==="number"&&n.contrastRatio<4.5)issues.push(issue({code:"V-01",severity:"high",nodeId:id,nodeName:name,message:`Contraste insuficiente (${n.contrastRatio.toFixed(2)}:1).`,suggestion:"Ajuste as cores para atingir pelo menos 4.5:1 para texto normal."}));
 }
 return {issues,summary:{totalNodes:nodes.length,totalIssues:issues.length,high:issues.filter(i=>i.severity==="high").length,medium:issues.filter(i=>i.severity==="medium").length,low:issues.filter(i=>i.severity==="low").length}};
}