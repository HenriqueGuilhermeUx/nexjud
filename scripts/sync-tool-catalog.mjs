// Copia o catálogo de ferramentas da web para o app (mobile), que é um pacote separado.
import { copyFileSync } from "node:fs"
copyFileSync(new URL("../src/navigation/toolCatalog.ts", import.meta.url), new URL("../mobile/src/toolCatalog.ts", import.meta.url))
console.log("mobile/src/toolCatalog.ts atualizado")
