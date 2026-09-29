# tangram.space

Sitio institucional de Tangram (agencia de producción creativa). Estático puro: HTML + `css/styles.css` + `js/main.js` (IIFEs vanilla, sin build step, sin framework).

## Contenido e idiomas

- `index.html` — inglés (EN, raíz)
- `es/index.html` — español (ES)
- `zh/index.html` — chino (ZH)
- `chevy.html` — página de perfil del director; maneja sus 3 idiomas con un objeto JS `_t` inline y `<style>` propio, no con 3 archivos separados.
- `catalog-okx-2026/` — catálogo cliente (OKX), deployado directo a los buckets S3 sin pasar por este repo hasta este backup. Ver advertencia más abajo.

Los tres idiomas comparten `css/styles.css` y `js/main.js` (ojo: rutas de assets relativas distintas — `assets/…` en raíz vs `../assets/…` en subcarpetas).

## Arquitectura y hosting

- Estático puro, sin backend, sin build step ni framework.
- **Staging:** bucket S3 `staging-tangram-space` (us-east-2), servido directo como website estático (sin CDN, sin compresión, HTTP plano, `robots.txt` bloquea todo a propósito).
- **Producción:** bucket S3 `www.tangram.space` (us-east-2) detrás de CloudFront (`E1B8S1T84UI4X5`), que sirve tanto `tangram.space` como `www.tangram.space` (una función CloudFront en `infra/apex-redirect.function.js` redirige `www` → apex sin `www`, la canónica real del sitio).
- `seo.config.json` + `build-seo.js` generan `canonical`/`hreflang`/JSON-LD/`robots.txt`/`sitemap.xml` según el entorno (`node build-seo.js staging|production`). El estado del repo en cada commit normalmente refleja el modo `staging` (así queda el árbol de trabajo después de cada deploy a producción).

## Staging vs. producción

Todo cambio se prueba primero en staging. Producción solo se actualiza con aprobación explícita, y después hay que invalidar CloudFront.

Comando canónico para desplegar a staging (no armar el `aws s3 sync` a mano):

```bash
./deploy-staging.sh
```

Para producción: `./deploy-production.sh` (corre `build-seo.js production`, sincroniza, invalida CloudFront, y al final vuelve a correr `build-seo.js staging` para dejar el árbol de trabajo listo para seguir iterando).

## ⚠️ Advertencia crítica — `catalog-okx-2026/`

`catalog-okx-2026/` es contenido real y publicado (catálogo para un cliente, OKX) que históricamente vivía **solo en los buckets S3**, no en este repo — se agregó acá recién en este backup. Ambos scripts de deploy (`deploy-staging.sh` y `deploy-production.sh`) excluyen explícitamente `catalog-okx-2026/*` de su `--delete`.

**Nunca correr `aws s3 sync --delete` a mano sobre ninguno de los dos buckets sin excluir `catalog-okx-2026/`** — ya pasó una vez (2026-09-23) que un sync sin esa exclusión lo borró de staging; se restauró copiando desde el otro bucket. Si necesitás sincronizar a mano por algún motivo, agregá siempre `--exclude "catalog-okx-2026/*"` o usá los scripts existentes.
