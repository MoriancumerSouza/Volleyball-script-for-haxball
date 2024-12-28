/* VARIABLES *
/

/* ROOM */
const roomName = ""; //insert here the Room name
const botName = ""; //insert here the Bot name
const maxPlayers = 12;
const roomPublic = true;
const geo = [{ /*insert here the location*/ }];

const room = HBInit({ roomName: roomName, maxPlayers: maxPlayers, public: roomPublic, playerName: botName, geo: geo[0] });

room.setScoreLimit(0);
room.setTimeLimit(0);

room.getRoomCode = getRoomCode;
function getRoomCode() {
    return room.getConfig('roomCode');
}
const activities = {};

const scoreLimit = 7;
const timeLimit = 0;
room.setTimeLimit(timeLimit);
room.setTeamsLock(false);


/* OPTIONS */

var drawTimeLimit = Infinity;

/* PLAYERS */

const Team = { SPECTATORS: 0, RED: 1, BLUE: 2 };
var State = { PLAY: 0, PAUSE: 1, STOP: 2 };
var gameState = State.STOP;
var endGameVariable = false;
var players = [];
var teamR;
var teamB;
var teamS;
var finishGoal = false;

/* GAME */

var lastPlayersTouched;
var totalTouches;
var goalCheering;
var potentialBugAbusing;
var abusingPosition;
var abusingTimeStamp;
var point = [{ "x": 0, "y": 0 }, { "x": 0, "y": 0 }];
var ballSpeed;
var goldenGoal = false;
var oldX = 0;
var oldY = 0;
var blocked = false;

/* AUXILIARY */

var checkTimeVariable = false;

/* FUNCTIONS */

/* AUXILIARY FUNCTIONS */

function getRandomInt (max) { // return random number from 0 to max-1
    return Math.floor(Math.random() * Math.floor(max));
}

function arrayMin (arr) {
    var len = arr.length;
    var min = Infinity;
    while (len--) {
        if (arr[len] < min) {
            min = arr[len];
        }
    }
    return min;
}

function getTime (scores) {
    return "[" + Math.floor(Math.floor(scores.time / 60) / 10).toString() + Math.floor(Math.floor(scores.time / 60) % 10).toString() + ":" + Math.floor(Math.floor(scores.time - (Math.floor(scores.time / 60) * 60)) / 10).toString() + Math.floor(Math.floor(scores.time - (Math.floor(scores.time / 60) * 60)) % 10).toString() + "]"
}

function pointDistance (p1, p2) {
    var d1 = p1.x - p2.x;
    var d2 = p1.y - p2.y;
    return Math.sqrt(d1 * d1 + d2 * d2);
}
function announce(msg, targetId, color, style, sound) {
	if (color == null) {
		color = 0xFFFD82;
	}
	if (style == null) {
		style = "bold";
	}
	if (sound == null) {
		sound = 0;
	}
	room.sendAnnouncement( "📢: "+msg, targetId, color, style, sound);

}

function whisper(msg, targetId, color, style, sound) {
	if (color == null) {
		color = 0x66C7FF;
	}
	if (style == null) {
		style = "normal";
	}
	if (sound == null) {
		sound = 0;
	}
	room.sendAnnouncement(msg, targetId, color, style, sound);

}

/* GAME FUNCTIONS */

function getPlayerCount (team) {
    var playerCount = 0
    var players = room.getPlayerList();
    for(var i = 0; i < players.length; i++) {
        if (players[i].team == team) {
            playerCount = playerCount + 1;
        }
    }
    return playerCount;
}

function getBallIndex () {
    for (var i = 0; i < room.getDiscCount(); i++) {
        if ((room.getDiscProperties(i).cGroup & room.CollisionFlags.ball) != 0) {
            return i;
        }
    }
    throw "Ball index not found!";
    return -1;
}

function givePenalty (team) {
    room.setDiscProperties(getBallIndex(), {x: team == Team.RED ? -415 : 415, y: 110, xspeed : 0, yspeed : 10});
    return;
}

