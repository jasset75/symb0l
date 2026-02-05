# Propuesta de Arquitectura: Orquestación Symb0l

## Visión General

El objetivo es transformar `symb0l` de ser un generador de base de datos aislado a ser el núcleo ("core") de un sistema financiero más amplio que incluye una API de cotizaciones en tiempo real.

## Estrategia de Orquestación: ¿Monorepo vs. Multi-repo?

Teniendo en cuenta que buscas "orquestación" y que la API consumirá `symb0l` muy de cerca (tipos, esquema, acceso a DB), mi recomendación fuerte es evolucionar este repositorio a un **Monorepo** (usando pnpm workspaces).

### Opción A: Monorepo (Recomendada)

Transformar el repo actual en un workspace que contiene varios paquetes.

**Estructura Propuesta:**

```
/ (root)
├── package.json (pnpm inputs)
├── pnpm-workspace.yaml
├── packages/
│   └── core/           <-- El código actual de symb0l (moved)
│       ├── src/
│       ├── symb0l.db
│       └── package.json (name: "@symb0l/core")
└── apps/
    └── api/            <-- La nueva API de cotizaciones
        ├── src/
        └── package.json (depends on: "@symb0l/core")
```

**Ventajas:**

1.  **Sincronización Total**: Si cambias el esquema de la DB en `core`, TypeScript te avisará inmediatamente si rompes algo en `api`.
2.  **Despliegue Atómico**: Puedes desplegar todo junto.
3.  **Dev Experience**: `pnpm dev` puede levantar la DB y la API a la vez.

### Opción B: "Repo Satélite" (Multi-repo)

Mantener `symb0l` como está y crear otro repo para la API.

**Desventajas:**

1.  **Versionado**: Tendrás que publicar `@symb0l/core` a un registro npm (o usar git dependencies) cada vez que hagas un cambio antes de poder usarlo en la API.
2.  **Divergencia**: Es fácil que la API y la DB se desincronicen.

---

## Integración: ¿Cómo consume la API a `symb0l`?

Mencionaste la duda entre "Sistema de ficheros (acceder a simb0l.db)" o "Biblioteca". La respuesta correcta es **Biblioteca que abstrae el Sistema de Ficheros**.

### El Patrón "Core Library"

`@symb0l/core` no debe ser solo un script que corre y muere. Debe exponer una API programática para acceder a los datos.

**Lo que exporta `@symb0l/core`:**

1.  **Tipos**: `Instrument`, `Listing`, `Market`.
2.  **Instancia de DB**: Una función `getDatabase()` que devuelve la conexión `node:sqlite` ya configurada.
3.  **Utilidades**: Funciones para buscar (e.g., `findListingByTicker('AAPL')`).

**Flujo de la API:**

1.  La API importa `@symb0l/core`.
2.  Al arrancar, usa `core` para asegurar que la DB existe (o la genera 'on-the-fly' si la config lo permite).
3.  Cuando llega una petición `GET /price/AAPL`:
    - Usa `@symb0l/core` para buscar `AAPL` -> Obtiene ISIN `US0378331005` y metadata (Exchange: NASDAQ).
    - Usa la metadata para llamar a **Twelve Data** (o caché).
    - Combina y devuelve el JSON enriquecido.

## Twelve Data & Capa de Servicios

La nueva API (`apps/api`) tendría la siguiente arquitectura interna:

- **Layer 1: Metadata (Symb0l)**: Resuelve "Qué es AAPL" (Nombre, Sector, País).
- **Layer 2: Market Data (Provider)**: Obtiene "Cuánto vale" (Twelve Data adapter).
- **Layer 3: Cache (Redis/In-memory)**: Para no gastar cuota de API.

## Pasos Recomendados

1.  **Refactor a Estructura de Paquetes**: Mover el código actual a `packages/core`.
2.  **Definir exports**: Asegurar que `index.ts` en core exporte las interfaces y la conexión a DB.
3.  **Crear `apps/api`**: Inicializar un proyecto con Fastify o Hono (ligeros, modernos, TS-first).
4.  **Conectar**: Importar `core` en `api` y hacer una ruta de prueba.
