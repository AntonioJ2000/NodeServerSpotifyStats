var
  cors = require('cors'),
  http = require('http'),
  express = require('express'),
  dotenv = require('dotenv').config({path:".env"}),
  bodyParser = require('body-parser'),
  request = require('request'),
  CryptoJS = require('crypto-js');

var app = express();

const API_URL = "https://accounts.spotify.com/api/token";
const CLIENT_ID = "6c3f918a4ab240db97b1c104475c8ea6";
const CLIENT_SECRET = "5447cf73ef4e46a196c2fdb21d72562b";
const CLIENT_CALLBACK_URL = "spotifystats://callback";
const ENCRYPTION_SECRET = "sstats-key";
 
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cors({
  origin: true,
  credentials: true
}));

const spotifyRequest = params => {
    return new Promise((resolve, reject) => {
        request.post(API_URL, {
          form: params,
          headers: {
            'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
          },
          json: true
        }, (err, resp) => err ? reject(err) : resolve(resp));
      })
      .then(resp => {
        if (resp.statusCode != 200) {
          return Promise.reject({
            statusCode: resp.statusCode,
            body: resp.body
          });
        }
        return Promise.resolve(resp.body);
      })
      .catch(err => {
        return Promise.reject({
          statusCode: 500,
          body: JSON.stringify({})
        });
      });
  };

  app.post('/exchange', (req, res) => {
 
    const params = req.body;
    if (!params.code) {
      return res.json({
        "error": "Parameter missing"
      });
    }
   
    spotifyRequest({
        grant_type: "authorization_code",
        redirect_uri: CLIENT_CALLBACK_URL,
        code: params.code
      })
      .then(session => {
        let result = {
          "access_token": session.access_token,
          "expires_in": session.expires_in,
          "refresh_token": encrypt(session.refresh_token)
        }
          return res.send(result);
      })
      .catch(response => {
        return res.json();
      });
  });
   
  // Get a new access token from a refresh token
  app.post('/refresh', (req, res) => {
    const params = req.body;
    if (!params.refresh_token) {
      return res.json({
        "error": "Parameter missing"
      });
    }
   
    spotifyRequest({
        grant_type: "refresh_token",
        refresh_token: decrypt(params.refresh_token)
      })
      .then(session => {
        return res.send({
            "access_token": session.access_token,
            "expires_in": session.expires_in
        });
      })
      .catch(response => {
        return res.json(response);
      });
  });

  // Helper functions
function encrypt(text) {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_SECRET).toString();
  };
   
  function decrypt(text) {
    var bytes = CryptoJS.AES.decrypt(text, ENCRYPTION_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  };
   
  // Start the server
  var server = http.createServer(app);
   
  server.listen(process.env.PORT || 5000, function (err) {
    console.info('listening in http://localhost:8080');
  });