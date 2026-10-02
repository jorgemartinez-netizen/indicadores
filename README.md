# GuardianCheck · Control de operación

Panel oscuro para Netlify con anticipación, operación diaria e indicadores. Consulta la API de GuardianCheck desde funciones del servidor. No incorpora cifras ficticias ni credenciales. Sin conexión muestra un error; sin programación muestra indicadores sin denominador como «—».

## Publicar en Netlify

1. Sube este proyecto a tu repositorio y conéctalo a un sitio de Netlify. La configuración `netlify.toml` define `npm run build`, publicación `dist` y funciones `netlify/functions`.
2. En **Environment variables** del sitio, agrega con alcance **Functions**:
   - `GUARDIAN_API_KEY`: la credencial secreta de la integración de servidor de GuardianCheck.
   - `PANEL_ACCESS_PASSWORD`: contraseña nueva, aleatoria y distinta de la credencial, de al menos 16 caracteres. Es el acceso de supervisión.
   - `GUARDIAN_API_URL`: `https://us-central1-guardiancheck-prod.cloudfunctions.net/integrationApi` (opcional, es el valor predeterminado).
3. Si existen opciones para marcar valores como secretos, úsalas. No uses variables `VITE_` para secretos. Nunca los incluyas en código, Git o mensajes. Aplica las variables al contexto de producción; evita compartir credenciales reales con previews de cambios no revisados.
4. Despliega el sitio. Netlify Blobs conserva la programación y el seguimiento entre despliegues del mismo sitio, con consistencia fuerte. Las credenciales de Blobs se suministran por Netlify; no se necesitan tokens adicionales en el código.
5. Entra con la contraseña de supervisión. Confirma el estado «API conectada» y la fecha de los datos. Revisa servicios y turnos contra GuardianCheck. Para preparar anticipación, registra las entradas esperadas en **Anticipación → Programar entrada**.

La integración de GuardianCheck debe estar habilitada en modalidad **servidor**, con permisos de **guards, sites, shifts y on-duty**, y servicios seleccionados explícitamente. La clave vence a los 90 días; al renovarla actualiza la variable de Netlify y vuelve a desplegar. La huella de caché cambia con la clave.

Todos los usuarios con la contraseña de este panel ven los mismos servicios autorizados y pueden registrar seguimientos. No hay permisos por persona ni atribución individual de acciones. Para acceso individual, incorporar cuentas en una siguiente versión. Cambiar la contraseña y redesplegar invalida todas las sesiones. Las sesiones duran 8 horas y se guardan en cookie HttpOnly y SameSite=Strict, Secure en HTTPS. No se pone la clave de GuardianCheck en el navegador.

No hay un despliegue realizado o una consulta autenticada real acreditados por este repositorio: esas comprobaciones requieren configurar las variables y ejecutar la validación contra la integración real.

## Desarrollo local

Requiere Node 22 o superior.

```sh
npm ci
cp .env.example .env
# Editar .env localmente; nunca guardar sus valores en Git.
npm run dev:netlify
```

Usa Netlify Dev para las funciones y Netlify Blobs local. `npm run dev` sirve solo el frontend y no conecta la API. Netlify Dev puede solicitar vincular el sitio para acceder a su configuración; para probar sin acceso externo: `npx netlify dev --offline --no-open --framework '#static' --dir dist`, después de construir. En este entorno restringido, si el directorio de configuración habitual no es escribible, ejecuta con `XDG_CONFIG_HOME=/workspace/.config`.

```sh
npm test
npm run build
```

Los tests usan datos ficticios aislados y verifican cookies y origen, paginación vacía y errores, cuotas, filtros, fechas de México, duplicados, programación, avisos y denominadores. No sustituyen una prueba autenticada contra datos reales.

## Datos y definiciones

