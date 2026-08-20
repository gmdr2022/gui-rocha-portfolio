export const workMapVisualTargets = {
  "clubal-suite": {
    accentRgb: "37 201 151",
    effect: "screen",
    focus: [1040, 262],
    shapes: [
      { kind: "polygon", points: "430,18 1229,40 1229,463 427,466" },
      { kind: "polygon", points: "1240,36 1475,27 1477,474 1242,462" },
      { kind: "rect", x: 610, y: 399, width: 141, height: 321, rx: 16 },
    ],
  },
  "sites-note": {
    accentRgb: "79 140 255",
    effect: "ink",
    focus: [978, 814],
    shapes: [
      { kind: "ellipse", cx: 978, cy: 814, rx: 58, ry: 34 },
    ],
    orbitShapes: [
      { kind: "ellipse", cx: 978, cy: 812, rx: 44, ry: 25 },
    ],
  },
  "tooling-cluster": {
    accentRgb: "142 125 255",
    effect: "ink",
    focus: [1187, 735],
    shapes: [
      { kind: "ellipse", cx: 1117, cy: 720, rx: 62, ry: 27 },
      { kind: "ellipse", cx: 1258, cy: 749, rx: 70, ry: 29 },
    ],
    orbitShapes: [
      { kind: "ellipse", cx: 1117, cy: 718, rx: 48, ry: 20 },
      { kind: "ellipse", cx: 1258, cy: 747, rx: 54, ry: 21 },
    ],
  },
  "nexus-note": {
    accentRgb: "142 125 255",
    effect: "ink",
    focus: [1117, 720],
    shapes: [
      { kind: "ellipse", cx: 1117, cy: 720, rx: 62, ry: 27 },
    ],
    orbitShapes: [
      { kind: "ellipse", cx: 1117, cy: 718, rx: 48, ry: 20 },
    ],
  },
  "codex-note": {
    accentRgb: "45 212 191",
    effect: "ink",
    focus: [1258, 749],
    shapes: [
      { kind: "ellipse", cx: 1258, cy: 749, rx: 70, ry: 29 },
    ],
    orbitShapes: [
      { kind: "ellipse", cx: 1258, cy: 747, rx: 54, ry: 21 },
    ],
  },
  "engineering-notebooks": {
    accentRgb: "242 187 98",
    effect: "paper",
    focus: [820, 826],
    shapes: [
      { kind: "polygon", points: "255,724 832,706 930,941 192,941" },
      { kind: "polygon", points: "893,664 1404,706 1516,941 820,941" },
    ],
  },
  "local-first-notebook": {
    accentRgb: "242 187 98",
    effect: "paper",
    focus: [690, 830],
    shapes: [
      { kind: "polygon", points: "587,720 832,706 930,941 525,941" },
    ],
  },
  "c7-system-map": {
    accentRgb: "166 255 77",
    effect: "ink",
    focus: [1194, 806],
    shapes: [
      { kind: "ellipse", cx: 1136, cy: 792, rx: 92, ry: 37 },
      { kind: "ellipse", cx: 1296, cy: 821, rx: 84, ry: 31 },
    ],
    orbitShapes: [
      { kind: "ellipse", cx: 1136, cy: 792, rx: 82, ry: 31 },
      { kind: "ellipse", cx: 1296, cy: 820, rx: 62, ry: 22 },
    ],
  },
  "maeve-tablet": {
    accentRgb: "239 109 120",
    effect: "screen",
    focus: [1275, 585],
    shapes: [
      { kind: "polygon", points: "1103,447 1491,479 1454,736 1068,681" },
    ],
  },
};

