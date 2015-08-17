var Rules = {
  maxTries: 12,
  twoTeamsRequired:     function(teams) {
    var nrOfTeams = teams.length, requiredTeams = 2;
    var isForbidden = (nrOfTeams == requiredTeams);
    return isForbidden;
  },
  fivePlayersRequired:  function(team) {
    var nrOfPlayers = team.players.length;
    var requiredPlayers = 5;
    var isForbidden = (nrOfPlayers == requiredPlayers && team.newPlayerWantsToPlay == true);
    return isForbidden;
  },
  spawnObjective:       function(currentState) {
    return (currentState != "GameEnded");
  },
  meetObjectiveRequirements:  function(currentState) {
    if(currentState == "ObjectiveStarted") {
      var d2Die = Math.floor(Math.random() * 2) + 1;
      var winningTeamIndex = d2Die - 1;
      // return team that met requirement
      //console.log("[meetObjectiveRequirements] state:"+currentState+", winner:"+winningTeamIndex);
      return winningTeamIndex;
    } else {
      // incorrect state
      return -1;
    }
  },

  spRule1:        function(spawnpoints) {
    for(var i=0; i<this.maxTries; i++) {
      if (spawnpoints[spawnY][spawnX]) {
        spawnpoints[spawnY][spawnX] = false;
        return {x: spawnX, y: spawnY}
      }
    }
  },
  spRule2:        function(spawnpoints) {
    for(var i=0; i<this.maxTries; i++) {
      var spawnX = Math.floor(Math.random() * 3);
      var spawnY = Math.floor(Math.random() * 2);
      var oppositeSpawnY = Math.abs(spawnY - 1);
      if(spawnpoints[spawnY][spawnX] && spawnpoints[oppositeSpawnY][spawnX]) {
        spawnpoints[spawnY][spawnX] = false;
        return {x: spawnX, y: spawnY}
      }
    }
  },
  spRule3:        function(spawnY, spawnpoints) {
    var spawnedOnXAxis = 0;
    var msg = "[spRule3] y:"+spawnY;
    for(var x=0; x<spawnpoints[spawnY].length; x++) {
      msg += ", x"+x+":"+spawnpoints[spawnY][x];
      if(spawnpoints[spawnY][x] == "enabled") {
        spawnedOnXAxis++;
      }
    }
    var result = (spawnedOnXAxis == 2);
    //console.clear();
    //console.log(msg + ", spawnedOnXAxis:"+spawnedOnXAxis);
    return result;
},
  spSpecialRule1: function(turnNumber, spawnpoints, previousResult) {
    if(turnNumber == 1) {
      var choice = Math.floor(Math.random() * 3) + 1;
      console.log("[spSpecialRule1] turn:"+turnNumber+", choice:"+choice);
      switch(choice) {
        case 1: // use existing result
          return previousResult;
        case 2: // North Middle
          return {x:1, y:0};
        case 3: // South Middle
          return {x:1, y:1};
      }
    }
    return previousResult;
  },
  spSpecialRule2: function(turnNumber, spawnpoints, previousResult) {
    console.log("[spSpecialRule2] turn:"+turnNumber);
    if(turnNumber == 2) {
      return this.spRule1(spawnpoints);
    }
    return previousResult;
  }
};

function Team() {
  this.unid = "id" + Math.random().toString(16).slice(2);
  this.players = [];
  this.score = 0;
  this.newPlayerWantsToPlay = false;
  this.objective = undefined;
}

Team.prototype = {
  addPlayer: function() {
    this.players.push(new Player());
  },
  addPlayers: function(nrOfPlayers) {
    for(var i=0; i<nrOfPlayers; i++) {
      this.addPlayer();
    }
  },

};

function Player() {}

function Objective (requirementMet) {
  var metValue = requirementMet || false;
  this.requirement = { met: metValue };
  this.completed = false;
}
Objective.prototype = {
}