- **Operación diaria** consulta `/v1/on-duty`; las fechas históricas no limitan esta vista. Cuenta guardias por ID distinto, conservando turnos duplicados para revisión. Un turno abierto no prueba presencia física. Los IDs ausentes no se cuentan como personas.
- **Historial** consulta `/v1/shifts`, seleccionados por fecha de entrada. Máximo 93 días inclusivos. Las fechas se agrupan en `America/Mexico_City`; los resultados se paginan completamente y se reconcilian por ID. Los datos pueden cambiar entre páginas: no son una instantánea transaccional.
- **Horas registradas** suma `workedHours` de turnos cerrados con fechas válidas, sin recortar las horas al intervalo. No son horas aprobadas para nómina. La API conserva el reloj del dispositivo.
- **Inconsistencias** cuenta turnos con al menos un `flag`, dividido entre todos los turnos del periodo. Varios flags del mismo turno cuentan una vez.
- **Preparación** considera los puestos programados para los próximos 60 minutos. Un puesto está asegurado si se registró entrada, se confirmó llegada, se anunció llegada dentro de tolerancia o se confirmó relevo. Es una señal de seguimiento, no una garantía de asistencia.
- **Incidencias sin aviso oportuno**: retrasos con entrada posterior a la tolerancia o ausencias verificadas manualmente sin aviso de retraso/ausencia registrado al menos 30 minutos antes, entre todas las incidencias verificadas. Ausencia anunciada o entrada inexistente no equivale a ausencia verificada.
- **Anticipación mediana**: minutos entre el primer aviso de retraso/ausencia de cada programación y su inicio. Solo avisos anteriores a la entrada; no es la media de medianas por servicio.
- **Riesgos resueltos antes de entrada**: programación creada al menos 30 min antes, evaluada en el corte de −30 min. Cuenta entradas o relevos confirmados antes del inicio sobre los puestos que no estaban asegurados en ese corte.
- Los avisos se registran con la hora del servidor al guardar, sin retrofechar. No se importan WhatsApp ni llamadas automáticamente. Guardar un contacto no envía mensajes.
- Para cruzar programación y asistencia se usa guardia + servicio y la entrada más cercana en una ventana de −4 a +12 h, asignando cada entrada una sola vez. Revisar coincidencias ambiguas, ausencias y dobles turnos. Un relevo confirmado asegura el puesto, pero no demuestra que haya llegado físicamente.
- Sin denominador o sin programación, las tasas muestran `—`. Las series históricas incluyen todos los días del periodo después de obtener una consulta completa.

## Persistencia y sincronización

Netlify Blobs guarda entradas programadas y eventos por registro. Las modificaciones usan ETag para evitar sobrescribir cambios concurrentes. «Retirar programación» archiva el registro y lo excluye de indicadores; no modifica GuardianCheck. No se permite programar dos entradas del mismo guardia separadas menos de cuatro horas. Se registran solamente guardias y servicios activos dentro del alcance autorizado.

El panel refresca cada 60 segundos mientras está abierto y visible. No hay alertas por WhatsApp/correo ni monitor en segundo plano cuando todos los usuarios cierran el panel. Para esa operación continua se requiere configurar un proceso programado y un canal de notificación autorizado en una siguiente etapa.

La caché compartida de cada recurso dura 60 s, con bloqueo por consulta. El panel limita sus llamadas a 100 páginas/minuto por credencial, dejando margen frente a las 120/minuto de GuardianCheck. Otros consumidores pueden gastar el margen. Un 429 respeta Retry-After. Si falla una página no se muestra una consulta parcial; la UI conserva resultados anteriores con advertencia. Más de 3 minutos de antigüedad activa una advertencia y deshabilita registros de seguimiento. El contador, los bloqueos y la caché usan Blobs y escrituras condicionales.

El almacenamiento de registros y llaves de caché crece con el uso; antes de uso prolongado establecer retención/limpieza según la política de la organización. La limitación de login es de 10 intentos por IP en 15 min. No se registran contraseñas, tokens o respuestas operativas en consola.

## Fuentes

Contrato de la API v1 y guías de integración suministradas por el usuario. Copia del esquema: `docs/guardiancheck.openapi.json`. El registro de publicación describe comprobaciones de despliegue y emuladores; no acredita consultas autenticadas reales de esta app.

Detalles de las comprobaciones, limitaciones y pruebas de interfaz: `docs/VALIDACION.md`.
