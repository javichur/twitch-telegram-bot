# twitch-telegram-bot

Bot de Telegram que avisa cuando el streamer comienza directo en Twitch.

![Twith Telegram Bot diagram](./twitch-telegram-bot.png)

Este código puedes utilizarlo por ejemplo en una función AWS Lambda. En el momento de escribir esto, AWS ofrece 1 millón de ejecuciones gratuitas al mes para funciones AWS Lambda. La función AWS Lambda puedes invocarla a través de una URL usando Amazon API Gateway (también tiene free tier). Se recomienda usar un access token en dicha URL, como en el código de este repo.

## Cómo funciona

1. Twitch invoca a nuestra URL cada vez que sucede el evento al que nos suscribimos, en este caso el evento "streamer 'X' está online". 

Para suscribirnos a estos eventos en Twitch, usamos EventSub: <https://dev.twitch.tv/docs/eventsub>

2. Para crear el bot de telegram, utilizamos los mismos pasos explicados aquí:
<https://javiercampos.es/blog/2020/12/13/como-recibir-avisos-automaticos-por-telegram-email-slack-etc-si-tu-skill-alexa-esta-fallando/>

Usado en el canal Telegram de Patreon de DotCSV <https://www.twitch.tv/dotcsv>.

## Pasos a seguir para crear tu bot

1. Crea una función AWS Lambda desde la consola de AWS: <https://eu-west-1.console.aws.amazon.com/lambda/> . El código fuente de la función, durante el proceso de configuración, será el siguiente. No olvides guardar y pulsar el botón "deploy":

```
exports.handler = async (event) => {
    const response = {
        statusCode: 200,
        body: 'Hola :D',
    };
    return response;
};
```

2. Ahora crea una API con AWS API Gateway, de tipo HTTP, crea una ruta en dicha API y conéctala con la función Lambda anterior (llama a esta ruta por ejemplo: "mi-bot-twitch"). Guarda y pulsa en "Deploy". Obtendrás una URL para tu API. Comprueba con un navegador web que la URL de tu API funciona correctamente: deberá aparecer el texto "Hola :D" si escribes en tu navegador web la url https://URL-API-GATEWAY/mi-bot-twitch

3. Ahora cambiaremos el código de de la función Lambda para responder correctamente a Twitch. Para ello, sustituye el código de la función Lambda por el siguiente, pulsa en "Save" y en "Deploy":

```
exports.handler = async (event) => {
    if (event.body) { // caso especial de verificación de TWITCH. Se usa para la primera invocación, cuando se suscribe.
        let body = JSON.parse(event.body);
        if (body.challenge) {
            const response = {
                statusCode: 200,
                body: body.challenge,
            };
            return response;
        }
    }
};
```

4. Ahora continuaremos con la configuración de Twitch. Crea una app desde la consola de desarrollador de Twitch: <https://dev.twitch.tv/console/apps> . Al crearla, obtendrás un Client ID y un Client Secret.

5. Utiliza el Client ID y Client Secret para obtener un token de sesión para la app. Ejecuta esto en la aplicación Postman (gratis: <https://www.postman.com/downloads/>) para obtener el token:

```
POST https://id.twitch.tv/oauth2/token?client_id=<AQUI EL CLIENT ID DE TU APP>&client_secret=<AQUI EL CLIENT SECRET DE TU APP>&grant_type=client_credentials
```

6. Con el token de sesión de Twitch, ya puedes obtener el ID del usuario que te interesa y suscribirte (gratis) para que Twitch llame a tu API Gateway cuando el usuario empiece un directo. Usaremos Postman para obtener el ID del usuario:

```
GET https://api.twitch.tv/helix/users?login=<username que nos interesa seguir>
---- Headers:
Client-ID:<AQUI EL CLIENT ID DE TU APP>
Authorization:Bearer <AQUI EL TOKEN DE SESIÓN>
```

7. Ahora nos suscribimos a las notificaciones de tipo "streams.online" para dicho usuario. Ejecuta esto en Postman para suscribirte (documentación aquí: <https://dev.twitch.tv/docs/eventsub>):

```
POST https://api.twitch.tv/helix/eventsub/subscriptions
---- Headers:
Client-ID:<AQUI EL CLIENT ID DE TU APP>
Authorization: Bearer <AQUI EL TOKEN DE SESIÓN>
Content-Type: application/json
----
{
    "type": "streams.online",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "<ID del usuario>"
    },
    "transport": {
        "method": "webhook",
        "callback": "<LA URL DE TU API GATEWAY>?token=<MY_LAMBDA_TOKEN>",
        "secret": "s3cRe7"
    }
}
```

donde `MY_LAMBDA_TOKEN` es una cadena alfanumérica aleatoria que deberás generar 1 vez y pegar en el body de la petición anterior y en el código de la función Lambda (ver paso 10).

8. A continuación Twitch llamará internamente a tu API Gateway para comprobar que eres el propietario de esa URL. No te preocupes, en el paso 3) has dejado el código de Lambda listo para que la comprobación esa un éxito :) . En este paso no tienes que hacer nada. Pasados unos segundos, si ejecutas la siguiente petición GET en Postman verás que el "status" es "enabled". Si algo falla en tu código de AWS, entonces dirá que "status" es "pending".

```
GET https://api.twitch.tv/helix/eventsub/subscriptions
---- Headers:
Client-ID:<AQUI EL CLIENT ID DE TU APP>
Authorization: Bearer <AQUI EL TOKEN DE SESIÓN>
Content-Type: application/json
----
```

9. Cuando obtengas "enabled" en el paso previo, entonces ya puedes cambiar el código de tu AWS Lambda por el del repositorio [index.js](./index.js).

10. Edita el código de `index.js` para editar la variable `MY_LAMBDA_TOKEN`.

11. Sigue los pasos para crear un bot en telegram y añade el bot en un grupo de chat (pasos aquí: <https://javiercampos.es/blog/2020/12/13/como-recibir-avisos-automaticos-por-telegram-email-slack-etc-si-tu-skill-alexa-esta-fallando/>). Obtendrás el `TELEGRAM_ACCESS_TOKEN` y `TELEGRAM_ID_CHAT`. Rellena en `index.js` los valores obtenidos para esas 2 variables.

12. Comprueba que has editado las 3 variables de `index.js` según lo explicado antes. Guarda los cambios en la consola de AWS Lambda y pulsa "deploy".

13. ¡Ya está! Cuando el usuario de Twitch empiece un directo, recibirás una notificación en el grupo de Telegram, ya que el bot escribirá un mensaje.

