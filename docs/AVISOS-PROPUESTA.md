# Propuesta de avisos de operación

Estado: propuesta, sin activación. El usuario pidió estudiar notificaciones y ejecutar solamente los cambios de interfaz, cobertura y rendimiento. Esta entrega no registra tareas programadas, no solicita permisos de notificación y no envía mensajes externos.

## Señales que justificarían un aviso

| Señal | Evidencia mínima | Primera acción |
| --- | --- | --- |
| Puestos sin entrada válida | Dotación vigente > entradas abiertas coherentes, servicio activo y consulta completa reciente | Confirmar situación con el supervisor y preparar relevo |
| Entrada próxima sin confirmar | Programación real, corte de 30 min, sin confirmación ni relevo | Contactar al responsable de ese servicio |
| Entrada vencida sin registro | Hora prevista + tolerancia, sin entrada compatible | Verificar presencia o fallo del checador; no declarar ausencia automáticamente |
| Turno >26 horas | Flag documentado por GuardianCheck | Revisar salida o necesidad de relevo |
| Pérdida de conexión | Fallos persistentes de sincronización, separados de las señales operativas | Avisar al administrador de que no se puede evaluar cobertura |

Para dotación, confirmar el estado en dos consultas consecutivas completas de 60 s antes de abrir un aviso. Esto evita alertar por una actualización intermedia o por un cambio entre páginas. Un registro abierto, incluso coherente, no prueba presencia física.

## Operación propuesta

1. Un proceso programado en servidor consulta los datos aun cuando el panel esté cerrado. El intervalo y el servicio de ejecución se eligen según el plan de Netlify, los tiempos de ejecución y la cuota disponible. No depender de permisos del navegador para detectar riesgos.
2. Mantener el estado de cada aviso en almacenamiento: integración, servicio/entrada programada, tipo de señal, primera detección, última comprobación, severidad, destinatario, reconocimiento y resolución. No guardar la credencial de API en ese registro.
3. Abrir una sola incidencia por señal y servicio/turno. Guardar una clave de deduplicación antes de enviar. Los reintentos conservan esa clave y tienen límite; una vista recargada no genera avisos adicionales.
4. Notificar al supervisor asignado. Si continúa pendiente, proponer escalamiento después de 15 minutos, con máximo de repeticiones configurable. Cerrar el aviso cuando desaparece la señal con datos recientes o supervisión registra una resolución verificada.
5. Mostrar confirmación de lectura y responsable en el panel. No dar un aviso por resuelto solo porque el destinatario lo abrió.

Los tiempos de dos consultas y 15 minutos son propuestas iniciales para validar con operación, no niveles de servicio ya acordados.

## Canales a evaluar

- Notificación dentro del panel: inmediata para quien ya lo está usando; insuficiente si está cerrado.
- Correo: integración de servidor y entrega fácil de auditar; verificar recepción, destinatarios y demoras.
- Notificaciones push: útiles en el teléfono, con permisos y soporte del sistema operativo; requieren administrar suscripciones por dispositivo.
- WhatsApp: usar un proveedor oficial y sus condiciones/plantillas aplicables; requiere configuración y credenciales específicas. No automatizar sesiones personales de WhatsApp.

Primero confirmar el canal, destinatarios, horario y escalamiento. Hacer un piloto con pocos servicios. No incluir nombres de guardias u otra información privada en la pantalla bloqueada; enviar servicio, cantidad y enlace al panel autenticado.

## Condiciones para implementarlo después

Dotación y programación confiables, responsables por servicio, credenciales del canal, autorización explícita de envíos y de operación en segundo plano, política de retención y verificación de la cuota. Si la API no está disponible, emitir solo una señal de conexión y no afirmar que faltan guardias. Las cuentas actuales del panel comparten contraseña: la atribución individual de reconocimiento requiere cuentas personales en una siguiente etapa.
