# Manager Library · App

Frontend en **React 18 + Vite**. Consume la API REST de `manager-library-api` (`/api/v1`) con
`Authorization: Bearer <token>` y muestra los mensajes del cuerpo de error único del contrato.

## Pantallas (T-22)

| Pantalla | Quién la ve | Endpoints |
|---|---|---|
| Inicio de sesión | todos | `POST /auth/login` |
| Catálogo (búsqueda, categoría, paginación; alta, edición y baja solo admin) | admin y bibliotecario | `/books`, `/categories` |
| Socios (búsqueda y alta) | admin y bibliotecario | `/members` |
| Préstamo (1 a 3 libros, con búsqueda de socio y de libro) | admin y bibliotecario | `POST /loans` |
| Devolución (por línea) | admin y bibliotecario | `POST /loans/{id}/items/{id}/return` |
| Vencidos | admin y bibliotecario | `/loans/overdue` |
| Más prestados | solo admin | `/reports/most-borrowed` |
| Equipo (alta de bibliotecarios) | solo admin | `POST /users` |

El rol que devuelve el inicio de sesión decide qué opciones aparecen; el servidor vuelve a
comprobarlo en cada endpoint (un 403 nunca depende solo de la interfaz). Si el token vence (401),
la sesión se cierra y se pide iniciar sesión de nuevo.

## Ejecutar

```
npm install
VITE_API_URL=http://localhost:8000/api/v1 npm run dev     # http://localhost:5173
npm run build
```

Con Docker, el servicio `app` de `manager-library-infra` compila y sirve el sitio con nginx.