function Game() {
  console.log("New Game -------------------------------------------");
  this.state = "WaitingForRequiredTeams";
  this.teams = [];
  this.turnNumber = 0;
  this.objectiveRoundNumber = 0;
  this.clearSpawnpoints();
  this.winningTeam = null;

  // unbind all previous event listeners!
  $($(document)).off();
  $($(document)).on("setState", $.proxy(this.handleEventSetState, this));
  $($(document)).on("generateTurn", $.proxy(this.handleEventGenerateTurn, this));

  // click handlers
  $("#addTeam").on("click", $.proxy(function() { this.addTeam(new Team()); }, this));
  $("#addPlayer1").on("click", $.proxy(function() { this.addPlayerToTeam(1); }, this));
  $("#addPlayer2").on("click", $.proxy(function() { this.addPlayerToTeam(2); }, this));
  //$("#spawnObjective").on("click", $.proxy(this.increaseObjectiveRoundNumber, this));
  $("#generateTurn").on("click", function(){ $(document).trigger("generateTurn");} );

}

Game.prototype = {
  states:     [
    "WaitingForRequiredTeams",
    "WaitingForRequiredPlayers",
    "GameStarted",
    "ObjectiveStarted",
    "ObjectiveEnded",
    "GameEnded"
  ],
  interval:         5000, // 5 seconds
  requiredTeams:    2,
  requiredPlayers:  5,
  scoreToWin:       10,

  addTeam: function(newTeam) {
    var rule1failed = Rules.twoTeamsRequired(this.teams);
    var rule2failed = Rules.fivePlayersRequired(newTeam);
    console.log("[addTeam]\truleTwoTeams:"+rule1failed+", ruleFivePlayers:"+rule2failed+", both:"+ (rule1failed || rule2failed));
    if (rule1failed || rule2failed) {
      // do not add team
      console.log("[addTeam]\tYou cannot exceed the Allowed Number of Teams for the Game");
      this.showMessage("You cannot exceed the Allowed Number of Teams for the Game");
    } else {
      $("#alert").hide();
      this.teams.push(newTeam);
      var teamIndex = this.teams.length;
      this.drawTeam(teamIndex);
      if(Rules.twoTeamsRequired(this.teams)) {
        $(document).trigger("setState", "WaitingForRequiredPlayers");
      }
    }
  },

  addPlayerToTeam:  function(teamNumber) {
    console.log("[addPlayerToTeam]\tTeam " + teamNumber);
    if(teamNumber <= this.teams.length) {
      var selectedTeam = this.teams[teamNumber - 1];
      selectedTeam.newPlayerWantsToPlay = true;
      if(Rules.fivePlayersRequired(selectedTeam)) {
        // don't add player
        console.log("[addPlayerToTeam]\tYou cannot exceed the Allowed Number of Players for the Game");
        this.showMessage("You cannot exceed the Allowed Number of Players for the Game");
      } else {
        selectedTeam.addPlayer(new Player());
        $("#alert").hide();
        this.drawPlayer(teamNumber);
        if(Rules.twoTeamsRequired(this.teams)
            && Rules.fivePlayersRequired(this.teams[0])
            && Rules.fivePlayersRequired(this.teams[1])) {
          $("#generateTurn").removeAttr("disabled");
          $(document).trigger("setState", "GameStarted");
        }
      }
    } else {
      console.log("[addPlayerToTeam]\tAdd teams, first");
      this.showMessage("Add teams, first");
    }
  },

  handleEventSetState: function(event, nextState) {
    console.log("[setState]\tstate: " + this.state + ", next: " + nextState + ", objectiveRoundNumber:" + this.objectiveRoundNumber);
    this.state = nextState;


    switch (this.state) {
      case "WaitingForRequiredTeams":
        this.drawState("Waiting for Required Teams");
        break;

      case "WaitingForRequiredPlayers":
        this.drawState("Waiting for Required Players");
        break;

      case "GameStarted":
        this.drawState("Game Started");
        if (this.turnNumber == 0) {
          setTimeout(function() {
            $(document).trigger("generateTurn");
          }, 2000);

        }
        break;

      case "ObjectiveStarted":
        this.drawState("Objective Started");
        this.increaseObjectiveRoundNumber();
        break;

      case "ObjectiveEnded":
        this.drawState("Objective Ended");
        // Scenario: Ten Points meets the Score Requirement
          var winningTeam = (this.teams[0].score == this.scoreToWin)? 1 :
              (this.teams[1].score == this.scoreToWin)? 2 : -1;
          if(winningTeam > -1) {
            this.winningTeam = winningTeam;
            $(document).trigger("setState", "GameEnded");
            return;
          }


        // start countdown
        $("#waitPanel").show();
        var counter = this.interval / 1000;
        var countDownFunction = function() {
          $("#countDown").text(counter);
          if(counter-- == 0) {
            clearInterval(countDownInterval);
            $("#waitPanel").hide();
          }
        }
        countDownFunction();
        var countDownInterval = setInterval(countDownFunction, 1000);

        setTimeout(function () {
          $(document).trigger("generateTurn");
        }, this.interval);
        break;

      case "GameEnded":
        this.drawState("Game Ended");
        this.showMessage("Team "+this.winningTeam+" has won the Game! <br/>" +
          "Restart? <a href='#' class='label label-success' onclick='restartGame()'>yes</a> no");
        break;
    }

  },

  handleEventGenerateTurn: function(event) {
    $("#waitPanel").hide();
    if(this.state == "GameEnded") {
      // don't increase turn number
    } else {
      this.turnNumber++;

      console.log("[generateTurn]\tstate: "+this.state+", turnNumber: "+this.turnNumber);
      switch(this.state) {
        case "GameStarted":
        case "ObjectiveEnded":
          $(document).trigger("setState", "ObjectiveStarted");
          break;
      }
    }
  },

  increaseObjectiveRoundNumber: function() {
    this.objectiveRoundNumber++;

    // Scenario: Reset the Objective Round Number after every 3 Rounds
    if(this.objectiveRoundNumber == 4) {
      this.objectiveRoundNumber = 1;
      this.clearSpawnpoints();
    }
    //console.log("[increaseObjectiveRoundNumber] objectiveRoundNumber:" + this.objectiveRoundNumber);
    if (Rules.spawnObjective(this.state)) {
      this.spawnObjective(window.event);
    }
  },

  clearSpawnpoints: function() {
    this.spawnpoints = [
      [null, null, null],
      [null, null, null]
    ];
    $(".spawn").removeClass("disabled").empty();
  },

  spawnObjective: function() {
    var x, y, oppositeY, maxTries = 12;

    if(this.objectiveRoundNumber == 1) {
      x = Math.floor(Math.random() * 3);
      y = Math.floor(Math.random() * 2);
      oppositeY = Math.abs(y- 1);
      this.spawnpoints[y][x] = "enabled";
      // Spawnpoint Rule 2 (disable for next round)
      this.spawnpoints[oppositeY][x] = "disabled";
      //console.log("turn: "+this.objectiveRoundNumber+", rule0 x:"+x+", y:"+y);
    } else {

  LABEL:
      for(var i=0; i<maxTries; i++) {
        x = Math.floor(Math.random() * 3);
        y = Math.floor(Math.random() * 2);
        oppositeY = Math.abs(y- 1);

        if(this.objectiveRoundNumber > 1) {
          // Scenario: Spawnpoint Rule 1
          if (this.spawnpoints[y][x] == null) {

            // Scenario: Spawnpoint Rule 3
            if(this.objectiveRoundNumber > 2) {
              var twoOnSameAxis = Rules.spRule3(y, this.spawnpoints);
              //console.log("turn: "+this.objectiveRoundNumber+", moreThan2O:"+twoOnSameAxis+", x:"+x+", y:"+y);
              if(twoOnSameAxis) {
                this.spawnpoints[y][x] = "disabled";
                this.spawnpoints[oppositeY][x] = "enabled";
                y = oppositeY;
              } else {
                this.spawnpoints[y][x] = "enabled";
                this.spawnpoints[oppositeY][x] = "disabled";
              }
              break;

            } else {

              // Scenario: Spawnpoint Rule 2
              if(this.spawnpoints[oppositeY][x] == null) {
                this.spawnpoints[y][x] = "enabled";
                this.spawnpoints[oppositeY][x] = "disabled";
                var twoOnSameAxis = Rules.spRule3(y, this.spawnpoints);
                if(twoOnSameAxis) {
                  for(var x2=0; x2<this.spawnpoints[y].length; x2++) {
                    if(this.spawnpoints[y][x2] == null) {
                      this.spawnpoints[y][x2] = "disabled";
                    }
                  }
                }
                //console.log("turn: "+this.objectiveRoundNumber+", rule2 x:"+x+", y:"+y);
                break;
              }
            }
          }
        }
      }
    }

/*
    // Scenario: Spawnpoint Special Rule 1
    result = Rules.spSpecialRule1(this.turnNumber, this.spawnpoints, result);
    // Scenario: Spawnpoint Special Rule 2
    result = Rules.spSpecialRule2(this.turnNumber, this.spawnpoints);
    console.log("[spawnObjective] turn:" + this.turnNumber+", round:" + this.objectiveRoundNumber+", result:",result);
*/


    //console.log("[spawnObjective] round:" + this.objectiveRoundNumber+", result:",result);
    this.drawObjective(y, x);

  },

  completeObjective: function() {
    var newObjective = new Objective(true);
    var scoringTeamIndex = Rules.meetObjectiveRequirements(this.state, newObjective);
    if (scoringTeamIndex > -1) {
      this.teams[scoringTeamIndex].objective = newObjective;
      this.showMessage("Team "+(scoringTeamIndex+1)+" scores!");
      // Scenario: Get Points for Complete Objectives
      this.teams[scoringTeamIndex].score++;
      this.drawScore(scoringTeamIndex);

      setTimeout(function() { $(document).trigger("setState", "ObjectiveEnded"); }, 1000);
    }
    console.log("[completeObjective] teamIndex:"+ scoringTeamIndex);


  },

  drawTeam: function(teamNumber) {
    //console.log("[drawTeam]\t Team number: "+teamNumber);
    $("#players"+teamNumber).removeClass("hide");
    $("#addPlayer"+teamNumber).removeAttr("disabled");
  },

  drawPlayer: function(teamNumber) {
    var imgName = (teamNumber==1)? "minion" : "evil_minion";
    $("#players"+teamNumber+" .panel-body").append("<img src='img/"+imgName+".png'/>");
  },

  drawObjective: function(yParam, xParam) {
    $("#alert").hide();

    //console.log("x:"+xParam+", y:"+yParam);
    var yArray = ["#north ", "#south "];
    var xArray = [".left", ".middle", ".right"];
    for(var y=0; y<this.spawnpoints.length; y++) {
      for(var x=0; x<this.spawnpoints[y].length; x++) {
        $(yArray[y] + xArray[x]).removeClass("disabled");
        if(this.spawnpoints[y][x] != null) {
          $(yArray[y] + xArray[x]).addClass("disabled");
        }
      }
    }

    var objective = $("<img src='img/banana.png' role='button'/>");
    objective.on("click", $.proxy(function() {
      objective.addClass("forbidden");
      objective.removeAttr("role").off("click");
      this.completeObjective(yParam);
    }, this));
    $(yArray[yParam] + xArray[xParam]).append(objective);
  },

  drawScore: function(teamIndex) {
    var selectedTeam = this.teams[teamIndex];
    $("#score"+(teamIndex+1)).text(selectedTeam.score);
  },

  drawState:  function(message) {
    var cssStates = ["default", "info", "primary", "success", "warning", "danger"];
    var stateIndex = $.inArray(this.state, this.states);
    if(stateIndex > -1) {
      var cssClass = "label label-" + cssStates[stateIndex];
      $("#gameState").removeClass().addClass(cssClass);
    }
    $("#gameState").text(message);

  },
  showMessage:  function(message) {
    $("#alert .message").html(message);
    $("#alert").show();
  }
};

function startGame() {
  var game = new Game();
  $(document).trigger("setState", "WaitingForRequiredTeams");
/*
  game.addTeam(new Team());
  game.addTeam(new Team());
  for(var p=1; p<=5; p++) {
    game.addPlayerToTeam(1);
    game.addPlayerToTeam(2);
  }
*/

}

function restartGame() {
  location.reload(true);
}