# anime-tracker

Monorepo con dos proyectos independientes, sin workspace manager. Cada uno tiene su
`package.json` y se ejecuta por separado.

| Carpeta | Qué es |
|---|---|
| `anime-availability-api/` | Express 5 + TypeScript. Agrega AniList, TMDB, MAL, Kitsu, Shikimori y RapidAPI. Desplegado en Render. |
| `anime-tracker-ui/` | Next.js 16 (App Router) + Tailwind v4 + shadcn/ui. Desplegado en Vercel. |
| `supabase/migrations/` | **Fuera de git a propósito** (ver abajo). |
| `openspec/` | Artefactos SDD. Sí va a git. |

Auth, listas y seguimiento viven en Supabase con RLS.

## Verificación

Ambos proyectos usan vitest. Correr desde la carpeta del proyecto, no desde la raíz:

```bash
npx tsc --noEmit && npx vitest run
```

## Convenciones

**Nada de tipos ni funciones locales.** Los tipos van en `src/types/`, las funciones en
`src/lib/`. Dos copias del mismo concepto divergen en cuanto alguien edita una — ya pasó dos
veces en este repo.

**Comentarios que expliquen el porqué**, no el qué. El diff ya dice qué cambió.

**Commits sí, PRs nunca.** Los PRs los abre y mergea el dueño del repo.

**Idioma:** código, identificadores y comentarios en inglés. Copy de UI en español.

## Migraciones

`supabase/migrations/` está en `.gitignore` deliberadamente (*"sensitive schema"*). El flujo es:
escribir el archivo con fecha y su porqué, **pegar el SQL desnudo en la conversación**, y que
el dueño lo corra en el dashboard de Supabase. No forzar su entrada a git.

Consecuencia: el `CREATE TABLE` original de `user_anime` **no está en el repo**. La nulabilidad
y los defaults no se pueden confirmar leyendo código — verificar contra la base, o escribir
migraciones que sean seguras corran o no.

## Cepos ya pisados

**Un `.update()` que no encuentra filas no es un error.** Postgres devuelve éxito. Filtrar por
`user_id` + `anime_id` sobre una fila inexistente reportaba escritura correcta sin escribir
nada. Actualizar, revisar las filas devueltas, insertar si no hubo ninguna. `upsert` no sirve
aquí: manda todas las columnas y pisaría el estado de una fila existente.

**`DROP NOT NULL` no quita el `DEFAULT`.** Tras hacer `user_anime.status` nullable, omitirlo en
un INSERT seguía produciendo `plan_to_watch`. Mandar `null` explícito **y** `DROP DEFAULT`.

**Un z-index negativo se pinta antes que los fondos de bloques en flujo.** Una capa
`fixed inset-0 -z-10` queda tapada por cualquier ancestro con fondo opaco. Usar `z-0` en la
capa decorativa y `relative z-10` en el contenido.

**El header muestrea lo que tiene detrás.** `Header.tsx` es `fixed top-0`; con scroll pasa a
`backdrop-blur-xl`. Cualquier color anclado arriba se filtra dentro del navbar.

## Presupuestos

RapidAPI: 1000 llamadas/mes, se autobloquea al tope. `RAPIDAPI_DAILY_LIMIT` 35. El endpoint
`/v1/anime/batch` no lo toca nunca — resuelve hasta 50 ids por petición.

Un veredicto de proveedores solo se persiste si **todas** las fuentes aplicables respondieron.
Marcar como concluyente un resultado vacío que nadie verificó fue lo que convirtió un
presupuesto agotado en un catálogo entero mostrando "Pirata".

Supabase free tier y ~4 usuarios activos: una consulta extra es irrelevante. Si hay que objetar
una consulta, que sea por arquitectura, no por carga.
