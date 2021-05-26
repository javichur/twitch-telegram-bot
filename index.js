/* Instrucciones para configuración inicial (hacer solo 1 vez).
- Falta cambiar el ID del grupo de CHAT de Telegram (variable TELEGRAM_ID_CHAT), que no se conoce hasta que no se añade el bot dicho canal de chat. Este bot solo funciona con un solo grupo de chat de Telegram.
- Configurar también TELEGRAM_ACCESS_TOKEN.
- MY_LAMBDA_TOKEN se utiliza para autorizar la invocación de la función AWS Lambda desde Twitch, a través de Amazon API Gateway.

Twitch invoca a nuestra URL cada vez que sucede el evento al que nos suscribimos, en este caso el evento "streamer 'X' está online". Para suscribirnos a estos eventos usamos EventSub: <https://dev.twitch.tv/docs/eventsub>

*/

// Telegram params
const TELEGRAM_ACCESS_TOKEN = 'xxxxxxxxxx'; // used for API https://api.telegram.org/bot<token>/
const TELEGRAM_ID_CHAT = 'xxxxxxxxxx'; // Use this API yo get this ID chat: GET https://api.telegram.org/bot<token>/getUpdates

const eventText = 'Online en Twitch :) https://www.twitch.tv/xxxxxxxxxx';

const AWS = require('aws-sdk');
const Https = require('https');
const Url = require('url');

const MY_LAMBDA_TOKEN = 'xxxxxxxxxx';

exports.handler = async (event) => {
  /*
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
  */
  
  if (event.queryStringParameters && event.queryStringParameters.token && event.queryStringParameters.token == MY_LAMBDA_TOKEN) {
    await sendTelegram(eventText);

    const response = {
      statusCode: 200,
      body: JSON.stringify(`Notification processed.`),
    };
    return response;
  } else {
    const response = {
      statusCode: 404,
      body: JSON.stringify(`Error not found.`),
    };
    return response;
  }
};


async function sendTelegram(eventText) {
  const urlTelegram = `https://api.telegram.org/bot${TELEGRAM_ACCESS_TOKEN}/sendMessage?chat_id=${TELEGRAM_ID_CHAT}&text=${eventText}`;
  return httpsGeneric(urlTelegram, 'GET', null, null).then((ret) => {
    return ret;
  }).catch(() => {
    return null;
  });
}

function httpsGeneric(urlApi, method, headers, data) {
  const parsedUrl = Url.parse(urlApi);

  return new Promise(((resolve, reject) => {
    const options = {
      host: parsedUrl.hostname,
      path: parsedUrl.path,
      method,
    };

    if (headers) {
      options.headers = headers;
    }

    if (method === 'POST') {
      if (!options.headers) options.headers = {};
      options.headers['Content-Length'] = data.length;
    }

    const request = Https.request(options, (response) => {
      let returnData = '';

      response.on('data', (chunk) => {
        returnData += chunk;
      });

      response.on('end', () => {
        resolve(returnData);
      });

      response.on('error', (error) => {
        console.log(`error httpsGeneric: ${error}`);
        reject(error);
      });
    });

    if (data) {
      request.write(data);
    }

    request.end();
  }));
}