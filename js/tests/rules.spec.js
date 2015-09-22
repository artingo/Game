describe("Rules Game-Master", function() {
    var game, turnTimer = 2050, objectiveTimer = 1050;
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
            var team = new Team();
            team.addPlayers(4);
            team.newPlayerWantsToPlay = true;
            game.addTeam(team);
            expect(game.teams).toContain(team);
        });
        it("- 5 players", function () {
            game.addTeam(new Team());
            var team = new Team();
            team.addPlayers(5);
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

        it("Iterate through game states", function (done) {
            expect(game.objectiveRoundNumber).toBe(0);
            $(document).trigger("setState", "WaitingForRequiredTeams");
            expect(game.objectiveRoundNumber).toBe(0);
            $(document).trigger("setState", "WaitingForRequiredPlayers");
            expect(game.objectiveRoundNumber).toBe(0);
            $(document).trigger("setState", "GameStarted");
            setTimeout(function() {
                expect(game.objectiveRoundNumber).toBe(1);
                done();
            }, turnTimer);
            $(document).trigger("setState", "ObjectiveStarted");
            expect(game.objectiveRoundNumber).toBe(1);
            $(document).trigger("setState", "ObjectiveEnded");
            expect(game.objectiveRoundNumber).toBe(1);
            $(document).trigger("setState", "GameEnded");
            expect(game.objectiveRoundNumber).toBe(1);
        });
        it("from 'GameStarted' ", function (done) {
            expect(game.objectiveRoundNumber).toBe(0);
            $(document).trigger("setState", "GameStarted");
            setTimeout(function() {
                expect(game.objectiveRoundNumber).toBe(1);
                done();
            }, turnTimer);
        });
        it("from 'ObjectiveStarted' ", function () {
            expect(game.objectiveRoundNumber).toBe(0);
            $(document).trigger("setState", "ObjectiveStarted");
            expect(game.objectiveRoundNumber).toBe(1);
        });
        it("- from 'GameEnded' ", function () {
            expect(game.objectiveRoundNumber).toBe(0);
            $(document).trigger("setState", "GameEnded");
            $(document).trigger("generateTurn");
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
            $(document).trigger("setState", "GameStarted");
            $(document).trigger("generateTurn");
            expect(game.spawnObjective).toHaveBeenCalled();
        });
        it("- from 'GameEnded'", function () {
            $(document).trigger("setState", "GameEnded");
            $(document).trigger("generateTurn");
            expect(game.spawnObjective).not.toHaveBeenCalled();
        });
    });

    describe("Meet the Objective Requirements for a Round", function () {
        var firstTeam, secondTeam;
        beforeEach(function() {
            firstTeam = new Team();
            game.addTeam(firstTeam);
            secondTeam = new Team();
            game.addTeam(secondTeam);
            spyOn(Rules, "meetObjectiveRequirements").and.callThrough();
            spyOn(game, "spawnObjective").and.callThrough();
        });
        it("from 'ObjectiveStarted'", function () {
            $(document).trigger("setState", "ObjectiveStarted");
            game.completeObjective();
            var team1scored = firstTeam.objective && firstTeam.objective.requirement.met;
            var team2scored = secondTeam.objective && secondTeam.objective.requirement.met;
            expect(game.spawnObjective).toHaveBeenCalled();
            expect(Rules.meetObjectiveRequirements).toHaveBeenCalled();
            expect(team1scored || team2scored).toBe(true);
        });
        it("- from 'ObjectiveEnded'", function () {
            $(document).trigger("setState", "ObjectiveEnded");
            var team1scored = firstTeam.objective;
            var team2scored = secondTeam.objective;
            expect(game.spawnObjective).not.toHaveBeenCalled();
            expect(team1scored && team2scored).toBe(undefined);
        });
    });

    describe("Complete Objectives for an Objective Round", function () {
        var firstTeam, secondTeam;
        beforeEach(function() {
            firstTeam = new Team();
            game.addTeam(firstTeam);
            secondTeam = new Team();
            game.addTeam(secondTeam);
            $(document).trigger("setState", "ObjectiveStarted");
        });

        it("Team 1 scores", function (done) {
            game.completeObjective(new Objective(true));
            setTimeout(function() {
                expect(game.state).toBe("ObjectiveEnded");
                done();
            }, objectiveTimer);
        });
        it("Team 2 scores", function (done) {
            game.completeObjective(new Objective(true));
            setTimeout(function() {
                expect(game.state).toBe("ObjectiveEnded");
                done();
            }, objectiveTimer);
        });
        it("- No team scores", function (done) {
            game.completeObjective(new Objective(false));
            game.completeObjective(new Objective(false));
            setTimeout(function() {
                expect(game.state).toBe("ObjectiveEnded");
                done();
            }, objectiveTimer);
        });
    });
});

