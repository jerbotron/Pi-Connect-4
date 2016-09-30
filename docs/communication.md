# Communication Protocol

Here we describe the various states that both the game and the web client move through throughout
the game. After this, we define the protocol that the two components will use to communicate with
one another. We need to be able to handle player connections, sending commands from the client to
the game, and sending information updates from the game to the client.

Communication will be transactional. Every time a message is sent, the receiver will either respond
with additional information, or with a simple "acknowledged" message.

## Game States

* Initialize pubhub and other things. Wait for players to connect.
* When a player request to join a game, look for an available player color (RED or YELLOW). Send them
  a player color, and mark it as used. If there are no player colors available, send a "game is full"
  message.
* Once we have two players, initialize the game and send out a "game start" message to the two
  connected players.
* Every turn, to the player whose turn it is, we will send a "your turn" message. Once they send
  a move message, we will repond with a "move received" message, and update the other player on the
  new game board state.
* At any point, a player can send a "leave game" message, which will automatically end the game.
  We will send a "game over" message with the reason being that one player left. At this point we
  will wait for players once more.
* When the game is finished, we will send out a "game over" message, letting the players know who
  won the game. At this point, both players are "not ready" to start again. The server will wait
  for each player to send a "ready" message before starting another game.


## Controller States

* Initialize all variables and wait to connect to the server.
* Send a request to the server to join the game. We will either get assigned a player color, or we
  will get a "game is full" message.
* If we got assigned a player color, update the internal state and wait for the server to say that
  the game has started.
* When the game starts, update game messages accordingly and wait for it to be our turn.
* When it's our turn, we will be able to hover over the columns and click to drop a piece. Send the 
  coordinates of our dropped piece to the server and update game board and disable hovering/drop.
* At any time, we may get a message from the server that the game is over, either from one player
  winning, or from the other player leaving the game. Update the UI accordingly.

## Messages

JSON will be used to send messages back and forth. Once a player has received their player number,
they will use a player-specific channel to communicate with the server.

Channels:
* CHNL.LOBBY
* CHNL.GAME

Joining a game:
```
CHNL.LOBBY: { msg: REQUEST_JOIN, uuid: playerId }
CHNL.LOBBY: { msg: JOIN_SUCCESS, playerColor: 'red' }

CHNL.LOBBY: { msg: REQUEST_JOIN, uuid: playerId }
CHNL.LOBBY: { msg: JOIN_FAIL }
```

After this transaction takes place, the player/server will use game channel to
communicate.

Starting the game:
```
CHNL.GAME: { msg: START_GAME, playerTurn: playerId }
CHNL.GAME: { msg: ACK }
```

Once a DROP message has been sent, a player's turn ends. After the drop has been processed, the
server will either request the other player's turn, or send out "game over" messages to each player
if the game has been one.

Game Over message:
```
CHNL.GAME: { msg: GAME_OVER, reason: WIN }
CHNL.GAME: { msg: ACK }

CHNL.GAME: { msg: GAME_OVER, reason: LOSE }
CHNL.GAME: { msg: ACK }

CHNL.GAME: { msg: GAME_OVER, reason: PLAYER_LEFT }
CHNL.GAME: { msg: ACK }
```

A player can leave the game at any time:
```
CHNL.GAME: { msg: LEAVE_GAME }
CHNL.GAME: { msg: ACK }
```
