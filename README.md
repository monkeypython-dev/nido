# Nido 🥚

App web instalable (PWA) para Julio y Cristina: gimnasio, calorías y una mascota compartida que crece con cada entreno.

- Sin servidor propio: HTML + JS puros, se publica en GitHub Pages.
- Datos en el móvil (funciona sin conexión) y copia opcional en Firebase Firestore.
- Alimentos: lista local + [Open Food Facts](https://world.openfoodfacts.org) (gratis).
- Ilustraciones de ejercicios: [workout-guide](https://github.com/bryllim/workout-guide) (CC BY-SA 4.0).

## Probar en local

```sh
python -m http.server 8765
```
y abrir http://127.0.0.1:8765

## Firebase (opcional)

1. Crear proyecto en https://console.firebase.google.com (sin Analytics).
2. Authentication → Método de acceso → Correo/contraseña → Habilitar. En Usuarios → Añadir usuario (la cuenta compartida).
3. Firestore Database → Crear base de datos → modo producción → ubicación `eur3`.
4. Firestore → Reglas: pegar `firestore.rules` cambiando el email por el de la cuenta compartida → Publicar.
5. Configuración del proyecto → Tus apps → Web (`</>`) → registrar "Nido" → copiar `firebaseConfig` en `js/firebase-config.js`.
6. Authentication → Configuración → Dominios autorizados → añadir `TU_USUARIO.github.io`.

## Publicar cambios

Cada vez que cambies archivos, sube `VERSION` en `sw.js` para que el móvil descargue la versión nueva.
