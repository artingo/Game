describe("Turns", function() {
    var game;
    beforeEach(function() {
        game = new Game("game");
        game.addTeam(new Team());
        game.addTeam(new Team());
    });

    describe("Generate a Turn immediately when the Game Starts", function () {
        var spyEvent;
        beforeEach(function() {
            spyEvent = spyOnEvent(document, "generateTurn");
        });
        it("Game starting", function () {
            $(document).trigger("setState", "GameStarted");
            expect(spyEvent).toHaveBeenTriggered();
        });
        it("- Turn Number > 0", function () {
            game.turnNumber = 1;
            $(document).trigger("setState", "GameStarted");
            expect(spyEvent).not.toHaveBeenTriggered();
        });
        it("- Game not started yet", function () {
            $(document).trigger("setState", "WaitingForRequiredPlayers");
            expect(spyEvent).not.toHaveBeenTriggered();
        });
    });
    describe("Do not allow Turns after the Game Ended", function () {
        it("End game & generate turn", function () {
            $(document).trigger("setState", "GameEnded");
            $(document).trigger("generateTurn");
            expect(game.turnNumber).toBe(0);
        });
        it("- Generate turns when game hasn't ended", function () {
            $(document).trigger("setState", "ObjectiveStarted");
            $(document).trigger("generateTurn");
            expect(game.turnNumber).toBe(1);
        });
    });
    describe("A turn at Game Started changes the State to Objective Started", function () {
        it("Trigger game start", function () {
            spyOn(Rules, "meetObjectiveRequirements").and.returnValue(-1);
            $(document).trigger("setState", "GameStarted");
            expect(game.state).toBe("ObjectiveStarted");
        });
        it("- Wait for players", function () {
            $(document).trigger("setState", "WaitingForRequiredPlayers");
            $(document).trigger("generateTurn");
            expect(game.state).not.toBe("ObjectiveStarted");
        });
    });
    describe("Generating a Turn should increase the Turn Number by 1", function () {
        it("Start game", function () {
            expect(game.turnNumber).toBe(0);
            $(document).trigger("setState", "GameStarted");
            expect(game.turnNumber).toBe(1);
        });
        it("Generate turns", function () {
            $(document).trigger("generateTurn");
            expect(game.turnNumber).toBe(1);
            $(document).trigger("generateTurn");
            expect(game.turnNumber).toBe(2);
            $(document).trigger("generateTurn");
            expect(game.turnNumber).toBe(3);
        });
    });
});