cMask = room.CollisionFlags.ball | room.CollisionFlags.wall | room.CollisionFlags.red | room.CollisionFlags.blue

/*  var dp = room.getDiscProperties(getBallIndex())
    room.sendChat(String(dp.cMask));
    room.sendChat(String(room.CollisionFlags.ball));
    cMask: room.CollisionFlags.kick */



function endGame(winner) { // no stopGame() function in it
    const scores = room.getScores();
    endGameVariable = true;
	if (winner == Team.RED) {
		announce("🔴 wins " + scores.red + "-" + scores.blue + "!");
	}
	else if (winner == Team.BLUE) {
		announce("🔵 wins " + scores.blue + "-" + scores.red + "!");
	}

}

/* PLAYER FUNCTIONS */


function f(a, b, c) {
for (var i = 0; i < a.length; i += 1) {
	if (a[i][b] === c) { return i; } } return -1;
}

/* STATS FUNCTIONS */

function getStats(ballPosition) {
    point[1] = point[0];
    point[0] = ballPosition;
    ballSpeed = (pointDistance(point[0], point[1]) * 60 * 60 * 60) / 15000;
}

/* EVENTS */

/* PLAYER MOVEMENT */
room.onPlayerJoin = function (player) {
    players = room.getPlayerList();
	room.sendAnnouncement("Welcome " + player.name + "!", player.id, 0xFFC375, "bold");
    if (finishGoal) return;
room.onPlayerLeave = function (player) {
    players = room.getPlayerList();
};

/* PLAYER ACTIVITY */

room.onPlayerChat = function(player, message) {
    activities[player.id] = Date.now();

    if (message.toLowerCase() === "!red") {
        room.sendAnnouncement("🔴 Current winning streak for the red team: " + winstreak + " 🏆", null, 0xdb0404, 'bold');
        return false;
    }

    if (message.toLowerCase() === "!admin") {
        if (!player.admin) {
            room.setPlayerAdmin(player.id, true);
            room.sendAnnouncement("You are now an administrator!", player.id, 0x00FF00, "bold");
        }
        return false;
    }

    return true;
};

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}



/* GAME MANAGEMENT */

room.onGameStart = function (byPlayer) {
    goldenGoal = false;
    endGameVariable = false;
    totalTouches = 0;
    goalCheering = false;
    abusingTimeStamp = 0;
    potentialBugAbusing = false;
    abusingPosition = 0;
    lastPlayersTouched = [null, null];
    lastPlayersTouchedTime = Date.now();
    abusingPlayer = null;

    let playersGaming = room.getPlayerList().filter((p) => p.team > 0);
    playersGaming.forEach((p) => {
        activities[p.id] = Date.now();
    });
}

function setBallColor(color) {
    if (goalCheering) return
    room.setDiscProperties(0, { color: color });
}

var lastBallPosition;
function resetBallColorOnSideChange(ballPosition) {
    if (ballPosition != null) {
        if ((lastBallPosition != null) && ((ballPosition.x > 0 && lastBallPosition.x <= 0) || (ballPosition.x < 0 && lastBallPosition.x >= 0))) {
            setBallColor(0xFFFFFF);
            totalTouches = 0;
        }
        lastBallPosition = ballPosition;
    }
}

