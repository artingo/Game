describe("Rules Game-Master", function() {
    var game;
    beforeEach(function() {
        game = new Game("game");
    });

    describe("The Game requires two Teams", function () {
        var firstTeam, secondTeam;
        beforeEach(function() {
            firstTeam = new Team();
            game.addTeam(firstTeam);
            secondTeam = new Team();
            game.addTeam(secondTeam);
        });
        it("2 teams", function () {
            expect(game.teams).toContain(firstTeam);
            expect(game.teams).toContain(secondTeam);
        });
        it("3 teams", function () {
            var thirdTeam = new Team();
            game.addTeam(thirdTeam);
            expect(game.teams).not.toContain(thirdTeam);
        });
        it("4 teams", function () {
            var thirdTeam = new Team();
            game.addTeam(thirdTeam);
            var fourthTeam = new Team();
            game.addTeam(fourthTeam);
            expect(game.teams).not.toContain(thirdTeam);
            expect(game.teams).not.toContain(fourthTeam);
        });
    });

    describe("Each Team requires five Players", function () {
        it("4 players", function () {
            game.addTeam(new Team());
            var team = new Team(4);
            team.newPlayerWantsToPlay = true;
            game.addTeam(team);
            expect(game.teams).toContain(team);
        });
        it("- 5 players", function () {
            game.addTeam(new Team());
            var team = new Team(5);
            team.newPlayerWantsToPlay = true;
            game.addTeam(team);
            expect(game.teams).not.toContain(team);
        });
    });

    describe("Start Objective Rounds at the Start of Turns", function () {
        beforeEach(function() {
            game.addTeam(new Team());
            game.addTeam(new Team());
        });

        it("Iterate through game states", function () {
            expect(game.objectiveRoundNumber).toBe(0);
            game.handler.trigger("setState", "WaitingForRequiredTeams");
            expect(game.objectiveRoundNumber).toBe(0);
            game.handler.trigger("setState", "WaitingForRequiredPlayers");
            expect(game.objectiveRoundNumber).toBe(0);
            game.handler.trigger("setState", "GameStarted");
            expect(game.objectiveRoundNumber).toBe(1);
            game.handler.trigger("setState", "ObjectiveStarted");
            expect(game.objectiveRoundNumber).toBe(2);
            game.handler.trigger("setState", "ObjectiveEnded");
            expect(game.objectiveRoundNumber).toBe(2);
            game.handler.trigger("setState", "GameEnded");
            expect(game.objectiveRoundNumber).toBe(2);
        });
        it("from 'GameStarted' ", function () {
            expect(game.objectiveRoundNumber).toBe(0);
            game.handler.trigger("setState", "GameStarted");
            expect(game.objectiveRoundNumber).toBe(1);
        });
        it("from 'ObjectiveStarted' ", function () {
            expect(game.objectiveRoundNumber).toBe(0);
            game.handler.trigger("setState", "ObjectiveStarted");
            expect(game.objectiveRoundNumber).toBe(1);
        });
        it("- from 'GameEnded' ", function () {
            expect(game.objectiveRoundNumber).toBe(0);
            game.handler.trigger("setState", "GameEnded");
            game.handler.trigger("generateTurn");
            expect(game.objectiveRoundNumber).toBe(0);
        });
    });

    describe("Spawn an Objective with each Objective Round", function () {
        beforeEach(function() {
            game.addTeam(new Team());
            game.addTeam(new Team());
            spyOn(game, "spawnObjective");
        });
        it("from 'GameStarted'", function () {
            game.handler.trigger("setState", "GameStarted");
            game.handler.trigger("generateTurn");
            expect(game.spawnObjective).toHaveBeenCalled();
        });
        it("- from 'GameEnded'", function () {
            game.handler.trigger("setState", "GameEnded");
            game.handler.trigger("generateTurn");
            expect(game.spawnObjective).not.toHaveBeenCalled();
        });
    });

    describe("Meet the Objective Requirements for a Round", function () {
        beforeEach(function() {
            game.addTeam(new Team());
            game.addTeam(new Team());
            spyOn(Rules, "meetObjectiveRequirements").and.callThrough();
        });
        it("from 'ObjectiveStarted'", function () {
            game.handler.trigger("setState", "ObjectiveStarted");
            game.handler.trigger("generateTurn");
            var team1hasWon = game.teams[0].objectiveRequirementsMet;
            var team2hasWon = game.teams[1].objectiveRequirementsMet;
            expect(Rules.meetObjectiveRequirements).toHaveBeenCalled();
            expect(team1hasWon || team2hasWon).toBe(true);
        });
        it("- from 'ObjectiveEnded'", function () {
            game.handler.trigger("setState", "ObjectiveEnded");
            var team1scored = game.teams[0].objectiveRequirementsMet;
            var team2scored = game.teams[1].objectiveRequirementsMet;
            expect(Rules.meetObjectiveRequirements).toHaveBeenCalled();
            expect(team1scored && team2scored).toBe(false);
        });
    });

    describe("Complete Objectives for an Objective Round", function () {
        beforeEach(function() {
            game.addTeam(new Team());
            game.addTeam(new Team());
        });
        it("Team 1 scores", function () {
            game.teams[0].objectiveRequirementsMet = true;
            game.handler.trigger("setState", "ObjectiveStarted");
            expect(game.state).toBe("ObjectiveEnded");
        });
        it("Team 2 scores", function () {
            game.teams[1].objectiveRequirementsMet = true;
            game.handler.trigger("setState", "ObjectiveStarted");
            expect(game.state).toBe("ObjectiveEnded");
        });
        it("- No team scores", function () {
            spyOn(Rules, "meetObjectiveRequirements").and.returnValue(-1);
            game.teams[0].objectiveRequirementsMet = false;
            game.teams[1].objectiveRequirementsMet = false;
            game.handler.trigger("setState", "ObjectiveStarted");
            expect(game.state).not.toBe("ObjectiveEnded");
        });
    });
});

