# Demo de CloudWatch RUM

## Configurar y ejecutar

1. Crea un monitor en **CloudWatch > RUM > App monitors**. Copia el **ID del monitor** desde sus detalles. El **ID del identity pool** aparece al configurar la autorización del monitor; también puedes encontrarlo en **Amazon Cognito > Identity pools**. Ambos valores están en `.env.example`.
2. Copia `.env.example` a `.env` y reemplaza los valores indicados. Para habilitar mapas, completa también el nombre del monitor, un bucket S3 privado y el ID de cuenta.
3. Construye la app, sube los mapas y arráncala con Docker siguiendo los pasos de abajo.
4. Abre [http://localhost:8080](http://localhost:8080) y pulsa uno de los tres botones.

No pongas claves secretas de AWS en `.env` ni en el código del navegador. Usa AWS CLI con un perfil/rol que tenga permisos para actualizar el monitor y subir objetos al bucket.

## Repetición de sesiones

La app carga `RRWebPlugin` en `src/main.js`. Para ver reproducciones:

1. En **CloudWatch > RUM > App monitors**, abre el monitor y confirma que la recopilación de sesiones esté activada. El SDK ya envía el 100 % de las sesiones de esta demo (`sessionSampleRate: 1`).
2. Inicia el contenedor con los IDs de AWS configurados y abre la aplicación. Interactúa con los botones para generar sesiones y eventos.
3. En el monitor de CloudWatch RUM, abre la pestaña **Session replay** o la pestaña **Sessions** y selecciona una sesión con el icono de reproducción. La sesión puede tardar unos minutos en aparecer.

El plugin oculta por defecto el texto y los campos de entrada de la página. La reproducción puede recopilar interacciones y contenido visual; revisa los requisitos de privacidad y consentimiento aplicables antes de usarla con personas o datos reales. El muestreo al 100 % es para el taller: reduce la tasa en aplicaciones con tráfico real para controlar la recopilación y los costos. Consulta la [documentación oficial de repetición de sesiones de CloudWatch RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-session-replay.html).

## Mapas de fuentes para stack traces

La compilación de Vite genera mapas ocultos en `dist/` (`vite.config.js`). El contenedor elimina los `.map` antes de publicar la app: súbelos únicamente al bucket privado de S3. El bucket debe estar en la misma región que el monitor.

1. Usa un `RUM_RELEASE_ID` único para cada compilación. El mismo valor identifica la carpeta S3 y la versión enviada por el SDK.
2. Permite que CloudWatch RUM lea los mapas. En la política del bucket, agrega este permiso y reemplaza los valores entre `< >`:

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

3. Genera los `.map` y súbelos bajo la carpeta del release:

   ```sh
   set -a
   . ./.env
   set +a
   npm ci
   npm run build
   aws s3 sync dist/ "s3://${RUM_SOURCEMAP_BUCKET}/${RUM_RELEASE_ID}/" \
     --exclude "*" --include "*.map" --region "$AWS_REGION"
   ```

4. Habilita los mapas para el monitor:

   ```sh
   aws rum update-app-monitor \
     --name "$RUM_APP_MONITOR_NAME" \
     --region "$AWS_REGION" \
     --deobfuscation-configuration \
     "{\"JavaScriptSourceMaps\":{\"Status\":\"ENABLED\",\"S3Uri\":\"s3://${RUM_SOURCEMAP_BUCKET}\"}}"
   ```

   Si ya están habilitados, puedes omitir este paso. Inicia o reconstruye el contenedor con `docker compose up --build`; su configuración RUM recibe el mismo `RUM_RELEASE_ID`.

El SDK usa ese ID para buscar archivos con la estructura `s3://<BUCKET>/<RELEASE_ID>/<archivo>.js.map`. Mantén cada versión de los mapas en su propia carpeta y no sobrescribas mapas de releases anteriores. Consulta la [guía oficial de mapas de CloudWatch RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-JavaScriptStackTraceSourceMaps.html).
