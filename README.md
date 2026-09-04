# CloudTasks - Equipo G16

* Nicolas Mejía
* Santiago Gomez
* Juan José Rojas
* Nicholas Solis
* Laura Cárdenas

## Descripción

CloudTasks es un gestor de tareas personales y de equipo construido con
HTML, CSS y JavaScript puro en el frontend, y Supabase (PostgreSQL +
Auth) como backend.

## Funcionalidades

- Registro e inicio de sesión de usuarios (Supabase Auth).
- Perfil de usuario (`username`, `email`) sincronizado automáticamente
  al registrarse.
- Creación, edición de estado y eliminación de tareas.
- Tareas **personales**: visibles solo para su dueño.
- Tareas **de equipo**: visibles para todos los miembros del equipo
  correspondiente.
- Creación de equipos e invitación de otros usuarios por correo.
- Prioridad, fecha planeada y fecha límite por tarea.

## Configuración de la base de datos

1. Entra al proyecto de Supabase (`SUPABASE_URL` en `js/app.js`).
2. Abre el **SQL Editor** y ejecuta el contenido completo de
   [`schema.sql`](./schema.sql). Esto crea las tablas `profiles`,
   `teams`, `team_members`, `tasks`, sus políticas de seguridad
   (RLS) y el trigger que sincroniza cada nuevo usuario con
   `profiles`.
3. En **Authentication > Providers**, confirma que el proveedor de
   Email esté habilitado. Si quieres pruebas rápidas sin verificación
   de correo, desactiva "Confirm email" en **Authentication >
   Settings**.

## Notas de seguridad

- Las contraseñas nunca se guardan en tablas propias: las gestiona
  Supabase Auth de forma cifrada. La tabla `profiles` solo guarda
  `username` y `email`, que es la información visible del modelo
  `USER`.
- Todas las tablas tienen Row Level Security (RLS) activado: un
  usuario solo puede ver/editar sus tareas personales o las tareas de
  los equipos a los que pertenece.

## Estructura del proyecto

```
cloudtasks/
├── index.html
├── schema.sql
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── README.md
```
