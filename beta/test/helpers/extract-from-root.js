import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT_APP_JS = fileURLToPath(new URL("../../../app.js", import.meta.url));

/** Source complet de `app.js` (racine du depot). */
export const rootSource = readFileSync(ROOT_APP_JS, "utf8");

/**
 * Extrait `function <name>(...) { ... }` par appariement d'accolades, puis
 * renvoie une fonction JavaScript reelle equivalente.
 *
 * @param {string} name
 * @returns {Function}
 */
export function extractFunction(name) {
  const signature = `function ${name}(`;
  const start = rootSource.indexOf(signature);
  if (start < 0) throw new Error(`Fonction introuvable dans app.js : ${name}`);

  const bodyOpen = rootSource.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = bodyOpen; i < rootSource.length; i += 1) {
    const char = rootSource[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) throw new Error(`Accolade fermante introuvable pour ${name}`);

  const declaration = rootSource.slice(start, end);
  return new Function(`${declaration}; return ${name};`)();
}

/**
 * Extrait une declaration `const <name> = <expression>;` tenant sur une ligne
 * logique et renvoie sa valeur evaluee.
 *
 * @param {string} name
 * @returns {*}
 */
export function extractConst(name) {
  const marker = `const ${name} = `;
  const start = rootSource.indexOf(marker);
  if (start < 0) throw new Error(`Constante introuvable dans app.js : ${name}`);
  const end = rootSource.indexOf(";\n", start);
  const expression = rootSource.slice(start + marker.length, end);
  return new Function(`return (${expression});`)();
}
