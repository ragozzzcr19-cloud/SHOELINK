# Panel de Modelos — Administrador

Prototipo interactivo para agregar modelos nuevos al catálogo, con la opción de marcarlos
como **stock regular** (suma inventario) o **por encargo** (no suma inventario ni entra en
el resumen por marca).

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Versión autocontenida. Corre sola en cualquier navegador, sin instalar nada. **Es la que subís a GitHub Pages o a cualquier hosting.** |
| `PanelModelos.jsx` | El mismo panel como componente de React, para integrarlo a un proyecto real (Vite, Next, Create React App, etc.) más adelante. |

## Publicarlo con GitHub Pages

1. Creá un repositorio nuevo en GitHub (puede ser público o privado con Pages habilitado).
2. Subí `index.html` a la raíz del repo — no hace falta nada más, ni carpetas, ni `package.json`.
3. Entrá a **Settings → Pages**.
4. En **Source**, elegí **Deploy from a branch**.
5. En **Branch**, elegí `main` y la carpeta `/ (root)`. Guardá.
6. GitHub te va a dar una URL pública (algo como `https://tu-usuario.github.io/tu-repo/`) en uno o dos minutos.

Listo — esa URL ya sirve el panel funcionando.

## Qué hace el panel

- **Agregar un modelo a mano**: foto, código, marca, modelo, género, disciplina, color,
  precio y cantidad. Dos botones al final:
  - **Agregar y sumar a inventario** — pide cantidad, entra al stock.
  - **Agregar por encargo (sin inventario)** — no pide cantidad, no suma stock.
- **Subir un archivo con varios modelos** (`.xlsx`, `.xls` o `.csv`): mismos dos botones,
  pero aplicados a todas las filas del archivo de una sola vez.
- **Resumen por marca**: cuenta modelos y unidades por marca — **solo** de lo que entró
  como stock regular. Lo que se agregó por encargo no aparece ahí a propósito, aunque sí
  se ve en el catálogo (lista de "Modelos agregados").

### Formato esperado del archivo de carga masiva

El panel reconoce estas columnas (no importa el orden, ni mayúsculas o tildes):

| Columna | Alias aceptados |
|---|---|
| Código | Codigo, Código, Codigo Fab, Cod |
| Marca | Marca, Nombre Marca |
| Modelo | Modelo, Descripcion, Descripción, Nombre |
| Género | Genero, Género |
| Disciplina | Disciplina, Desc Disciplina |
| Color | Color |
| Precio | Precio, Venta, Precio de Venta |
| Cantidad | Cantidad, Cant, Dispo, Dispo Tec |
| Imagen (opcional) | Imagen, Imagen URL, Foto — una URL directa a la imagen |

Filas sin código ni modelo se ignoran automáticamente.

## Dónde queda guardada la información

Los modelos que agregás quedan guardados en el **almacenamiento local del navegador**
(`localStorage`) de quien abre la página. Esto significa:

- Los datos persisten entre visitas en el mismo navegador/computadora.
- **No es una base de datos compartida** — si dos personas abren la misma URL desde
  computadoras distintas, cada una ve solo lo que agregó ella.

## Siguiente paso (si lo necesitan en equipo)

Para que varias personas vean los mismos modelos hace falta conectar el formulario a un
backend real (una API + base de datos) en lugar de `localStorage`. Este panel ya tiene
separada toda la lógica de "agregar", "marcar por encargo" y "resumen por marca" en
funciones claras (`submit`, `commitBulk`, `resumenMarca` dentro de `PanelModelos.jsx`),
pensadas para que un desarrollador las conecte a esa API sin tener que rehacer la interfaz.
