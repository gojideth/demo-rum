# Demo de CloudWatch RUM

## Configurar y ejecutar

1. Crea un monitor en **CloudWatch > RUM > App monitors**. Copia el **ID del monitor** desde sus detalles. El **ID del identity pool** aparece al configurar la autorización del monitor; también puedes encontrarlo en **Amazon Cognito > Identity pools**. Ambos valores están en `.env.example`.
2. Copia `.env.example` a `.env` y reemplaza los valores indicados. Para habilitar mapas, completa también el nombre del monitor, un bucket S3 privado y el ID de cuenta.
3. Construye la app, sube los mapas y arráncala con Docker siguiendo los pasos de abajo.
4. Abre [http://localhost:8080](http://localhost:8080) y pulsa uno de los tres botones.

No pongas claves secretas de AWS en `.env` ni en el código del navegador.

## Repetición de sesiones

La app carga `RRWebPlugin` en `src/main.js`. Para ver reproducciones:

1. En **CloudWatch > RUM > App monitors**, abre el monitor y confirma que la recopilación de sesiones esté activada. El SDK ya envía el 100 % de las sesiones de esta demo (`sessionSampleRate: 1`).
2. Inicia el contenedor con los IDs de AWS configurados y abre la aplicación. Interactúa con los botones para generar sesiones y eventos.
3. En el monitor de CloudWatch RUM, abre la pestaña **Session replay** o la pestaña **Sessions** y selecciona una sesión con el icono de reproducción. La sesión puede tardar unos minutos en aparecer.

El plugin oculta por defecto el texto y los campos de entrada de la página. La reproducción puede recopilar interacciones y contenido visual; revisa los requisitos de privacidad y consentimiento aplicables antes de usarla con personas o datos reales. El muestreo al 100 % es para el taller: reduce la tasa en aplicaciones con tráfico real para controlar la recopilación y los costos. Consulta la [documentación oficial de repetición de sesiones de CloudWatch RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-session-replay.html).

## Mapas de fuentes para stack traces

La compilación de Vite genera mapas ocultos en `dist/` (`vite.config.js`). El contenedor elimina los `.map` antes de publicar la app. Los mapas listos para subir están en `source-maps/<RUM_RELEASE_ID>/`. Súbelos únicamente a un bucket privado de S3, en la misma región que el monitor. Los mapas contienen el código fuente original: no los publiques en el sitio web.

1. Usa un `RUM_RELEASE_ID` único para cada compilación. El mismo valor identifica la carpeta S3 y la versión enviada por el SDK.
2. En la consola de S3, crea un bucket privado en la región del monitor. En **Permissions > Bucket policy**, agrega el permiso siguiente y reemplaza los marcadores. Si el bucket ya tiene una política, agrega el objeto a su arreglo `Statement`; no elimines las reglas existentes.

   ```json
   {
     "Sid": "AllowCloudWatchRUMToReadSourceMaps",
     "Effect": "Allow",
     "Principal": { "Service": "rum.amazonaws.com" },
     "Action": ["s3:GetObject", "s3:ListBucket"],
     "Resource": [
       "arn:aws:s3:::<BUCKET>",
       "arn:aws:s3:::<BUCKET>/*"
     ],
     "Condition": {
       "StringEquals": {
         "aws:SourceAccount": "<AWS_ACCOUNT_ID>",
         "aws:SourceArn": "arn:aws:rum:<AWS_REGION>:<AWS_ACCOUNT_ID>:appmonitor/<RUM_APP_MONITOR_NAME>"
       }
     }
   }
   ```

3. Genera los `.map` localmente:

   ```sh
   npm ci
   npm run build
   ```

   Copia únicamente los archivos `.map` desde `dist/assets/` a la carpeta `source-maps/<RUM_RELEASE_ID>/`. Para la compilación actual, el archivo está en `source-maps/workshop-release-1/index-BcgcGe7e.js.map`. En la consola de S3, abre el bucket, crea una carpeta con el nombre exacto de `RUM_RELEASE_ID`, entra a esa carpeta y pulsa **Upload** para subir los `.map`. El objeto debe quedar así:

   `s3://<BUCKET>/<RUM_RELEASE_ID>/<nombre-exacto-del-bundle>.js.map`

4. En **CloudWatch > RUM > App monitors**, abre el monitor y edítalo. Activa **Unminify JavaScript error stack traces** (mapas de JavaScript) e indica la URI `s3://<BUCKET>`. Guarda los cambios. La política del bucket debe autorizar la lectura por `rum.amazonaws.com`, restringida por cuenta y ARN del monitor, como en el paso 2.

5. La app ya usa el mismo `RUM_RELEASE_ID` de `.env`. Si lo cambiaste, reinicia el contenedor para que lo lea. Genera un error nuevo y revisa el evento en RUM; la desofuscación solo se aplica a eventos nuevos. Mantén los mapas de cada release bajo su carpeta correspondiente. Consulta la [guía oficial de mapas de CloudWatch RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-JavaScriptStackTraceSourceMaps.html).
