# BrugOpen Back-end and WebSocket/EventSource server
This NodeJS server holds the 'current' state of all bridges on brugopen.nl. It uses both pull and push to keep the state current.

The PHP application that processes NDW messages uses POST request to notify the Back-end of operation updates. And the Back-end server automatically updates the state by calling a (non-public) API to get the latest state from the database.

Updates about bridges are sent to all connected WebSocket and EventSource listeners.

# Requirements

* NodeJS

# Installing

Download and extract the [latest zip file](https://github.com/BrugOpen/brugopen-server/archive/refs/heads/main.zip) and run npm from the project root folder to install all dependencies:

```
npm install
```

# Configuration

The application accepts the following environment variables:

| name                | description                                                  | default              |
| ------------------- | ------------------------------------------------------------ | -------------------- |
| STATUS_URL          | the API url to fetch the current state from (required)       | (none)               |
| HTTP_PORT           | the port where the HTTP API will listen to                   | 3080                 |
| WEBSOCKET_PORT      | the port where the WebSocket server will listen to           | 3081                 |
| HTTP_EVENTS_PORT    | the port where the EventSource HTTP server will listen on    | 3082                 |

# HTTP API

The HTTP API supports 2 methods: GET and POST.

A POST request should contain a JSON body holding a bridge status:

```json
{
    "type": "operation",
    "id": 5398375,
    "bridge": "eelwerderbrug",
    "start": 1712517473,
    "end": null,
    "certainty": 3,
    "time": 1712517723
}
```

A GET request will return the current state for all bridges:

```json
{
  "lastUpdate": 1712516760,
  "bridges": [
    {
      "name": "aalsmeerderbrug",
      "title": "Aalsmeerderbrug",
      "city": "Aalsmeerderbrug",
      "city2": "Schiphol-Rijk",
      "location": [
        52.2737,
        4.751
      ],
      "lastOperations":[
        {"id":5398275,"start":1712507387,"end":1712507670,"certainty":3,"ended":true},
        {"id":5398259,"start":1712506470,"end":1712506747,"certainty":3,"ended":true},
        {"id":5398218,"start":1712504722,"end":1712505067,"certainty":3,"vesselTypes":["Passagierschip"],"ended":true},
        {"id":5398163,"start":1712502879,"end":1712503183,"certainty":3,"ended":true},
        {"id":5398113,"start":1712501277,"end":1712501550,"certainty":3,"vesselTypes":["Vrachtschip"],"ended":true},
        {"id":5398089,"start":1712500481,"end":1712500709,"certainty":3,"ended":true},
        {"id":5397846,"start":1712493777,"end":1712494051,"certainty":3,"ended":true},
        {"id":5397800,"start":1712492387,"end":1712492688,"certainty":3,"ended":true},
        {"id":5397746,"start":1712491147,"end":1712491411,"certainty":3,"ended":true},
        {"id":5397658,"start":1712489796,"end":1712490092,"certainty":3,"vesselTypes":["Passagierschip"],"ended":true}
      ],
      "lastWeekStats":{"num":81,"avgTime":336,"numMorning":6,"numEvening":3},
	    "nearbyBridges":[
        ["bosrandbrug",5.37],
        ["vrouwenakkerbrug",5.49],
        ["schipholdraaibrug",6.08],
        ["prinses-irenebrug-uithoorn",7.2]
      ]
    },
    {
        "name":"abtswoudsebrug",
        "title":"Abtswoudsebrug",
        "city":"Delft",
        "location":[52.0016,4.3636],
        "...":"..."
    }
  ]
}
```
