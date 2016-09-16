# Communication Protocol

Here we describe the various states that both the game and the web client move through throughout
the game. After this, we define the protocol that the two components will use to communicate with
one another. We need to be able to handle player connections, sending commands from the client to
the game, and sending information updates from the game to the client.

Communication will be transactional. Every time a message is sent, the receiver will either respond
with additional information, or with a simple "acknowledged" message.

## Game States

* Initialize pubhub and other things. Wait for players to connect.
* When a player request to join a game, look for an available player number (1 or 2). Send them
  this player number, and mark it as used. If there are no player numbers, send a "game is full"
  message. Joining as a new player will automatically set this as "ready".
* Once we have two players, initialize the game and send out a "game start" message to the two
  connected players. This message should include the color that the player will be using.
* Every turn, to the player whose turn it is, we will send a "request move" message. Once they send
  a move message, we will repond with a "move received" message, and update the game state as
  necessary.
* The player will send wither "left" or "right" commands, until finally they send a "drop" command.
  "left" and "right" commands will move the cursor around - a "drop" command will lock in their
  move. We'll process the move, then let the other player know it is their turn.
* At any point, a player can send a "leave game" message, which will automatically end the game.
  We will send a "game over" message with the reason being that one player left. At this point we
  will wait for players once more.
* When the game is finished, we will send out a "game over" message, letting the players know who
  won the game. At this point, both players are "not ready" to start again. The server will wait
  for each player to send a "ready" message before starting another game.


## Controller States

* Initialize all variables and wait to connect to the server.
* Send a request to the server to join the game. We will either get assigned a player number, or we
  will get a "game is full" message.
* If we got assigned a player number, update the internal state and wait for the server to say that
  the game has started.
* When the game starts, we will be assigned a color. Update things accordingly and wait for it to
  be our turn.
* When a move is requested, we will make the move buttons active. The buttons will be capable of
  sending "left", "right", and "drop" commands.
* Once we send a "drop" command, we will disable the move buttons and let the player know that it
  is the other player's turn.
* At any time, we may get a message from the server that the game is over, either from one player
  winning, or from the other player leaving the game. Update the UI accordingly.

## Messages

JSON will be used to send messages back and forth. Once a player has received their player number,
they will use a player-specific channel to communicate with the server.

Channels:
* ledgame_server
* ledgame_player
* ledgame_player1
* ledgame_player2
* ledgame_server_player1
* ledgame_server_player2

Joining a game:
```
ledgame_player: { msg: REQUEST_JOIN }
ledgame_server: { msg: JOIN_SUCCESS, player: 1 }

ledgame_player: { msg: REQUEST_JOIN }
ledgame_server: { msg: JOIN_FAIL }
```

After this transaction takes place, the player/server will use player-specific channels to
communicate.

Sending a "player ready" message:
```
ledgame_player1: { msg: PLAYER_READY }
ledgame_server1: { msg: ACK }
```

Starting the game:
```
ledgame_server1: { msg: START_GAME, color: red }
ledgame_player1: { msg: ACK }

ledgame_server1: { msg: START_GAME, color: green }
ledgame_player1: { msg: ACK }
```

Selecting a player for a turn:
```
ledgame_server1: { msg: REQUEST_TURN }
ledgame_player1: { msg: ACK }

ledgame_server2: { msg: WAIT_YOUR_TURN }
ledgame_player2: { msg: ACK }
```

Sending commands to the server when it is your turn:
```
ledgame_player1: { msg: MOVE_CUR_LEFT }
ledgame_server1: { msg: ACK }

ledgame_player1: { msg: MOVE_CUR_RIGHT }
ledgame_server1: { msg: ACK }

ledgame_player1: { msg: DROP }
ledgame_server1: { msg: ACK }
```

Once a DROP message has been sent, a player's term ends. After the drop has been processed, the
server will either request the other player's turn, or send out "game over" messages to each player
if the game has been one.

Game Over message:
```
ledgame_server1: { msg: GAME_OVER, reason: WIN }
ledgame_player1: { msg: ACK }

ledgame_server1: { msg: GAME_OVER, reason: LOSE }
ledgame_player1: { msg: ACK }

ledgame_server1: { msg: GAME_OVER, reason: PLAYER_LEFT }
ledgame_player1: { msg: ACK }
```

A player can leave the game at any time:
```
ledgame_player1: { msg: LEAVE_GAME }
ledgame_server1: { msg: ACK }
```
