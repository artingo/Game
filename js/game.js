var Rules = {
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
  startObjectiveRounds: function(currentState, newState) {
    var increaseObectiveRoundNumber = (currentState != "GameEnded" && newState == "ObjectiveStarted");
    return increaseObectiveRoundNumber;
  },
  spawnObjective:       function(currentState) {
    var spawnObjective = (currentState != "GameEnded");
    return spawnObjective;
  },
  meetObjectiveRequirements:  function(currentState) {
    if(currentState == "ObjectiveStarted") {
      var d2Die = Math.floor(Math.random() * 2) + 1;
      var winningTeamIndex = d2Die - 1;
      // return team that met requirement
      return winningTeamIndex;
    } else {
      // incorrect state
      return -1;
    }
  },
  completeObjectives:   function(teams) {
    var objectiveCompleted = false;
    $.each(teams, function(index, team) {
      if(team.objectiveRequirementsMet == true) {
        objectiveCompleted = true;
      }
    });
    return objectiveCompleted;
  }
};

function Team(nrOfPlayers) {
  this.unid = "id" + Math.random().toString(16).slice(2);
  this.players = [];
  this.newPlayerWantsToPlay = false;
  this.objectiveRequirementsMet = false;

  this.addPlayer = function() {
    this.players.push(new Player());
  }

  if(nrOfPlayers) {
    for(var i=0; i<nrOfPlayers; i++) {
      this.addPlayer();
    }
  }
}

function Player() {}

function Game(id) {
  console.log("New Game -------------------------------------------");
  this.state = "WaitingForRequiredTeams";
  this.teams = [];
  this.turnNumber = 0;
  this.objectiveRoundNumber = 0;
  this.interval = 5000; // 5 seconds

  // click handlers
  $("#addTeam").on("click", $.proxy(function() { this.addTeam(new Team()); }, this));
  $("#addPlayer1").on("click", $.proxy(function() { this.addPlayerToTeam(0); }, this));
  $("#addPlayer2").on("click", $.proxy(function() { this.addPlayerToTeam(1); }, this));

  // add custom event handler
  var selector = id? "#"+id : ".game";
  this.handler = $(selector);

  // unbind all previous event listeners!
  this.handler.off();
  this.handler.on("setState", $.proxy(this.handleEventSetState, this));
  this.handler.on("generateTurn", $.proxy(this.handleEventGenerateTurn, this));
}

Game.prototype = {
  states: [
    "WaitingForRequiredTeams",
    "WaitingForRequiredPlayers",
    "GameStarted",
    "ObjectiveStarted",
    "ObjectiveEnded",
    "GameEnded"
  ],

  handleEventSetState: function(event, nextState) {
    if (Rules.startObjectiveRounds(this.state, nextState)) {
      this.objectiveRoundNumber++;
    }
    console.log("[setState]\tstate: " + this.state + ", next: " + nextState + ", objectiveRoundNumber:" + this.objectiveRoundNumber);
    this.state = nextState;

    if (Rules.spawnObjective(this.state)) {
      this.spawnObjective();
    }

    var winningTeamIndex = Rules.meetObjectiveRequirements(this.state);
    if (winningTeamIndex > -1) {
      this.teams[winningTeamIndex].objectiveRequirementsMet = true;
    }

    switch (this.state) {
      case "GameStarted":
        if (this.turnNumber == 0) {
          this.handler.trigger("generateTurn");
        }
        break;
      case "ObjectiveEnded":
        if (jasmine == undefined) {
          setTimeout($.proxy(function () {
            this.handler.trigger("generateTurn");
          }, this), this.interval);
        }
        break;
    }

    if (Rules.completeObjectives(this.teams)) {
      this.state = "ObjectiveEnded";
    }
  },

  handleEventGenerateTurn: function(event) {
    console.log("[generateTurn]\tstate: "+this.state+", turnNumber: "+this.turnNumber);
    if(this.state == "GameEnded") {
      // don't increase turn number
    } else {
      this.turnNumber++;

      switch(this.state) {
        case "GameStarted":
        case "ObjectiveEnded":
          this.handler.trigger("setState", "ObjectiveStarted");
          break;
      }
    }
  },

  addTeam: function(newTeam) {
    var rule1failed = Rules.twoTeamsRequired(this.teams);
    var rule2failed = Rules.fivePlayersRequired(newTeam);
    console.log("[addTeam]\truleTwoTeams:"+rule1failed+", ruleFivePlayers:"+rule2failed+", both:"+ (rule1failed || rule2failed));
    if (rule1failed || rule2failed) {
      // do not add team
      console.log("[addTeam]\tno more teams allowed");
    } else {
      this.teams.push(newTeam);
    }
  },

  spawnObjective: function(spawnPoint) {},

  addPlayerToTeam:  function(teamIndex) {
    console.log("[addPlayerToTeam] Team " + (teamIndex+1));

  },
  drawTeam: function(team) {

  }
};