# Validación de la actualización de supervisión actual

- 33 pruebas Node aprobadas, sin omitidas: incluyen consulta actual de ayer/hoy, historial bajo demanda, cobertura autorizada, persistencia con Blobs local, conflictos de versiones, dotaciones vencidas/desconocidas y cuentas/registros no válidos.
- Compilación de producción y empaquetado de las cuatro funciones (dashboard, planning, coverage y session) completados.
- Playwright en Chromium: portada sin controles de fechas, dotación guardada y reflejada, navegación a historial con fechas, carga de gráficas solo en Indicadores, programación y modal móvil aprobados. Fixtures sintéticos aislados y capturas etiquetadas; sin consultas reales.
- Revisión visual a 390 px: tarjetas compactas, cobertura con acciones, sin desbordamiento horizontal.
- Benchmark sintético de 1.000 turnos y 30 días, mismo entorno: versión anterior 5.496 ms; versión optimizada unos 5 ms. Conserva 8.000 horas y todos los conteos. No es una medición del teléfono del usuario ni de latencia de red.
- JS inicial anterior aproximadamente 651 kB sin comprimir; ahora aproximadamente 277 kB. La gráfica de aproximadamente 384 kB ya no se precarga en el HTML de entrada. La prueba de navegador comprueba que no se solicita antes de abrir Indicadores.
- Los contadores históricos ya no se recalculan cada 15 s; la vista actual usa un reloj de 30 s y refresco API de 60 s, con pausa al ocultarse. Historial e Indicadores refrescan cada 5 min.

## Alcance y límites

La captura del usuario acredita que su sitio recibe datos. En este entorno siguen sin estar disponibles las credenciales de producción de GuardianCheck o Netlify; la actualización se prueba localmente y se sube a GitHub. No se acredita aquí el despliegue final de Netlify ni la consulta autenticada de esta versión a registros reales.

La API no entrega la dotación necesaria por servicio. Se añade configuración explícita por turno, con vencimiento, guardada en un store nuevo sin modificar programación ni eventos anteriores. Sin dotación vigente se muestra desconocido; sin turno abierto se pide verificar y no se declara una ausencia. Los déficits se refieren a registros coherentes, no a presencia física. No se usa el catálogo de asignaciones como si fuera una programación obligatoria.

Las notificaciones están solamente propuestas en AVISOS-PROPUESTA.md. No se implementaron cron, suscripciones, proveedores ni envíos, conforme a la petición del usuario.

## Reproducción

`npm test`, `npm run build`, `npm run benchmark -- 1000`. Con el frontend o Netlify Dev activo: `npm run test:ui`, después de instalar Chromium mediante Playwright, o indicando PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH para un Chromium local. PANEL_TEST_URL permite cambiar el destino local.

Netlify Dev en este entorno necesita XDG_CONFIG_HOME en /workspace. Su emulador de Edge Functions requiere un bootstrap remoto no disponible; se usa la opción interna --internal-disable-edge-functions solamente durante validación local. La aplicación no usa Edge Functions y esa opción no se guarda en configuración de producción.

Las pruebas de Blobs usan el servidor oficial local. Su GET omite ETag; el adaptador existente verifica una versión estable mediante LIST antes/después cuando es necesario. Las capturas van a output/, excluido de Git.