export const workMapStructure = [
  {
    id: "institutional",
    type: "group",
    visualTarget: "clubal-suite",
    accent: "#25c997",
    accentRgb: "37 201 151",
    children: [
      { id: "clubal", type: "project", slug: "clubal", visualTarget: "clubal-suite", children: [] },
    ],
  },
  {
    id: "websites",
    type: "group",
    visualTarget: "sites-note",
    accent: "#4f8cff",
    accentRgb: "79 140 255",
    children: [
      { id: "sites", type: "collection", key: "sites", visualTarget: "sites-note", children: [] },
    ],
  },
  {
    id: "local-tools",
    type: "group",
    visualTarget: "tooling-cluster",
    accent: "#8e7dff",
    accentRgb: "142 125 255",
    children: [
      { id: "nexus", type: "project", slug: "nexus", visualTarget: "nexus-note", children: [] },
      { id: "codex-checkpoint", type: "project", slug: "codex-checkpoint", visualTarget: "codex-note", children: [] },
    ],
  },
  {
    id: "engineering",
    type: "group",
    visualTarget: "engineering-notebooks",
    accent: "#f2bb62",
    accentRgb: "242 187 98",
    children: [
      { id: "local-first-checklist", type: "project", slug: "local-first-checklist", visualTarget: "local-first-notebook", children: [] },
      { id: "c7-engineering-system", type: "project", slug: "c7-engineering-system", visualTarget: "c7-system-map", children: [] },
    ],
  },
  {
    id: "original",
    type: "group",
    visualTarget: "maeve-tablet",
    accent: "#ef6d78",
    accentRgb: "239 109 120",
    children: [
      { id: "maeve", type: "project", slug: "maeve", visualTarget: "maeve-tablet", children: [] },
    ],
  },
];

const nodeReference = (node) => node.type === "project"
  ? node.slug
  : node.type === "collection"
    ? node.key
    : null;

const rgbPattern = /^(?:\d{1,3} ){2}\d{1,3}$/;
const workMapEffectTypes = new Set(["screen", "ink", "paper"]);
const coordinateInRange = (value, maximum) => Number.isFinite(value) && value >= 0 && value <= maximum;

export const validateWorkMapVisualTargets = (targets = workMapVisualTargets) => {
  if (!targets || typeof targets !== "object" || Array.isArray(targets)) throw new Error("Os alvos visuais do mapa precisam ser um objeto.");
  for (const [id, target] of Object.entries(targets)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`ID de alvo visual inválido: ${id}.`);
    if (!rgbPattern.test(target?.accentRgb ?? "") || target.accentRgb.split(" ").some((channel) => Number(channel) > 255)) {
      throw new Error(`Cor RGB inválida no alvo visual ${id}.`);
    }
    if (!workMapEffectTypes.has(target.effect)) throw new Error(`Efeito visual inválido no alvo ${id}: ${String(target.effect)}.`);
    if (!Array.isArray(target.focus) || target.focus.length !== 2 || !coordinateInRange(target.focus[0], 1672) || !coordinateInRange(target.focus[1], 941)) {
      throw new Error(`Foco inválido no alvo visual ${id}.`);
    }
    if (!Array.isArray(target.shapes) || !target.shapes.length) throw new Error(`Alvo visual ${id} precisa de pelo menos uma forma.`);
    for (const shape of target.shapes) {
      if (shape.kind === "rect") {
        if (![shape.x, shape.y, shape.width, shape.height, shape.rx].every(Number.isFinite)
          || !coordinateInRange(shape.x, 1672)
          || !coordinateInRange(shape.y, 941)
          || shape.width <= 0
          || shape.height <= 0
          || shape.x + shape.width > 1672
          || shape.y + shape.height > 941
          || shape.rx < 0) throw new Error(`Retângulo inválido no alvo visual ${id}.`);
      } else if (shape.kind === "ellipse") {
        if (![shape.cx, shape.cy, shape.rx, shape.ry].every(Number.isFinite)
          || shape.rx <= 0
          || shape.ry <= 0
          || shape.cx - shape.rx < 0
          || shape.cx + shape.rx > 1672
          || shape.cy - shape.ry < 0
          || shape.cy + shape.ry > 941) throw new Error(`Elipse inválida no alvo visual ${id}.`);
      } else if (shape.kind === "polygon") {
        const coordinates = String(shape.points ?? "").trim().split(/\s+/).map((pair) => pair.split(",").map(Number));
        if (coordinates.length < 3 || coordinates.some(([x, y]) => !coordinateInRange(x, 1672) || !coordinateInRange(y, 941))) {
          throw new Error(`Polígono inválido no alvo visual ${id}.`);
        }
      } else {
        throw new Error(`Forma desconhecida no alvo visual ${id}: ${String(shape.kind)}.`);
      }
    }
    if (target.effect === "ink") {
      if (!Array.isArray(target.orbitShapes) || !target.orbitShapes.length) {
        throw new Error(`Alvo de tinta ${id} precisa de orbitShapes[].`);
      }
      for (const shape of target.orbitShapes) {
        if (shape.kind !== "ellipse"
          || ![shape.cx, shape.cy, shape.rx, shape.ry].every(Number.isFinite)
          || shape.rx <= 0
          || shape.ry <= 0
          || shape.cx - shape.rx < 0
          || shape.cx + shape.rx > 1672
          || shape.cy - shape.ry < 0
          || shape.cy + shape.ry > 941) throw new Error(`Órbita inválida no alvo visual ${id}.`);
      }
    } else if (target.orbitShapes) {
      throw new Error(`Alvo sem tinta ${id} não pode definir orbitShapes[].`);
    }
  }
  return { ids: Object.keys(targets), count: Object.keys(targets).length };
};