room.onPlayerBallKick = function (player) {
    if (goalCheering) {
        return;
    }
    var teamCount = getPlayerCount(player.team);
    if (((lastPlayersTouched[0] != null && lastPlayersTouched[0].id == player.id) && teamCount != 1) && !blocked) {
        announce("❌Foul! " + player.name + " touched the ball twice!");
        givePenalty(player.team);
    }
    blocked = false;
    if (lastPlayersTouched[0] != null && lastPlayersTouched[0].team == player.team && (Date.now() - lastPlayersTouchedTime) > 200) {
        totalTouches += 1;

        console.warn(lastPlayersTouched)
        if (totalTouches == 1 && lastPlayersTouched[0] != null) {
            setBallColor(0xFFFF00);
        } else if (totalTouches == 2) {
            setBallColor(0xFFA500);
        } else if (totalTouches >= 3) {
            setBallColor(0xFF0000);
        }

        if (teamCount != 1) {
            if (totalTouches > 3) {
                announce("❌Foul! More than 3 touches!");
                givePenalty(player.team);
            }
        } else if (totalTouches > 3) {
            announce("❌Foul! " + player.name + " touched the ball 4 times!");
            givePenalty(player.team);
        }
    } else {
        if (lastPlayersTouched[0] != null && player.position.x >= -34 && player.position.x <= 34 && player.position.y <= 66) {
            totalTouches = 0;
            blocked = true;
            announce("🏐 Block made by " + player.name + "!");
            setBallColor(0xFFFFFF);
        } else {
            totalTouches = 1;
            if (lastPlayersTouched[0] != null) {
                setBallColor(0xFFFF00);
            }
        }
    }

    if (lastPlayersTouched[0] == null || player.id != lastPlayersTouched[0].id) {
        lastPlayersTouched[1] = lastPlayersTouched[0];
        lastPlayersTouched[0] = player;
    }

    lastPlayersTouchedTime = Date.now();
};

room.onTeamGoal = function (team) {
    setBallColor(0xFFFFFF);
    goalCheering = true
    const scores = room.getScores();
    if (lastPlayersTouched[0] != null && lastPlayersTouched[0].team == team) {
        if (lastPlayersTouched[1] != null && lastPlayersTouched[1].team == team) {
           announce("🏐 " + getTime(scores) + " Point for " + (team == Team.RED ? "🔴" : "🔵") + "!");
        }
        else {
            announce("🏐 " + getTime(scores) + " Point for " + (team == Team.RED ? "🔴" : "🔵"));
        }
    }
    else {
        announce("🏐 " + getTime(scores) + " Point for " + (team == Team.RED ? "🔴" : "🔵"));
    }
    if ((scores.red >= scoreLimit && scores.red - scores.blue >= 2) ||
    (scores.blue >= scoreLimit && scores.blue - scores.red >= 2) ||
    goldenGoal) {
        endGame(team);
        goldenGoal = false;
        setTimeout(() => {
            room.onTeamVictory(scores);
        }, 1000);
    }
}

var winningTeam = null;
var winstreak = 0;
var goldenGoal = false;
room.onTeamVictory = function (scores) {
    if (scores.red > scores.blue) {
        winningTeam = Team.RED;
        winstreak = 1;

        room.sendAnnouncement("🔴 The red team has won! " + scores.red + "-" + scores.blue + "! Winning streak: " + winstreak + " 🏆", null, 0xdb0404, 'bold');
    } else if (scores.red < scores.blue) {
        winningTeam = Team.BLUE;
        winstreak = 1;

        room.sendAnnouncement("🔵 The blue team has won! " + scores.blue + "-" + scores.red + "! Winning streak: " + winstreak + " 🏆", null, 0x0632c4, 'bold');
    } else {
        winningTeam = null;
        winstreak = 0;

        room.sendAnnouncement("⚪ Draw! " + scores.blue + "-" + scores.red + "!", null, 0xffffff, 'bold');
    }
    goldenGoal = false;

    endGameVariable = true;
    room.stopGame();
}
room.onPositionsReset = function () {
    goalCheering = false;
    lastPlayersTouched = [null, null];
    for(var i=0; i<players.length; i++){
	    activities[players[i].id] = Date.now();
    }
}

/* MISCELLANEOUS */

room.onRoomLink = function (url) {
}
room.onGameTick = function () {
    let ballPosition = room.getBallPosition();
    resetBallColorOnSideChange(ballPosition);
    oldX = ballPosition.x;
    oldY = ballPosition.y;

    getStats(ballPosition);
        }
    }

var volleyMap =
{
// Insert the map .hbs content here without {} as it is already included in the line above and below
};
room.setCustomStadium(JSON.stringify(volleyMap));