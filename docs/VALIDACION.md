# Validación de esta entrega

- Compilación Vite de producción: completada.
- Empaquetado de las tres funciones con Netlify CLI: completado.
- 21 pruebas Node: aprobadas, sin omitidas. Incluyen cookies, origen, destino fijo de la API, paginación completa, filtros, cálculos y Netlify Blobs local.
- Prueba de funciones con proveedor local de Blobs y API sintética aislada: consulta completa, reutilización de caché, creación, seguimiento, protección por ETag y archivo aprobados.
- Prueba Playwright con Chromium: login, ausencia de cifras de demostración, navegación de secciones, creación de programación, modal y viewport móvil de 390 px aprobados. Sin desbordamiento horizontal ni errores de JavaScript.
- Netlify Dev: GET sin sesión → 401; login con contraseña sintética → 200; GET con sesión → 200; consulta autenticada del panel sin credencial GuardianCheck → 503 descriptivo.
- Netlify Dev necesitó XDG_CONFIG_HOME en /workspace y deshabilitar su emulador de Edge Functions mediante una opción interna de CLI: el bootstrap remoto de Deno no era accesible. La aplicación no usa Edge Functions. Esta opción se usó solo para validación y no se agrega a la configuración de producción.
- El emulador de Blobs omite ETag en GET; el adaptador verifica una versión estable con LIST antes y después de leer cuando no existe ese encabezado. Los cambios fallan si no se puede obtener una versión estable.
- UI y funciones verificadas con fixtures sintéticos de pruebas. No están incorporados en la aplicación ni se usan como sustituto de datos reales.
- Las referencias compartidas/plantillas de la habilidad Data no estuvieron disponibles en el lector ni en el filesystem. Se implementó la aplicación React y las funciones nativas para el destino Netlify elegido por el usuario, siguiendo el diseño oscuro acordado y las definiciones documentadas.

## Pendientes externos

La credencial GUARDIAN_API_KEY no está disponible en este entorno. No se han ejecutado consultas autenticadas a registros operativos reales de GuardianCheck. Tampoco hay identidad/sitio Netlify configurados: no hay publicación remota ni URL de producción acreditadas.

Después de configurar las variables y publicar: entrar al panel, comprobar catálogos y turnos contra GuardianCheck, comparar sumas del mismo periodo y servicio, registrar una entrada programada y un aviso real, recargar para comprobar persistencia y confirmar que una sesión no autorizada no obtiene datos. Verificar un servicio no autorizado sin ampliar permisos para hacer pasar la prueba.

## Prueba de interfaz reproducible

Con Netlify Dev o un servidor del frontend disponible:

```sh
npx playwright install chromium
PANEL_TEST_URL=http://127.0.0.1:8888 npm run test:ui
```

En máquinas con Chromium preinstalado puede usarse PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. La prueba intercepta llamadas /api para su escenario de interfaz; no valida acceso real a GuardianCheck. Las capturas quedan en output/, excluido de Git, con etiqueta de prueba visual y datos sintéticos.