export const resolveWorkMapNodeTitle = (node, { groupLabels, item } = {}) => (
  node?.type === "group" ? groupLabels?.[node.id] : item?.name
);

export const validateWorkMapStructure = (structure, { allowedReferences, allowedVisualTargets } = {}) => {
  if (!Array.isArray(structure) || !structure.length) throw new Error("O mapa de trabalho precisa de pelo menos um grupo.");
  const ids = new Set();
  const references = [];
  let maxDepth = 0;
  let nodeCount = 0;

  const visit = (node, depth, ancestors) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) throw new Error("Cada nó do mapa deve ser um objeto.");
    if (ancestors.has(node)) throw new Error(`Ciclo detectado no mapa em ${node.id || "nó sem ID"}.`);
    if (typeof node.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(node.id)) {
      throw new Error(`ID inválido no mapa: ${String(node.id)}.`);
    }
    if (ids.has(node.id)) throw new Error(`ID duplicado no mapa: ${node.id}.`);
    if (!Array.isArray(node.children)) throw new Error(`Nó ${node.id} não possui children[].`);
    if (!["group", "project", "collection"].includes(node.type)) throw new Error(`Tipo inválido no mapa: ${node.id}:${node.type}.`);
    if (depth === 0 && node.type !== "group") throw new Error(`O nó raiz ${node.id} precisa ser um grupo.`);
    if (allowedVisualTargets) {
      if (typeof node.visualTarget !== "string" || !allowedVisualTargets.has(node.visualTarget)) {
        throw new Error(`Alvo visual inexistente no mapa: ${node.id}:${String(node.visualTarget)}.`);
      }
    }

    const reference = nodeReference(node);
    if (node.type === "project" && (!reference || node.key)) throw new Error(`Projeto ${node.id} precisa de slug e não pode usar key.`);
    if (node.type === "collection" && (!reference || node.slug)) throw new Error(`Coleção ${node.id} precisa de key e não pode usar slug.`);
    if (reference) {
      references.push(reference);
      if (allowedReferences && !allowedReferences.has(reference)) throw new Error(`Referência inexistente no mapa: ${reference}.`);
    }

    ids.add(node.id);
    nodeCount += 1;
    maxDepth = Math.max(maxDepth, depth);
    const nextAncestors = new Set(ancestors).add(node);
    node.children.forEach((child) => visit(child, depth + 1, nextAncestors));
  };

  structure.forEach((node) => visit(node, 0, new Set()));
  return { ids: [...ids], references, nodeCount, maxDepth };
};

export const flattenWorkMap = (structure) => {
  const flattened = [];
  const visit = (node, depth, parentId = null) => {
    flattened.push({ ...node, depth, parentId });
    node.children.forEach((child) => visit(child, depth + 1, node.id));
  };
  structure.forEach((node) => visit(node, 0));
  return flattened;
};
